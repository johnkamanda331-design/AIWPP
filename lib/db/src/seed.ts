/**
 * Seed script — populates the database with realistic demo data so the app
 * has something meaningful to display on first load.
 *
 * Usage:  pnpm --filter @workspace/db run seed
 *
 * Safe to run multiple times: existing rows are detected and skipped where
 * possible; tables are cleared and re-seeded if a --force flag is passed.
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱  Starting database seed…\n");

  // ── 1. Users — insert demo accounts by username if they don't exist ───────
  const DEMO_USERS = [
    { username: "admin",   email: "admin@mtiririko.io",  pw: "Admin@1234",  role: "administrator", lastLogin: minutesAgo(15) },
    { username: "tech1",   email: "tech@mtiririko.io",   pw: "Tech@1234",   role: "technician",    lastLogin: hoursAgo(2)   },
    { username: "maint1",  email: "maint@mtiririko.io",  pw: "Maint@1234",  role: "maintenance",   lastLogin: daysAgo(1)    },
    { username: "viewer1", email: "viewer@mtiririko.io", pw: "Viewer@1234", role: "viewer",        lastLogin: daysAgo(3)    },
  ] as const;

  let usersCreated = 0;
  for (const demo of DEMO_USERS) {
    const existing = await db
      .select({ id: schema.usersTable.id })
      .from(schema.usersTable)
      .where(eq(schema.usersTable.username, demo.username));

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(demo.pw, 10);
      await db.insert(schema.usersTable).values({
        username: demo.username,
        email: demo.email,
        passwordHash,
        role: demo.role,
        isActive: true,
        mfaEnabled: false,
        lastLogin: demo.lastLogin,
      });
      usersCreated++;
      console.log(`     ✓  Created user: ${demo.username} (${demo.role})`);
    } else {
      console.log(`  ↳  User '${demo.username}' already exists — skipping`);
    }
  }
  if (usersCreated === 0) {
    console.log("  ↳  All demo users already exist");
  }

  // ── 2. Settings ───────────────────────────────────────────────────────────
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
    const existing = await db.select({ id: schema.settingsTable.id })
      .from(schema.settingsTable)
      .where(eq(schema.settingsTable.key, s.key));
    if (existing.length === 0) {
      await db.insert(schema.settingsTable).values(s);
    }
  }
  console.log(`  ↳  ✓  ${settingDefaults.length} settings ensured`);

  // ── 3. Schedules ──────────────────────────────────────────────────────────
  const existingSchedules = await db.select({ id: schema.schedulesTable.id }).from(schema.schedulesTable);
  if (existingSchedules.length === 0) {
    await db.insert(schema.schedulesTable).values([
      {
        name: "Morning Run",
        type: "daily",
        startTime: "06:00",
        endTime: "09:00",
        days: JSON.stringify([1, 2, 3, 4, 5, 6, 0]),
        isActive: true,
        priority: 1,
      },
      {
        name: "Evening Fill",
        type: "daily",
        startTime: "17:30",
        endTime: "20:00",
        days: JSON.stringify([1, 2, 3, 4, 5]),
        isActive: true,
        priority: 1,
      },
      {
        name: "Weekend Deep Fill",
        type: "weekly",
        startTime: "08:00",
        endTime: "12:00",
        days: JSON.stringify([6, 0]),
        isActive: true,
        priority: 2,
      },
    ]);
    console.log("  ↳  ✓  3 schedules created");
  } else {
    console.log(`  ↳  Schedules already exist (${existingSchedules.length}) — skipping`);
  }

  // ── 4. Faults ─────────────────────────────────────────────────────────────
  const existingFaults = await db.select({ id: schema.faultsTable.id }).from(schema.faultsTable);
  if (existingFaults.length === 0) {
    await db.insert(schema.faultsTable).values([
      {
        type: "under_voltage",
        severity: "medium",
        cause: "Supply voltage dropped to 208 V during peak-load period",
        recommendedAction: "Check incoming supply from utility; inspect cable connections",
        occurrences: 3,
        confidence: 91,
        trend: "stable",
        isActive: true,
        firstSeen: daysAgo(4),
        lastSeen: hoursAgo(6),
        description: "Supply voltage below minimum threshold (200 V)",
      },
      {
        type: "high_temperature",
        severity: "low",
        cause: "Controller enclosure ventilation partially obstructed",
        recommendedAction: "Clear ventilation slots; check ambient temperature",
        occurrences: 1,
        confidence: 75,
        trend: "stable",
        isActive: false,
        firstSeen: daysAgo(10),
        lastSeen: daysAgo(8),
        description: "Internal temperature exceeded 55 °C briefly",
      },
      {
        type: "communication_loss",
        severity: "high",
        cause: "MQTT broker unreachable for 47 s — likely WiFi dropout",
        recommendedAction: "Check router connectivity; verify WiFi signal strength",
        occurrences: 2,
        confidence: 88,
        trend: "decreasing",
        isActive: false,
        firstSeen: daysAgo(2),
        lastSeen: hoursAgo(18),
        description: "Remote communication interrupted",
      },
    ]);
    console.log("  ↳  ✓  3 faults created");
  } else {
    console.log(`  ↳  Faults already exist (${existingFaults.length}) — skipping`);
  }

  // ── 5. Events ─────────────────────────────────────────────────────────────
  const existingEvents = await db.select({ id: schema.eventsTable.id }).from(schema.eventsTable);
  if (existingEvents.length === 0) {
    await db.insert(schema.eventsTable).values([
      {
        type: "pump_started",
        description: "Pump started — scheduled morning run",
        severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Morning Run" }),
        timestamp: hoursAgo(1),
      },
      {
        type: "voltage_low",
        description: "Supply voltage dropped to 208 V",
        severity: "medium",
        details: JSON.stringify({ voltage: 208, threshold: 210 }),
        timestamp: hoursAgo(6),
      },
      {
        type: "pump_stopped",
        description: "Pump stopped — scheduled stop",
        severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Morning Run" }),
        timestamp: hoursAgo(7),
      },
      {
        type: "communication_restored",
        description: "MQTT connection restored after 47 s dropout",
        severity: "info",
        details: JSON.stringify({ downtime_s: 47 }),
        timestamp: hoursAgo(18),
      },
      {
        type: "pump_started",
        description: "Pump started — evening fill",
        severity: "info",
        details: JSON.stringify({ trigger: "schedule", schedule: "Evening Fill" }),
        timestamp: hoursAgo(24),
      },
      {
        type: "fault_cleared",
        description: "High temperature fault auto-cleared — temp normalized",
        severity: "info",
        details: JSON.stringify({ fault_type: "high_temperature", temp: 49.2 }),
        timestamp: daysAgo(8),
      },
      {
        type: "user_login",
        description: "Admin signed in",
        severity: "info",
        details: JSON.stringify({ username: "admin", role: "administrator" }),
        timestamp: minutesAgo(15),
      },
    ]);
    console.log("  ↳  ✓  7 events created");
  } else {
    console.log(`  ↳  Events already exist (${existingEvents.length}) — skipping`);
  }

  // ── 6. Notifications ──────────────────────────────────────────────────────
  const existingNotifs = await db.select({ id: schema.notificationsTable.id }).from(schema.notificationsTable);
  if (existingNotifs.length === 0) {
    await db.insert(schema.notificationsTable).values([
      {
        type: "fault_active",
        severity: "medium",
        message: "Under-voltage fault is active — supply voltage below threshold",
        isRead: false,
        details: JSON.stringify({ fault_type: "under_voltage", occurrences: 3 }),
        timestamp: hoursAgo(6),
      },
      {
        type: "schedule_run",
        severity: "info",
        message: "Morning Run schedule completed — 3.0 h runtime, 2.25 kWh",
        isRead: true,
        details: JSON.stringify({ schedule: "Morning Run", runtime_h: 3, energy_kwh: 2.25 }),
        timestamp: hoursAgo(7),
      },
      {
        type: "communication_restored",
        severity: "info",
        message: "MQTT connection restored after brief dropout",
        isRead: true,
        details: null,
        timestamp: hoursAgo(18),
      },
    ]);
    console.log("  ↳  ✓  3 notifications created");
  } else {
    console.log(`  ↳  Notifications already exist (${existingNotifs.length}) — skipping`);
  }

  // ── 7. Telemetry — 24 h of hourly samples ──────────────────────────────
  const existingTel = await db.select({ id: schema.telemetryTable.id }).from(schema.telemetryTable);
  if (existingTel.length === 0) {
    console.log("  ↳  Inserting 24 h of telemetry samples…");

    const rows: schema.InsertTelemetry[] = [];
    let accEnergy = 0;
    let accRuntime = 0;

    for (let h = 23; h >= 0; h--) {
      const ts = hoursAgo(h);
      // Pump runs during scheduled windows: 06–09 and 17:30–20
      const hour = ts.getHours();
      const isRunning = (hour >= 6 && hour < 9) || (hour >= 17 && hour < 20);

      const voltage = 230 + (Math.random() * 10 - 5);
      const current = isRunning ? 9.2 + (Math.random() * 0.8 - 0.4) : 0.05;
      const frequency = 50 + (Math.random() * 0.4 - 0.2);
      const pf = isRunning ? 0.88 + Math.random() * 0.04 : 0.1;
      const realPower = voltage * current * pf;
      const apparentPower = voltage * current;
      const reactivePower = Math.sqrt(Math.max(0, apparentPower ** 2 - realPower ** 2));

      if (isRunning) {
        accRuntime += 1;
        accEnergy  += realPower / 1000; // kWh per hour
      }

      rows.push({
        timestamp: ts,
        voltage: parseFloat(voltage.toFixed(1)),
        current: parseFloat(current.toFixed(2)),
        frequency: parseFloat(frequency.toFixed(2)),
        realPower: parseFloat(realPower.toFixed(1)),
        reactivePower: parseFloat(reactivePower.toFixed(1)),
        apparentPower: parseFloat(apparentPower.toFixed(1)),
        powerFactor: parseFloat(pf.toFixed(3)),
        energy: parseFloat(accEnergy.toFixed(3)),
        runtime: parseFloat(accRuntime.toFixed(2)),
        internalTemp: parseFloat((38 + Math.random() * 4).toFixed(1)),
        communicationQuality: parseFloat((52 + Math.random() * 8).toFixed(1)),
        motorState: isRunning ? "running" : "stopped",
        supplyState: "normal",
        relayState: isRunning ? "closed" : "open",
      });
    }

    await db.insert(schema.telemetryTable).values(rows);
    console.log(`     ✓  ${rows.length} telemetry rows created`);
  } else {
    console.log(`  ↳  Telemetry already exists (${existingTel.length} rows) — skipping`);
  }

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
