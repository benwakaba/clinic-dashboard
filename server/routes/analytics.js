import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/summary', async (req, res) => {
  const [conversion, completion, avgSessions, byTherapist, dailyVolume] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'lead')::float AS converted,
        COUNT(*)::float AS total
      FROM patients
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::float AS completed,
        COUNT(*)::float AS resolved
      FROM appointments
      WHERE start_time < now()
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE a.status = 'completed')::float AS completed_sessions,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status != 'lead')::float AS patient_count
      FROM patients p
      LEFT JOIN appointments a ON a.patient_id = p.id
    `),
    pool.query(`
      SELECT
        u.id, u.name,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_patients,
        COUNT(a.id) FILTER (WHERE a.start_time::date = CURRENT_DATE) AS todays_appointments
      FROM users u
      LEFT JOIN patients p ON p.assigned_therapist_id = u.id
      LEFT JOIN appointments a ON a.therapist_id = u.id
      WHERE u.role = 'therapist'
      GROUP BY u.id, u.name
      ORDER BY u.name
    `),
    pool.query(`
      SELECT
        d::date AS date,
        COUNT(a.id) FILTER (WHERE a.status = 'completed') AS completed,
        COUNT(a.id) FILTER (WHERE a.status = 'cancelled') AS cancelled,
        COUNT(a.id) FILTER (WHERE a.status = 'no_show') AS no_show,
        COUNT(a.id) FILTER (WHERE a.status = 'scheduled') AS scheduled
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS d
      LEFT JOIN appointments a ON a.start_time::date = d::date
      GROUP BY d
      ORDER BY d
    `),
  ]);

  const c = conversion.rows[0];
  const comp = completion.rows[0];
  const avg = avgSessions.rows[0];

  res.json({
    patientConversionRate: c.total > 0 ? Math.round((c.converted / c.total) * 1000) / 10 : 0,
    appointmentCompletionRate: comp.resolved > 0 ? Math.round((comp.completed / comp.resolved) * 1000) / 10 : 0,
    avgSessionsPerPatient: avg.patient_count > 0 ? Math.round((avg.completed_sessions / avg.patient_count) * 10) / 10 : 0,
    byTherapist: byTherapist.rows,
    dailyVolume: dailyVolume.rows,
  });
});

export default router;
