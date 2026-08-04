---
name: Upgrade batch completed
description: Summary of what the big security/backend/DB/frontend upgrade session delivered and what is intentionally deferred
---

## Done
- **Security**: helmet, CORS allowlist (*.replit.dev + localhost), rate limiter on /api/auth (20 req / 15 min), startup warning if SESSION_SECRET is default, in-memory token revocation (`revokeToken`/`isTokenRevoked`), token stored on `req.authToken` so logout can revoke it
- **Config**: `artifacts/api-server/src/lib/config.ts` — centralised constants (bcrypt rounds, JWT expiry, rate-limit values, pagination, monitoring defaults)
- **Events route**: parallel `count()` + `LIMIT/OFFSET` SQL fetch — never loads full table
- **Settings route**: atomic `onConflictDoUpdate` upsert via `Promise.all` — no read-then-write race
- **Monitoring route**: fire-and-forget `db.insert(telemetryTable)` on each /monitoring/live call; /monitoring/history reads from DB, falls back to simulation when empty
- **DB schema**: telemetry table added; indexes on events(timestamp, severity, type), faults(isActive, severity, lastSeen), notifications(isRead, severity, timestamp); schema pushed via drizzle-kit
- **Frontend**: CSS theme tokens filled (light: bg `220 16% 97%`, primary green `152 48% 36%`; dark: bg `222 28% 8%`, primary `152 48% 48%`); `ErrorBoundary` class component; `ErrorState` component (error + offline variants); `App.tsx` wrapped; monitoring page shows ErrorState with retry on failure

## Why (key decisions)
- Token revocation is in-memory only — cleared on restart. A Redis SET or DB table would survive restarts but adds infra complexity; deferred.
- Telemetry data is still **simulated** — real ESP32/MQTT ingestion is a separate future task.
- JWT stays in localStorage — moving to httpOnly cookie requires a larger auth overhaul (CSRF tokens, cookie domain config); intentionally deferred.

## Still deferred / not done
- MQTT/ESP32 hardware ingestion
- httpOnly cookie auth
- WebSocket/SSE for push instead of polling
- Test suite
- Soft-delete on users table
