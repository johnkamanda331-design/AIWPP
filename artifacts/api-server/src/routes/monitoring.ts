import { Router, type IRouter } from "express";
import { desc, gte } from "drizzle-orm";
import { db, telemetryTable } from "@workspace/db";
import { GetMonitoringHistoryResponse, GetLiveDataResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { CONFIG } from "../lib/config";

const router: IRouter = Router();

// Maps OpenAPI metric names to telemetry table column accessors
const METRIC_COLUMNS: Record<string, keyof typeof telemetryTable.$inferSelect> = {
  voltage: "voltage",
  current: "current",
  frequency: "frequency",
  realPower: "realPower",
  reactivePower: "reactivePower",
  apparentPower: "apparentPower",
  powerFactor: "powerFactor",
  energy: "energy",
  runtime: "runtime",
  internalTemp: "internalTemp",
};

// Generate simulated telemetry (would be replaced by MQTT/hardware ingestion in production)
function generateTelemetry() {
  const voltage = 228 + (Math.random() - 0.5) * 8;
  const current = 4.2 + (Math.random() - 0.5) * 0.4;
  const frequency = 49.97 + (Math.random() - 0.5) * 0.1;
  const realPower = voltage * current * 0.91;
  const powerFactor = 0.89 + Math.random() * 0.04;
  const apparentPower = realPower / powerFactor;
  const reactivePower = Math.sqrt(apparentPower ** 2 - realPower ** 2);
  const energy = 14.32 + Math.random() * 0.01;
  const runtime = 4.2 + Math.random() * 0.05;
  const internalTemp = 38.5 + Math.random() * 3;
  const commQuality = 94 + Math.floor(Math.random() * 6);

  return {
    timestamp: new Date().toISOString(),
    voltage: parseFloat(voltage.toFixed(2)),
    current: parseFloat(current.toFixed(3)),
    frequency: parseFloat(frequency.toFixed(3)),
    realPower: parseFloat(realPower.toFixed(1)),
    reactivePower: parseFloat(reactivePower.toFixed(1)),
    apparentPower: parseFloat(apparentPower.toFixed(1)),
    powerFactor: parseFloat(powerFactor.toFixed(3)),
    energy: parseFloat(energy.toFixed(4)),
    runtime: parseFloat(runtime.toFixed(3)),
    motorState: "running" as const,
    supplyState: "normal" as const,
    relayState: "closed" as const,
    internalTemp: parseFloat(internalTemp.toFixed(1)),
    communicationQuality: commQuality,
    historicalMin: { voltage: 218.4, current: 3.9, realPower: 810, powerFactor: 0.87 },
    historicalMax: { voltage: 240.1, current: 5.1, realPower: 1100, powerFactor: 0.94 },
    rollingAvg: {
      voltage: 228.3,
      current: 4.18,
      realPower: 870,
      powerFactor: 0.91,
      internalTemp: 39.2,
    },
  };
}

router.get("/monitoring/live", requireAuth, async (req, res): Promise<void> => {
  const data = generateTelemetry();

  // Persist to DB asynchronously — failure is non-fatal, never blocks the response
  db.insert(telemetryTable).values({
    timestamp: new Date(data.timestamp),
    voltage: data.voltage,
    current: data.current,
    frequency: data.frequency,
    realPower: data.realPower,
    reactivePower: data.reactivePower,
    apparentPower: data.apparentPower,
    powerFactor: data.powerFactor,
    energy: data.energy,
    runtime: data.runtime,
    internalTemp: data.internalTemp,
    communicationQuality: data.communicationQuality,
    motorState: data.motorState,
    supplyState: data.supplyState,
    relayState: data.relayState,
  }).catch((err: Error) => {
    req.log.warn({ err: err.message }, "Failed to persist telemetry snapshot");
  });

  res.json(GetLiveDataResponse.parse(data));
});

router.get("/monitoring/history", requireAuth, async (req, res): Promise<void> => {
  const metric = (req.query.metric as string) ?? "voltage";
  const limit = Math.min(
    parseInt(req.query.limit as string ?? String(CONFIG.MONITORING.HISTORY_DEFAULT_LIMIT), 10),
    CONFIG.MONITORING.HISTORY_MAX_LIMIT,
  );

  const col = METRIC_COLUMNS[metric] ?? "voltage";
  const from = new Date(Date.now() - limit * 2000); // cover up to 2 × limit seconds back

  // Try to read real persisted telemetry first
  const rows = await db.select()
    .from(telemetryTable)
    .where(gte(telemetryTable.timestamp, from))
    .orderBy(desc(telemetryTable.timestamp))
    .limit(limit);

  if (rows.length > 0) {
    const points = rows.reverse().map(r => ({
      timestamp: r.timestamp.toISOString(),
      value: Number(r[col]),
      metric,
    }));
    res.json(GetMonitoringHistoryResponse.parse(points));
    return;
  }

  // Fall back to simulation when the DB is empty (no device connected yet)
  const now = Date.now();
  const points = Array.from({ length: limit }, (_, i) => {
    const ts = new Date(now - (limit - i) * 1000);
    let value: number;
    switch (metric) {
      case "voltage":      value = parseFloat((228 + Math.sin(i / 30) * 3 + (Math.random() - 0.5) * 2).toFixed(2)); break;
      case "current":      value = parseFloat((4.2 + Math.sin(i / 20) * 0.3 + (Math.random() - 0.5) * 0.2).toFixed(3)); break;
      case "frequency":    value = parseFloat((50 + (Math.random() - 0.5) * 0.05).toFixed(3)); break;
      case "realPower":    value = parseFloat((870 + Math.sin(i / 25) * 50 + (Math.random() - 0.5) * 20).toFixed(1)); break;
      case "powerFactor":  value = parseFloat((0.91 + (Math.random() - 0.5) * 0.02).toFixed(3)); break;
      case "internalTemp": value = parseFloat((38.5 + Math.sin(i / 60) * 1.5 + (Math.random() - 0.5) * 0.5).toFixed(1)); break;
      default:             value = parseFloat((100 + Math.random() * 10).toFixed(2));
    }
    return { timestamp: ts.toISOString(), value, metric };
  });

  res.json(GetMonitoringHistoryResponse.parse(points));
});

export default router;
