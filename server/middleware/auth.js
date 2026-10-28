import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Any write that references a patient by id from the request body must call this.
// Forcing therapist_id to the caller isn't enough: without this check a therapist
// could attach another therapist's patient to their own appointment or task, and
// the list queries would then show them that patient's name.
export async function assertPatientAccess(user, patientId) {
  const { rows } = await pool.query('SELECT assigned_therapist_id FROM patients WHERE id = $1', [patientId]);
  const patient = rows[0];
  if (!patient) throw httpError(404, 'Patient not found');
  if (user.role === 'therapist' && patient.assigned_therapist_id !== user.id) {
    throw httpError(403, 'Insufficient permissions');
  }
}
