import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { GetEnergyDataResponse, GetEnergyDataQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── EPRA 2024 SC-11 tariff (Kenya) ─────────────────────────────────────────
const BAND1_ENERGY  = 15.80;
const BAND2_ENERGY  = 15.95;
const BAND1_LIMIT   = 1500;
const TOTAL_LEVIES  = 5.58;   // FCC + FERFA + IAF + ERC + REP + WRMA
const FIXED_MONTHLY = 200;    // KSh before VAT
const VAT           = 0.16;

function epraMonthlyBill(kWh: number): number {
  const energyCharge =
    kWh <= BAND1_LIMIT
      ? kWh * BAND1_ENERGY
      : BAND1_LIMIT * BAND1_ENERGY + (kWh - BAND1_LIMIT) * BAND2_ENERGY;
  const subtotal = energyCharge + kWh * TOTAL_LEVIES + FIXED_MONTHLY;
  return parseFloat((subtotal * (1 + VAT)).toFixed(2));
}

function epraDailyCost(kWh: number): number {
  const energyCharge =
    kWh <= BAND1_LIMIT
      ? kWh * BAND1_ENERGY
      : BAND1_LIMIT * BAND1_ENERGY + (kWh - BAND1_LIMIT) * BAND2_ENERGY;
  // Prorate fixed charge over 30 days
  const subtotal = energyCharge + kWh * TOTAL_LEVIES + FIXED_MONTHLY / 30;
  return parseFloat((subtotal * (1 + VAT)).toFixed(2));
}
// ─────────────────────────────────────────────────────────────────────────────

router.get("/energy", requireAuth, async (req, res): Promise<void> => {
  const params = GetEnergyDataQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const period = params.data.period ?? "month";
  const days   = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;

  // ── Query daily energy and runtime aggregates from telemetry ──────────────
  const rows = await db.execute(sql`
    SELECT
      DATE_TRUNC('day', timestamp AT TIME ZONE 'UTC')::date::text AS day,
      ROUND((MAX(energy) - MIN(energy))::numeric, 4)   AS energy_kwh,
      ROUND((MAX(runtime) - MIN(runtime))::numeric, 4) AS runtime_h,
      ROUND(AVG(real_power)::numeric, 1)               AS avg_power,
      COUNT(*) FILTER (WHERE motor_state = 'running')  AS running_samples,
      COUNT(*)                                          AS total_samples
    FROM telemetry
    WHERE timestamp >= NOW() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  type DayRow = {
    day: string;
    energy_kwh: string;
    runtime_h: string;
    avg_power: string;
    running_samples: string;
    total_samples: string;
  };

  const daily = (rows.rows as DayRow[]).map((r) => ({
    date:        r.day,
    consumption: Math.max(0, parseFloat(r.energy_kwh ?? "0")),
    runtime:     Math.max(0, parseFloat(r.runtime_h ?? "0")),
    avgPower:    parseFloat(r.avg_power ?? "0"),
  }));

  const totalConsumption = parseFloat(
    daily.reduce((s, r) => s + r.consumption, 0).toFixed(2)
  );

  // Peak usage: highest 15-min realPower reading converted to W
  const peakRow = await db.execute(sql`
    SELECT ROUND(MAX(real_power)::numeric, 1) AS peak_power
    FROM telemetry
    WHERE timestamp >= NOW() - (${days} || ' days')::interval
      AND motor_state = 'running'
  `);
  const peakWatts = Number((peakRow.rows[0] as Record<string, unknown>)?.peak_power ?? 0);
  const peakUsage = parseFloat((peakWatts / 1000).toFixed(3)); // kW

  // Idle consumption: energy consumed while motor is stopped
  const idleRow = await db.execute(sql`
    SELECT ROUND(AVG(real_power)::numeric, 2) AS idle_power
    FROM telemetry
    WHERE timestamp >= NOW() - (${days} || ' days')::interval
      AND motor_state != 'running'
  `);
  const idleW = Number((idleRow.rows[0] as Record<string, unknown>)?.idle_power ?? 12);
  const idleConsumption = parseFloat((idleW / 1000 * 24 * days).toFixed(3));

  // Projected monthly (extrapolate from actual daily average)
  const avgDailyKwh    = daily.length > 0 ? totalConsumption / daily.length : 3.92;
  const projectedMonthlyKwh = parseFloat((avgDailyKwh * 30).toFixed(2));

  // Cap breakdown to 30 rows for the response
  const dailyBreakdown = daily.slice(-30).map((r) => ({
    date:        r.date,
    consumption: parseFloat(r.consumption.toFixed(3)),
    cost:        epraDailyCost(r.consumption),
    runtime:     parseFloat(r.runtime.toFixed(2)),
  }));

  res.json(GetEnergyDataResponse.parse({
    period,
    totalConsumption,
    estimatedCost:    epraMonthlyBill(totalConsumption),
    projectedMonthly: epraMonthlyBill(projectedMonthlyKwh),
    peakUsage,
    idleConsumption,
    dailyBreakdown,
    suggestions: [
      "Schedule pump operation during off-peak hours (22:00–06:00) — potential 18–23% cost saving under EPRA Time-of-Use conditions.",
      avgDailyKwh > 4
        ? "Daily consumption is above average for a 2.2 kW pump. Review runtime windows or check for leaks increasing demand."
        : "Daily consumption is within expected range for a 2.2 kW pump running on scheduled windows.",
      `Monthly consumption projected at ${projectedMonthlyKwh.toFixed(0)} kWh — ${projectedMonthlyKwh <= BAND1_LIMIT ? "well within EPRA Band 1 (≤ 1 500 kWh). No tiered surcharge applies." : "exceeds EPRA Band 1 threshold. Band 2 rate of KSh 15.95/kWh applies to the excess."}`,
    ],
  }));
});

export default router;
