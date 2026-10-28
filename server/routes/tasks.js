import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, assertPatientAccess } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const therapistId = req.user.role === 'therapist' ? req.user.id : req.query.therapist_id || null;
  const date = req.query.date || null;

  const { rows } = await pool.query(
    `SELECT t.*, p.name AS patient_name, u.name AS therapist_name
     FROM tasks t
     LEFT JOIN patients p ON p.id = t.patient_id
     JOIN users u ON u.id = t.therapist_id
     WHERE ($1::int IS NULL OR t.therapist_id = $1)
       AND ($2::date IS NULL OR t.due_date = $2)
     ORDER BY t.completed ASC, t.due_date ASC, t.created_at ASC`,
    [therapistId, date]
  );
  res.json({ tasks: rows });
});

router.post('/', async (req, res) => {
  const { description, patient_id, due_date } = req.body;
  const therapist_id = req.user.role === 'therapist' ? req.user.id : req.body.therapist_id;

  if (!description || !therapist_id) {
    return res.status(400).json({ error: 'description and therapist_id are required' });
  }
  if (patient_id) await assertPatientAccess(req.user, patient_id);

  const { rows } = await pool.query(
    `INSERT INTO tasks (therapist_id, patient_id, description, due_date)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE))
     RETURNING *`,
    [therapist_id, patient_id || null, description, due_date || null]
  );
  res.status(201).json({ task: rows[0] });
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'therapist' && existing.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const {
    description = existing.description,
    due_date = existing.due_date,
    completed = existing.completed,
  } = req.body;

  const { rows } = await pool.query(
    `UPDATE tasks SET description = $1, due_date = $2, completed = $3 WHERE id = $4 RETURNING *`,
    [description, due_date, completed, req.params.id]
  );
  res.json({ task: rows[0] });
});

router.delete('/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'therapist' && existing.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default router;
