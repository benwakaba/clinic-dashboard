# Clinic Ops Dashboard

A lightweight internal tool for running the day-to-day of a small PT/medical clinic:
patient intake, weekly scheduling, staff task management, and basic performance analytics —
a simple alternative to expensive clinic management software.

## Features

- **Patient roster** with an intake form (name, contact info, insurance, condition, assigned therapist)
- **Weekly scheduler** — create, move, and cancel appointments from a calendar grid
- **Staff dashboard** — today's patient load and a per-therapist task checklist
- **Analytics** (admin only) — patient conversion rate, appointment completion rate, average
  sessions per patient, a 14-day appointment volume chart, and per-therapist load
- **Role-based access** — Admin sees the whole clinic; Therapist is scoped to their own
  patients, appointments, and tasks

## Tech stack

- React 19 + React Router (Vite)
- Tailwind CSS 4
- Node.js + Express 5
- PostgreSQL (via `pg`, raw SQL — no ORM)
- JWT authentication, bcrypt password hashing
- Recharts for the analytics chart

## Project structure

```
clinic-dashboard/
├── client/          React app (Vite)
├── server/          Express API
│   ├── db/          schema.sql, migrate.js, seed.js, pool.js
│   ├── middleware/  JWT auth + role guard
│   └── routes/       auth, patients, appointments, tasks, analytics, users
└── docker-compose.yml   optional local Postgres
```

## Local setup

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance (see options below)

### 1. Database

Use Docker if you don't already have Postgres running locally:

```bash
docker compose up -d
```

Or point `DATABASE_URL` in `server/.env` at any Postgres instance you already have.

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` if your database credentials differ from the defaults. `PORT` defaults
to `5050` (not `5000`, since macOS reserves 5000 for AirPlay Receiver).

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Create the schema and seed demo data

```bash
cd server
npm run db:migrate
npm run db:seed
```

This creates three demo accounts (password for all: `password123`):

| Email               | Role      |
|---------------------|-----------|
| admin@clinic.dev    | Admin     |
| jordan@clinic.dev   | Therapist |
| sam@clinic.dev      | Therapist |

### 5. Run it

In one terminal:

```bash
cd server && npm run dev
```

In another:

```bash
cd client && npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` requests to the server at
`http://localhost:5050`.

## Deployment

- **Frontend** — deploy `client/` to Vercel or GitHub Pages. Set the build command to
  `npm run build` and the output directory to `dist`. Set the `VITE_API_URL` build-time
  env var to your deployed backend's origin (see `client/.env.example`) — locally this is
  left unset and the Vite dev proxy handles `/api` instead.
- **Backend** — deploy `server/` to Render as a Node web service. Set `DATABASE_URL`,
  `JWT_SECRET`, `PORT`, and `CLIENT_URL` (your deployed frontend origin, for CORS) as
  environment variables. Render's free Postgres tier works well for `DATABASE_URL`.
- Run `npm run db:migrate` and `npm run db:seed` once against the production database
  after the backend is deployed.
