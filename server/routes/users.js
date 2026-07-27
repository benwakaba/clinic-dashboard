import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Lightweight roster (id/name/role only) used to populate therapist pickers.
router.get('/', async (req, res) => {
  const role = req.query.role || null;
  const { rows } = await pool.query(
    `SELECT id, name, role FROM users WHERE ($1::text IS NULL OR role = $1) ORDER BY name ASC`,
    [role]
  );
  res.json({ users: rows });
});

export default router;
