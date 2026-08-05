import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  controllerName: "Pump Controller 1",
  timezone: "Africa/Johannesburg",
  wifi: { ssid: "HomeNetwork", signalStrength: -52 },
  mqtt: { broker: "mqtt.local", port: 1883, enabled: true },
  protection: {
    overCurrentThreshold: 6.5,
    underVoltageThreshold: 200,
    overTempThreshold: 70,
    dryRunTimeout: 30,
    maxRuntime: 480,
  },
  relay: { startDelay: 2, stopDelay: 1 },
  learning: { enabled: true, sensitivity: "medium", minCyclesForBaseline: 50 },
  currencySymbol: "R",
  electricityRate: 0.18,
};

async function getSettingsFromDb(): Promise<typeof DEFAULT_SETTINGS> {
  const rows = await db.select().from(settingsTable);
  const settingsMap: Record<string, unknown> = {};
  for (const row of rows) {
    try { settingsMap[row.key] = JSON.parse(row.value); } catch { settingsMap[row.key] = row.value; }
  }
  return { ...DEFAULT_SETTINGS, ...settingsMap } as typeof DEFAULT_SETTINGS;
}

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getSettingsFromDb();
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings", requireAuth, requireRole("administrator"), async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = await getSettingsFromDb();
  const merged = { ...current, ...parsed.data };

  // Atomic upsert — one statement per key, no transaction needed since each
  // key is independent. Uses ON CONFLICT DO UPDATE to avoid the read-then-write race.
  await Promise.all(
    Object.entries(parsed.data).map(([key, value]) =>
      db.insert(settingsTable)
        .values({ key, value: JSON.stringify(value) })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: JSON.stringify(value) },
        })
    )
  );

  res.json(UpdateSettingsResponse.parse(merged));
});

export default router;
