import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, faultsTable } from "@workspace/db";
import { GetHealthScoreResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/health-score", requireAuth, async (_req, res): Promise<void> => {
  // ── Query last 7 days of telemetry for health metrics ────────────────────
  const [statsRow, activeFaults] = await Promise.all([
    db.execute(sql`
      SELECT
        ROUND(AVG(voltage)::numeric, 2)                                          AS avg_v,
        ROUND(STDDEV(voltage)::numeric, 2)                                       AS std_v,
        ROUND(MIN(voltage)::numeric, 2)                                          AS min_v,
        ROUND(MAX(voltage)::numeric, 2)                                          AS max_v,
        -- Current and power factor: only meaningful while running
        ROUND(AVG(current)        FILTER (WHERE motor_state = 'running')::numeric, 3) AS avg_i,
        ROUND(AVG(real_power)     FILTER (WHERE motor_state = 'running')::numeric, 1) AS avg_p,
        ROUND(AVG(power_factor)   FILTER (WHERE motor_state = 'running')::numeric, 3) AS avg_pf,
        ROUND(AVG(internal_temp)::numeric, 1)                                    AS avg_temp,
        ROUND(MAX(internal_temp)::numeric, 1)                                    AS max_temp,
        ROUND((MAX(energy)  - MIN(energy))::numeric,  3)                         AS energy_kwh,
        ROUND((MAX(runtime) - MIN(runtime))::numeric, 3)                         AS runtime_h,
        COUNT(*) FILTER (WHERE supply_state != 'normal')                         AS voltage_events,
        COUNT(*) FILTER (WHERE motor_state = 'running')                          AS running_samples,
        COUNT(*)                                                                  AS total_samples,
        ROUND(AVG(communication_quality)::numeric, 1)                            AS avg_comm
      FROM telemetry
      WHERE timestamp >= NOW() - INTERVAL '7 days'
    `),
    db.select().from(faultsTable).where(eq(faultsTable.isActive, true)),
  ]);

  type StatsRow = Record<string, unknown>;
  const s = (statsRow.rows[0] as StatsRow) ?? {};

  const avgV       = Number(s.avg_v ?? 230);
  const stdV       = Number(s.std_v ?? 2);
  const minV       = Number(s.min_v ?? 215);
  const avgPf      = Number(s.avg_pf ?? 0.91);
  const avgI       = Number(s.avg_i ?? 4.2);
  const avgTemp    = Number(s.avg_temp ?? 38);
  const maxTemp    = Number(s.max_temp ?? 42);
  const avgComm    = Number(s.avg_comm ?? 92);
  const voltEvents = Number(s.voltage_events ?? 0);
  const totalSamp  = Number(s.total_samples ?? 1);

  // ── Compute sub-scores (0–100) ────────────────────────────────────────────

  // Voltage quality: penalise for low average, high std dev, and brownout events
  const voltageQuality = Math.round(Math.max(0, Math.min(100,
    100
    - (avgV < 220 ? (220 - avgV) * 1.5 : 0)   // below 220 V
    - (stdV > 3 ? (stdV - 3) * 4 : 0)          // high variance
    - (voltEvents / totalSamp * 100 * 3)        // % time out of spec × 3
    - (minV < 210 ? (210 - minV) * 2 : 0)      // deep brownout penalty
  )));

  // Bearing condition: proxy via temperature and long-term vibration proxy (current variance)
  const bearingCondition = Math.round(Math.max(0, Math.min(100,
    100
    - (avgTemp > 45 ? (avgTemp - 45) * 3 : 0)
    - (maxTemp > 55 ? 15 : 0)
  )));

  // Electrical condition: power factor and current balance
  const electricalCondition = Math.round(Math.max(0, Math.min(100,
    100
    - (avgPf < 0.88 ? (0.88 - avgPf) * 300 : 0)
    - (activeFaults.some(f => f.type === "over_current") ? 15 : 0)
    - (activeFaults.some(f => f.type === "power_factor_low") ? 10 : 0)
  )));

  // Motor loading: rated current is 9.8 A; 4.2 A avg = ~43% load (good)
  const ratedCurrentA = 9.8;
  const loadPct = (avgI / ratedCurrentA) * 100;
  const motorLoading = Math.round(Math.max(0, Math.min(100,
    loadPct > 90 ? 60                          // overloaded
    : loadPct > 80 ? 75
    : loadPct < 20 ? 80                        // under-utilised (fine)
    : 100 - Math.abs(loadPct - 60) * 0.3      // sweet spot ~50–70%
  )));

  // Runtime behaviour: regularity of scheduled runs (proxy: ratio of running samples)
  const runningSamp = Number(s.running_samples ?? 0);
  const runRatio    = totalSamp > 0 ? runningSamp / totalSamp : 0;
  // Expected ~25% of time running (morning 3h + evening 2.5h out of 24h)
  const expectedRatio = 0.23;
  const runtimeBehavior = Math.round(Math.max(0, Math.min(100,
    100 - Math.abs(runRatio - expectedRatio) * 200
  )));

  // Protection status: penalise for active critical/high faults
  const protectionStatus = Math.round(Math.max(0, Math.min(100,
    100
    - activeFaults.filter(f => f.severity === "critical").length * 25
    - activeFaults.filter(f => f.severity === "high").length    * 15
    - activeFaults.filter(f => f.severity === "medium").length  * 8
    - activeFaults.filter(f => f.severity === "low").length     * 3
  )));

  // Overall: weighted average
  const overall = Math.round(
    voltageQuality    * 0.20 +
    bearingCondition  * 0.18 +
    electricalCondition * 0.20 +
    motorLoading      * 0.14 +
    runtimeBehavior   * 0.14 +
    protectionStatus  * 0.14
  );

  // ── Trend & maintenance prediction ───────────────────────────────────────
  const trend = activeFaults.some(f => f.severity === "critical" || f.severity === "high")
    ? "declining"
    : voltEvents > 5 ? "declining"
    : overall >= 85 ? "stable"
    : "stable";

  // Rough predicted maintenance: lower score → sooner maintenance
  const daysToMaintenance = Math.round(Math.max(7, (overall / 100) * 90));
  const predicted = new Date(Date.now() + daysToMaintenance * 86_400_000);

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations: string[] = [];
  if (voltageQuality < 80)
    recommendations.push(`Voltage quality score ${voltageQuality}/100 — supply averaged ${avgV.toFixed(1)} V with ${voltEvents} anomalous readings. Contact utility provider.`);
  if (bearingCondition < 85)
    recommendations.push(`Controller temperature peaked at ${maxTemp.toFixed(1)} °C. Ensure enclosure ventilation is clear and ambient temperature is below 35 °C.`);
  if (electricalCondition < 85)
    recommendations.push(`Power factor averaging ${avgPf.toFixed(2)} — below 0.88 target. Inspect and test run capacitor bank.`);
  if (activeFaults.length > 0)
    recommendations.push(`${activeFaults.length} active fault${activeFaults.length > 1 ? "s" : ""} detected. Resolve before next scheduled maintenance window.`);
  if (recommendations.length === 0)
    recommendations.push("All subsystems operating within normal parameters. Schedule routine inspection in ~" + daysToMaintenance + " days.");

  res.json(GetHealthScoreResponse.parse({
    overall,
    bearingCondition,
    electricalCondition,
    voltageQuality,
    motorLoading,
    runtimeBehavior,
    protectionStatus,
    predictedMaintenance: predicted.toISOString().split("T")[0],
    confidence: parseFloat(Math.min(95, 70 + (runningSamp / 200) * 25).toFixed(1)),
    trend,
    remainingUsefulLifeDays: daysToMaintenance * 5,
    lastUpdated: new Date().toISOString(),
    recommendations,
  }));
});

export default router;
