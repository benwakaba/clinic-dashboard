import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function scopeToTherapist(req) {
  return req.user.role === 'therapist' ? req.user.id : null;
}

router.get('/', async (req, res) => {
  const therapistId = scopeToTherapist(req) ?? req.query.therapist_id ?? null;
  const status = req.query.status || null;

  const { rows } = await pool.query(
    `SELECT p.*, u.name AS therapist_name
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_therapist_id
     WHERE ($1::int IS NULL OR p.assigned_therapist_id = $1)
       AND ($2::text IS NULL OR p.status = $2)
     ORDER BY p.created_at DESC`,
    [therapistId, status]
  );
  res.json({ patients: rows });
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS therapist_name
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_therapist_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  const patient = rows[0];
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (req.user.role === 'therapist' && patient.assigned_therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  res.json({ patient });
});

router.post('/', async (req, res) => {
  const { name, email, phone, insurance_provider, insurance_id, condition, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Patient name is required' });

  let assignedTherapistId = req.body.assigned_therapist_id ?? null;
  if (req.user.role === 'therapist') {
    assignedTherapistId = req.user.id;
  }

  const { rows } = await pool.query(
    `INSERT INTO patients (name, email, phone, insurance_provider, insurance_id, condition, status, assigned_therapist_id)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'lead'), $8)
     RETURNING *`,
    [name, email, phone, insurance_provider, insurance_id, condition, status, assignedTherapistId]
  );
  res.status(201).json({ patient: rows[0] });
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Patient not found' });
  if (req.user.role === 'therapist' && existing.assigned_therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const {
    name = existing.name,
    email = existing.email,
    phone = existing.phone,
    insurance_provider = existing.insurance_provider,
    insurance_id = existing.insurance_id,
    condition = existing.condition,
    status = existing.status,
  } = req.body;

  const assignedTherapistId =
    req.user.role === 'admin' && req.body.assigned_therapist_id !== undefined
      ? req.body.assigned_therapist_id
      : existing.assigned_therapist_id;

  const { rows } = await pool.query(
    `UPDATE patients
     SET name = $1, email = $2, phone = $3, insurance_provider = $4, insurance_id = $5,
         condition = $6, status = $7, assigned_therapist_id = $8
     WHERE id = $9
     RETURNING *`,
    [name, email, phone, insurance_provider, insurance_id, condition, status, assignedTherapistId, req.params.id]
  );
  res.json({ patient: rows[0] });
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
