import bcrypt from 'bcryptjs';
import pool from './pool.js';

function daysFromNow(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'TRUNCATE TABLE tasks, appointments, patients, users RESTART IDENTITY CASCADE'
    );

    const passwordHash = await bcrypt.hash('password123', 10);

    const { rows: users } = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES
        ('Alex Morgan', 'admin@clinic.dev', $1, 'admin'),
        ('Jordan Reyes', 'jordan@clinic.dev', $1, 'therapist'),
        ('Sam Patel', 'sam@clinic.dev', $1, 'therapist')
       RETURNING id, name, role`,
      [passwordHash]
    );

    const jordan = users.find((u) => u.name === 'Jordan Reyes').id;
    const sam = users.find((u) => u.name === 'Sam Patel').id;

    const { rows: patients } = await client.query(
      `INSERT INTO patients (name, email, phone, insurance_provider, insurance_id, condition, status, assigned_therapist_id) VALUES
        ('Maria Chen', 'maria.chen@example.com', '555-0101', 'Blue Cross', 'BC-88213', 'Lower back strain', 'active', $1),
        ('David Okafor', 'david.okafor@example.com', '555-0102', 'Aetna', 'AE-44120', 'ACL rehab', 'active', $1),
        ('Priya Sharma', 'priya.sharma@example.com', '555-0103', 'United Healthcare', 'UH-99871', 'Rotator cuff', 'active', $2),
        ('Liam Johnson', 'liam.johnson@example.com', '555-0104', 'Cigna', 'CG-33210', 'Post-op knee', 'active', $2),
        ('Nina Volkov', 'nina.volkov@example.com', '555-0105', 'Blue Cross', 'BC-10293', 'Chronic neck pain', 'discharged', $1),
        ('Carlos Diaz', 'carlos.diaz@example.com', '555-0106', 'Aetna', 'AE-55019', 'Plantar fasciitis', 'lead', NULL),
        ('Emma Wilson', 'emma.wilson@example.com', '555-0107', 'United Healthcare', 'UH-20984', 'Sprained ankle', 'lead', NULL),
        ('Tom Baker', 'tom.baker@example.com', '555-0108', 'Cigna', 'CG-77654', 'Hip mobility', 'active', $2)
       RETURNING id, name`,
      [jordan, sam]
    );

    const byName = Object.fromEntries(patients.map((p) => [p.name, p.id]));

    const appointments = [
      [byName['Maria Chen'], jordan, daysFromNow(-2, 9), daysFromNow(-2, 10), 'completed'],
      [byName['David Okafor'], jordan, daysFromNow(-1, 11), daysFromNow(-1, 12), 'completed'],
      [byName['Nina Volkov'], jordan, daysFromNow(-1, 14), daysFromNow(-1, 15), 'no_show'],
      [byName['Priya Sharma'], sam, daysFromNow(-3, 9), daysFromNow(-3, 10), 'completed'],
      [byName['Liam Johnson'], sam, daysFromNow(-2, 13), daysFromNow(-2, 14), 'cancelled'],
      [byName['Maria Chen'], jordan, daysFromNow(0, 9), daysFromNow(0, 10), 'scheduled'],
      [byName['David Okafor'], jordan, daysFromNow(0, 11), daysFromNow(0, 12), 'scheduled'],
      [byName['Priya Sharma'], sam, daysFromNow(0, 10), daysFromNow(0, 11), 'scheduled'],
      [byName['Tom Baker'], sam, daysFromNow(0, 15), daysFromNow(0, 16), 'scheduled'],
      [byName['Liam Johnson'], sam, daysFromNow(1, 9), daysFromNow(1, 10), 'scheduled'],
      [byName['Maria Chen'], jordan, daysFromNow(2, 9), daysFromNow(2, 10), 'scheduled'],
      [byName['Tom Baker'], sam, daysFromNow(3, 14), daysFromNow(3, 15), 'scheduled'],
    ];

    for (const [patientId, therapistId, start, end, status] of appointments) {
      await client.query(
        `INSERT INTO appointments (patient_id, therapist_id, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [patientId, therapistId, start, end, status]
      );
    }

    const tasks = [
      [jordan, byName['Maria Chen'], 'Update home exercise plan', 0, false],
      [jordan, byName['David Okafor'], 'Send progress note to referring physician', 0, false],
      [jordan, null, 'Restock resistance bands', 0, true],
      [sam, byName['Priya Sharma'], 'Review shoulder ROM measurements', 0, false],
      [sam, byName['Tom Baker'], 'Call patient re: insurance authorization', 0, false],
      [sam, byName['Liam Johnson'], 'Prep post-op protocol packet', 1, false],
    ];

    for (const [therapistId, patientId, description, dueOffset, completed] of tasks) {
      const dueDate = daysFromNow(dueOffset).toISOString().slice(0, 10);
      await client.query(
        `INSERT INTO tasks (therapist_id, patient_id, description, due_date, completed)
         VALUES ($1, $2, $3, $4, $5)`,
        [therapistId, patientId, description, dueDate, completed]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('Demo logins (password: password123):');
    console.log('  admin@clinic.dev   (Admin)');
    console.log('  jordan@clinic.dev  (Therapist)');
    console.log('  sam@clinic.dev     (Therapist)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
