/**
 * Seed script — populates the database with 30 days of realistic demo data.
 *
 * Usage:  pnpm --filter @workspace/db run seed
 *
 * Telemetry, events, faults, and notifications are always cleared and
 * re-seeded so that the volume and date ranges stay fresh.
 * Users, settings, and schedules are upserted (skipped if they already exist).
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌  NEON_DATABASE_URL or DATABASE_URL must be set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

// ── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}
function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 86_400_000);
}
function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}
function rand(base: number, spread: number): number {
  return base + (Math.random() - 0.5) * 2 * spread;
}

/** True if hour:minute falls within [startH:startM, endH:endM) */
function inWindow(h: number, m: number, startH: number, startM: number, endH: number, endM: number): boolean {
  const t = h * 60 + m;
  const s = startH * 60 + startM;
  const e = endH * 60 + endM;
  return t >= s && t < e;
}

function isPumpRunning(ts: Date): boolean {
  const h = ts.getHours();
  const m = ts.getMinutes();
  const dow = ts.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 6;

  // Morning run: 06:00–09:00 every day
  if (inWindow(h, m, 6, 0, 9, 0)) return true;
  // Evening fill: 17:30–20:00 weekdays only
  if (!isWeekend && inWindow(h, m, 17, 30, 20, 0)) return true;
  // Weekend deep fill: 08:00–12:00
  if (isWeekend && inWindow(h, m, 8, 0, 12, 0)) return true;

  return false;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱  Starting database seed…\n");

  // ── 1. Users ─────────────────────────────────────────────────────────────
  const DEMO_USERS = [
    { username: "admin",   email: "admin@mtiririko.io",  pw: "Admin@1234",  role: "administrator", lastLogin: minutesAgo(15) },
    { username: "tech1",   email: "tech@mtiririko.io",   pw: "Tech@1234",   role: "technician",    lastLogin: hoursAgo(2)   },
    { username: "maint1",  email: "maint@mtiririko.io",  pw: "Maint@1234",  role: "maintenance",   lastLogin: daysAgo(1)    },
    { username: "viewer1", email: "viewer@mtiririko.io", pw: "Viewer@1234", role: "viewer",        lastLogin: daysAgo(3)    },
  ] as const;

  let usersCreated = 0;
  for (const demo of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(demo.pw, 10);
    const existing = await db.select({ id: schema.usersTable.id }).from(schema.usersTable)
      .where(eq(schema.usersTable.username, demo.username));
    if (existing.length === 0) {
      await db.insert(schema.usersTable).values({
        username: demo.username, email: demo.email, passwordHash,
        role: demo.role, isActive: true, mfaEnabled: false, lastLogin: demo.lastLogin,
      });
      usersCreated++;
      console.log(`     ✓  Created user: ${demo.username} (${demo.role})`);
    } else {
      // Always refresh password hash so demo credentials are reliable after any re-seed
      await db.update(schema.usersTable)
        .set({ passwordHash, isActive: true, lastLogin: demo.lastLogin })
        .where(eq(schema.usersTable.username, demo.username));
      console.log(`  ↳  User '${demo.username}' refreshed password`);
    }
  }
  if (usersCreated === 0) console.log("  ↳  All demo users updated");

  // ── 2. Settings ──────────────────────────────────────────────────────────
  const settingDefaults: Array<{ key: string; value: string }> = [
    { key: "system.name",               value: JSON.stringify("Mtiririko Pump Station #1") },
    { key: "system.location",           value: JSON.stringify("Nairobi, Kenya") },
    { key: "system.timezone",           value: JSON.stringify("Africa/Nairobi") },
    { key: "pump.ratedPowerKw",         value: JSON.stringify(2.2) },
    { key: "pump.ratedCurrentA",        value: JSON.stringify(9.8) },
    { key: "pump.ratedVoltageV",        value: JSON.stringify(240) },
    { key: "pump.ratedFrequencyHz",     value: JSON.stringify(50) },
    { key: "pump.tankCapacityL",        value: JSON.stringify(5000) },
    { key: "protection.dryRunEnabled",  value: JSON.stringify(true) },
    { key: "protection.overCurrentA",   value: JSON.stringify(12.5) },
    { key: "protection.underVoltageV",  value: JSON.stringify(200) },
    { key: "protection.overVoltageV",   value: JSON.stringify(264) },
    { key: "tariff.rateKshPerKwh",      value: JSON.stringify(24.80) },
    { key: "tariff.currency",           value: JSON.stringify("KSh") },
    { key: "alert.email",               value: JSON.stringify("alerts@mtiririko.io") },
    { key: "firmware.currentVersion",   value: JSON.stringify("v2.4.1") },
    { key: "firmware.latestVersion",    value: JSON.stringify("v2.4.1") },
  ];
  for (const s of settingDefaults) {
    const existing = await db.select({ id: schema.settingsTable.id }).from(schema.settingsTable)
      .where(eq(schema.settingsTable.key, s.key));
    if (existing.length === 0) await db.insert(schema.settingsTable).values(s);
  }
  console.log(`  ↳  ✓  ${settingDefaults.length} settings ensured`);

  // ── 3. Schedules ─────────────────────────────────────────────────────────
  const existingSchedules = await db.select({ id: schema.schedulesTable.id }).from(schema.schedulesTable);
  if (existingSchedules.length === 0) {
    await db.insert(schema.schedulesTable).values([
      { name: "Morning Run",       type: "daily",  startTime: "06:00", endTime: "09:00", days: JSON.stringify([0,1,2,3,4,5,6]), isActive: true, priority: 1 },
      { name: "Evening Fill",      type: "daily",  startTime: "17:30", endTime: "20:00", days: JSON.stringify([1,2,3,4,5]),     isActive: true, priority: 1 },
      { name: "Weekend Deep Fill", type: "weekly", startTime: "08:00", endTime: "12:00", days: JSON.stringify([6,0]),           isActive: true, priority: 2 },
    ]);
    console.log("  ↳  ✓  3 schedules created");
  } else {
    console.log(`  ↳  Schedules already exist (${existingSchedules.length}) — skipping`);
  }

  // ── 4. Faults — clear and re-seed ────────────────────────────────────────
  await db.delete(schema.faultsTable);
  await db.insert(schema.faultsTable).values([
    {
      type: "under_voltage", severity: "medium",
      cause: "Supply voltage dropped to 208 V during peak-load period",
      recommendedAction: "Check incoming supply from utility; inspect cable connections",
      occurrences: 7, confidence: 91, trend: "stable", isActive: true,
      firstSeen: daysAgo(14), lastSeen: hoursAgo(6),
      description: "Supply voltage below minimum threshold (200 V)",
    },
    {
      type: "high_temperature", severity: "low",
      cause: "Controller enclosure ventilation partially obstructed",
      recommendedAction: "Clear ventilation slots; check ambient temperature",
      occurrences: 2, confidence: 75, trend: "stable", isActive: false,
      firstSeen: daysAgo(22), lastSeen: daysAgo(20),
      description: "Internal temperature exceeded 55 °C briefly",
    },
    {
      type: "communication_loss", severity: "high",
      cause: "MQTT broker unreachable for 47 s — likely WiFi dropout",
      recommendedAction: "Check router connectivity; verify WiFi signal strength at controller",
      occurrences: 4, confidence: 88, trend: "decreasing", isActive: false,
      firstSeen: daysAgo(10), lastSeen: hoursAgo(18),
      description: "Remote communication interrupted",
    },
    {
      type: "dry_run_detected", severity: "critical",
      cause: "Current below 1 A while relay closed — possible dry run or pump cavitation",
      recommendedAction: "Check water level in source tank; inspect foot valve and strainer",
      occurrences: 1, confidence: 95, trend: "stable", isActive: false,
      firstSeen: daysAgo(18), lastSeen: daysAgo(18),
      description: "Dry run protection triggered — pump stopped automatically",
    },
    {
      type: "over_current", severity: "high",
      cause: "Motor current reached 11.2 A — possible mechanical obstruction",
      recommendedAction: "Inspect pump impeller for debris; check bearings",
      occurrences: 2, confidence: 82, trend: "decreasing", isActive: false,
      firstSeen: daysAgo(25), lastSeen: daysAgo(21),
      description: "Current exceeded rated limit of 9.8 A",
    },
    {
      type: "power_factor_low", severity: "low",
      cause: "Power factor dipped to 0.74 — possible capacitor bank degradation",
      recommendedAction: "Test run capacitor bank; consider replacement if PF remains below 0.80",
      occurrences: 3, confidence: 70, trend: "stable", isActive: true,
      firstSeen: daysAgo(7), lastSeen: hoursAgo(2),
      description: "Power factor below acceptable threshold of 0.80",
    },
  ]);
  console.log("  ↳  ✓  6 faults created");

  // ── 5. Events — clear and re-seed with 30 days of history ────────────────
  await db.delete(schema.eventsTable);

  const events: Array<schema.InsertEvent> = [];

  // Recurring daily events: pump starts / stops for each schedule window
  for (let day = 29; day >= 0; day--) {
    const base = daysAgo(day);
    const dow = base.getDay();
    const isWeekend = dow === 0 || dow === 6;

    // Morning run start
    const morningStart = new Date(base); morningStart.setHours(6, 0, 30, 0);
    events.push({ type: "pump_started", description: "Pump started — Morning Run schedule", severity: "info",
      details: JSON.stringify({ trigger: "schedule", schedule: "Morning Run" }), timestamp: morningStart });

    // Morning run stop
    const morningStop = new Date(base); morningStop.setHours(9, 0, 15, 0);
    const morningRuntime = 3.0 + rand(0, 0.02);
    const morningEnergy  = parseFloat((morningRuntime * 0.895).toFixed(3));
    events.push({ type: "pump_stopped", description: "Pump stopped — Morning Run complete", severity: "info",
      details: JSON.stringify({ trigger: "schedule", schedule: "Morning Run", runtime_h: morningRuntime, energy_kwh: morningEnergy }), timestamp: morningStop });

    // Evening fill (weekdays)
    if (!isWeekend) {
      const eveningStart = new Date(base); eveningStart.setHours(17, 30, 10, 0);
      events.push({ type: "pump_started", description: "Pump started — Evening Fill schedule", severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Evening Fill" }), timestamp: eveningStart });

      const eveningStop = new Date(base); eveningStop.setHours(20, 0, 20, 0);
      const eveningRuntime = 2.5 + rand(0, 0.02);
      const eveningEnergy  = parseFloat((eveningRuntime * 0.895).toFixed(3));
      events.push({ type: "pump_stopped", description: "Pump stopped — Evening Fill complete", severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Evening Fill", runtime_h: eveningRuntime, energy_kwh: eveningEnergy }), timestamp: eveningStop });
    }

    // Weekend deep fill
    if (isWeekend) {
      const wkStart = new Date(base); wkStart.setHours(8, 0, 5, 0);
      events.push({ type: "pump_started", description: "Pump started — Weekend Deep Fill schedule", severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Weekend Deep Fill" }), timestamp: wkStart });

      const wkStop = new Date(base); wkStop.setHours(12, 0, 10, 0);
      const wkRuntime = 4.0 + rand(0, 0.03);
      const wkEnergy  = parseFloat((wkRuntime * 0.895).toFixed(3));
      events.push({ type: "pump_stopped", description: "Pump stopped — Weekend Deep Fill complete", severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Weekend Deep Fill", runtime_h: wkRuntime, energy_kwh: wkEnergy }), timestamp: wkStop });
    }
  }

  // Fault-related events at specific days
  const faultEvents: Array<schema.InsertEvent> = [
    { type: "fault_detected",    description: "Dry run protection triggered — pump halted automatically", severity: "critical",
      details: JSON.stringify({ fault_type: "dry_run_detected", current: 0.8 }),      timestamp: daysAgo(18) },
    { type: "fault_cleared",     description: "Dry run fault cleared — water level restored",            severity: "info",
      details: JSON.stringify({ fault_type: "dry_run_detected" }),                    timestamp: new Date(daysAgo(18).getTime() + 4 * 3_600_000) },
    { type: "fault_detected",    description: "Over-current detected — motor current 11.2 A",            severity: "high",
      details: JSON.stringify({ fault_type: "over_current", current: 11.2 }),         timestamp: daysAgo(25) },
    { type: "fault_cleared",     description: "Over-current cleared after pump restart",                 severity: "info",
      details: JSON.stringify({ fault_type: "over_current" }),                        timestamp: new Date(daysAgo(25).getTime() + 2 * 3_600_000) },
    { type: "voltage_low",       description: "Supply voltage dropped to 208 V",                        severity: "medium",
      details: JSON.stringify({ voltage: 208, threshold: 210 }),                      timestamp: daysAgo(14) },
    { type: "fault_detected",    description: "Power factor dipped to 0.74 — possible cap. degradation",severity: "low",
      details: JSON.stringify({ fault_type: "power_factor_low", pf: 0.74 }),          timestamp: daysAgo(7) },
    { type: "communication_lost",description: "MQTT connection lost — WiFi dropout",                    severity: "high",
      details: JSON.stringify({ downtime_s: 0 }),                                     timestamp: hoursAgo(42) },
    { type: "communication_restored", description: "MQTT connection restored after 47 s dropout",       severity: "info",
      details: JSON.stringify({ downtime_s: 47 }),                                    timestamp: new Date(hoursAgo(42).getTime() + 47_000) },
    { type: "voltage_low",       description: "Supply voltage dropped to 212 V",                        severity: "medium",
      details: JSON.stringify({ voltage: 212, threshold: 215 }),                      timestamp: hoursAgo(6) },
    { type: "user_login",        description: "Admin signed in",                                        severity: "info",
      details: JSON.stringify({ username: "admin", role: "administrator" }),          timestamp: minutesAgo(15) },
    { type: "user_login",        description: "tech1 signed in",                                        severity: "info",
      details: JSON.stringify({ username: "tech1", role: "technician" }),             timestamp: hoursAgo(2) },
    { type: "settings_changed",  description: "Protection thresholds updated by admin",                 severity: "info",
      details: JSON.stringify({ changed: ["protection.overCurrentA", "protection.underVoltageV"] }), timestamp: daysAgo(3) },
    { type: "firmware_check",    description: "Firmware version check — v2.4.1 is up to date",          severity: "info",
      details: JSON.stringify({ version: "v2.4.1", latestVersion: "v2.4.1" }),        timestamp: daysAgo(1) },
  ];

  events.push(...faultEvents);

  // Sort all events by timestamp before inserting
  events.sort((a, b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime());

  // Insert in chunks to avoid hitting parameter limits
  const CHUNK = 100;
  for (let i = 0; i < events.length; i += CHUNK) {
    await db.insert(schema.eventsTable).values(events.slice(i, i + CHUNK));
  }
  console.log(`  ↳  ✓  ${events.length} events created (30-day history)`);

  // ── 6. Notifications — clear and re-seed ─────────────────────────────────
  await db.delete(schema.notificationsTable);
  await db.insert(schema.notificationsTable).values([
    {
      type: "fault_active", severity: "medium",
      message: "Under-voltage fault is active — supply voltage below threshold (208 V detected)",
      isRead: false, details: JSON.stringify({ fault_type: "under_voltage", occurrences: 7 }), timestamp: hoursAgo(6),
    },
    {
      type: "fault_active", severity: "low",
      message: "Power factor fault active — PF reading of 0.74 detected, threshold is 0.80",
      isRead: false, details: JSON.stringify({ fault_type: "power_factor_low", occurrences: 3 }), timestamp: hoursAgo(2),
    },
    {
      type: "schedule_run", severity: "info",
      message: "Morning Run completed — 3.0 h runtime, ~2.69 kWh, KSh 66.7 estimated cost",
      isRead: true, details: JSON.stringify({ schedule: "Morning Run", runtime_h: 3.0, energy_kwh: 2.69 }), timestamp: hoursAgo(7),
    },
    {
      type: "communication_restored", severity: "info",
      message: "MQTT connection restored after 47 s dropout — all telemetry resumed",
      isRead: true, details: null, timestamp: hoursAgo(42),
    },
    {
      type: "fault_cleared", severity: "info",
      message: "Over-current fault cleared — pump restarted successfully after inspection",
      isRead: true, details: JSON.stringify({ fault_type: "over_current" }), timestamp: daysAgo(21),
    },
  ]);
  console.log("  ↳  ✓  5 notifications created");

  // ── 7. Telemetry — 30 days × 15-min intervals (~2880 rows) ───────────────
  await db.delete(schema.telemetryTable);
  console.log("  ↳  Generating 30 days of 15-minute telemetry samples…");

  const INTERVAL_MS = 15 * 60_000; // 15 minutes
  const TOTAL_DAYS  = 30;
  const startTime   = daysAgo(TOTAL_DAYS);

  const now         = Date.now();
  let accEnergy     = 0;
  let accRuntime    = 0;

  // Simulate a slow voltage drift (brownout tendency in evenings on some days)
  const telRows: schema.InsertTelemetry[] = [];

  for (let t = startTime.getTime(); t <= now; t += INTERVAL_MS) {
    const ts    = new Date(t);
    const running = isPumpRunning(ts);
    const dayOfYear = Math.floor((t - startTime.getTime()) / 86_400_000);

    // Occasional brownout days (days 3, 11, 14, 22, 28)
    const brownoutDays = new Set([3, 11, 14, 22, 28]);
    const isBrownout = brownoutDays.has(dayOfYear % 30);
    const voltageBase = isBrownout ? 212 : 230;
    const voltage     = parseFloat(rand(voltageBase, 3).toFixed(1));

    const current     = running
      ? parseFloat(rand(9.2, 0.5).toFixed(2))
      : parseFloat((0.05 + Math.random() * 0.02).toFixed(3));
    const frequency   = parseFloat(rand(50, 0.15).toFixed(2));
    const pf          = running ? parseFloat(rand(0.89, 0.03).toFixed(3)) : 0.1;
    const realPower   = parseFloat((voltage * current * pf).toFixed(1));
    const apparentPower = parseFloat((voltage * current).toFixed(1));
    const reactivePower = parseFloat(Math.sqrt(Math.max(0, apparentPower ** 2 - realPower ** 2)).toFixed(1));

    const intervalHours = INTERVAL_MS / 3_600_000;
    if (running) {
      accRuntime += intervalHours;
      accEnergy  += realPower / 1000 * intervalHours;
    }

    telRows.push({
      timestamp: ts,
      voltage,
      current,
      frequency,
      realPower,
      reactivePower,
      apparentPower,
      powerFactor: pf,
      energy:   parseFloat(accEnergy.toFixed(3)),
      runtime:  parseFloat(accRuntime.toFixed(3)),
      internalTemp: parseFloat(rand(running ? 41 : 37, 2).toFixed(1)),
      communicationQuality: parseFloat(rand(92, 6).toFixed(1)),
      motorState: running ? "running" : "stopped",
      supplyState: voltage < 210 ? "under_voltage" : "normal",
      relayState: running ? "closed" : "open",
    });
  }

  // Insert in chunks of 200
  for (let i = 0; i < telRows.length; i += 200) {
    await db.insert(schema.telemetryTable).values(telRows.slice(i, i + 200));
  }
  console.log(`     ✓  ${telRows.length} telemetry rows created (30 days × 15 min)`);

  console.log("\n✅  Seed complete.\n");
  console.log("Demo credentials:");
  console.log("  admin   / Admin@1234  (Administrator)");
  console.log("  tech1   / Tech@1234   (Technician)");
  console.log("  maint1  / Maint@1234  (Maintenance)");
  console.log("  viewer1 / Viewer@1234 (Viewer)\n");

  await pool.end();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  pool.end();
  process.exit(1);
});
