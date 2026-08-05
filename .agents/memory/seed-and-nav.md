---
name: Seed script and nav RBAC
description: How the DB seed works and how role-based nav filtering is implemented in the sidebar
---

## Seed script location
`lib/db/src/seed.ts` — run with `NEON_DATABASE_URL=$NEON_DATABASE_URL pnpm --filter @workspace/db run seed`

**Why:** Inserts demo users (admin/tech1/maint1/viewer1) plus events, faults, schedules, telemetry, and settings. Safe to re-run — checks by username before inserting, not just "any users exist".

**How to apply:** Auth uses bcrypt (bcryptjs); seed must call `bcrypt.hash(pw, 10)`. The seed does NOT use dotenv — env vars must be set in the shell before running.

## Nav role filtering (shell.tsx)
Nav items in `artifacts/aippmcs/src/components/layout/shell.tsx` use an `allowedRoles?: Role[]` field. The `canSee()` function filters both the icon-only collapsed view and the full `NavLinks` component.

- `/control` → technician + administrator only  
- `/settings`, `/firmware` → administrator only  
- `/users` → administrator only (separate Admin section)

**Why:** Router-level protection exists in `router.tsx`, but without nav filtering non-admin users saw links to pages they'd be blocked from — confusing UX.
