import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, assertPatientAccess } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// SQLSTATE raised by the appointments_no_double_booking exclusion constraint (schema.sql).
const EXCLUSION_VIOLATION = '23P01';
const DOUBLE_BOOKED = 'That therapist already has an appointment overlapping this time';

function scopeToTherapist(req) {
  return req.user.role === 'therapist' ? req.user.id : null;
}

router.get('/', async (req, res) => {
  const therapistId = scopeToTherapist(req) ?? req.query.therapist_id ?? null;
  const { start, end } = req.query;

  const { rows } = await pool.query(
    `SELECT a.*, p.name AS patient_name, u.name AS therapist_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN users u ON u.id = a.therapist_id
     WHERE ($1::int IS NULL OR a.therapist_id = $1)
       AND ($2::timestamptz IS NULL OR a.start_time >= $2)
       AND ($3::timestamptz IS NULL OR a.start_time < $3)
     ORDER BY a.start_time ASC`,
    [therapistId, start || null, end || null]
  );
  res.json({ appointments: rows });
});

router.post('/', async (req, res) => {
  const { patient_id, start_time, end_time, notes } = req.body;
  const therapist_id = req.user.role === 'therapist' ? req.user.id : req.body.therapist_id;

  if (!patient_id || !therapist_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'patient_id, therapist_id, start_time, and end_time are required' });
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }
  await assertPatientAccess(req.user, patient_id);

  try {
    const { rows } = await pool.query(
      `INSERT INTO appointments (patient_id, therapist_id, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patient_id, therapist_id, start_time, end_time, notes || null]
    );
    res.status(201).json({ appointment: rows[0] });
  } catch (err) {
    if (err.code === EXCLUSION_VIOLATION) return res.status(409).json({ error: DOUBLE_BOOKED });
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (req.user.role === 'therapist' && existing.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const {
    start_time = existing.start_time,
    end_time = existing.end_time,
    status = existing.status,
    notes = existing.notes,
  } = req.body;

  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE appointments
       SET start_time = $1, end_time = $2, status = $3, notes = $4
       WHERE id = $5
       RETURNING *`,
      [start_time, end_time, status, notes, req.params.id]
    );
    res.json({ appointment: rows[0] });
  } catch (err) {
    if (err.code === EXCLUSION_VIOLATION) return res.status(409).json({ error: DOUBLE_BOOKED });
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (req.user.role === 'therapist' && existing.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
