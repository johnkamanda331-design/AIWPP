# AIPPMCS — Adaptive Intelligent Water Pump Protection, Monitoring and Control System

A production-quality industrial web dashboard for real-time monitoring, control, fault detection, adaptive learning, scheduling, analytics, and energy management of ESP32-based pump controllers.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (`artifacts/aippmcs`)
- **API Server**: Express 5 + Drizzle ORM (`artifacts/api-server`)
- **Database**: Neon PostgreSQL (via `DATABASE_URL` secret)
- **Auth**: JWT (signed with `SESSION_SECRET`), role-based (administrator / technician / maintenance / viewer)
- **Shared libs**: `lib/api-spec` (OpenAPI), `lib/api-client-react` (generated React Query hooks), `lib/api-zod` (Zod schemas), `lib/db` (Drizzle schema + client)

## How to run

Two workflows start automatically:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/aippmcs: web` | `pnpm --filter @workspace/aippmcs run dev` | 22559 |
| `API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

The frontend proxies all `/api/*` requests to the API server (configured in `artifacts/aippmcs/vite.config.ts`).

## Required secrets

| Secret | Description |
|---|---|
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string |
| `SESSION_SECRET` | JWT signing secret |

## First-time setup

On a fresh database, visit `/login` and use the **Register** flow — the first account is automatically created as administrator. Subsequent accounts must be created by an administrator via the Users page or `POST /api/users`.

## Demo data / seeding

Run the seed script to populate the database with realistic demo data (users, events, faults, schedules, telemetry, settings):

```bash
NEON_DATABASE_URL=$NEON_DATABASE_URL pnpm --filter @workspace/db run seed
```

Demo credentials (safe to re-run — skips rows that already exist by username):

| Username | Password | Role |
|---|---|---|
| admin | Admin@1234 | Administrator |
| tech1 | Tech@1234 | Technician |
| maint1 | Maint@1234 | Maintenance |
| viewer1 | Viewer@1234 | Viewer |

## Database

Schema managed with Drizzle ORM. To push schema changes:

```bash
NEON_DATABASE_URL=$NEON_DATABASE_URL pnpm --filter @workspace/db run push
```

Tables: `users`, `events`, `faults`, `schedules`, `notifications`, `settings`, `telemetry`, `control_commands`

## Pages

Dashboard · Live Monitoring · Remote Control · Scheduler · Fault Detection · Event Timeline · Analytics · Electrical Signature · Adaptive Learning · Energy Management · Health Score · Notifications · Device Settings · OTA Firmware · User Management · Reports

## User preferences

- Keep the project's existing structure and stack — do not restructure or migrate it.
