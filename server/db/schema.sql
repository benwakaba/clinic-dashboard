-- Clinic Operations Dashboard schema

-- Lets a GiST exclusion constraint combine plain equality (therapist_id) with range overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'therapist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  insurance_provider TEXT,
  insurance_id TEXT,
  condition TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'discharged')),
  assigned_therapist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A therapist can't be in two places at once. Checking for overlaps in application code
-- races (two concurrent bookings can both see a free slot), so the database enforces it.
-- '[)' ranges let back-to-back appointments (10:00-11:00, 11:00-12:00) coexist. Only
-- cancelled appointments free their slot: completed and no-show ones still took the time.
-- Added after the first release, so it's guarded rather than part of CREATE TABLE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_double_booking') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_no_double_booking EXCLUDE USING gist (
      therapist_id WITH =,
      tstzrange(start_time, end_time) WITH &&
    ) WHERE (status <> 'cancelled');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_therapist_time ON appointments(therapist_id, start_time);
CREATE INDEX IF NOT EXISTS idx_patients_therapist ON patients(assigned_therapist_id);
CREATE INDEX IF NOT EXISTS idx_tasks_therapist_date ON tasks(therapist_id, due_date);
