import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, faultsTable } from "@workspace/db";
import {
  GetFaultsResponse,
  GetFaultResponse,
  GetFaultSummaryResponse,
  GetFaultsQueryParams,
  GetFaultParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/faults/summary", requireAuth, async (_req, res): Promise<void> => {
  const allFaults = await db.select().from(faultsTable);
  const active = allFaults.filter(f => f.isActive);

  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const f of active) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byType[f.type] = (byType[f.type] ?? 0) + 1;
  }

  res.json(GetFaultSummaryResponse.parse({
    totalActive: active.length,
    totalHistorical: allFaults.length,
    bySeverity,
    byType,
  }));
});

router.get("/faults", requireAuth, async (req, res): Promise<void> => {
  const params = GetFaultsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let faults = await db.select().from(faultsTable);

  if (params.data.severity) {
    faults = faults.filter(f => f.severity === params.data.severity);
  }
  if (typeof params.data.active === "boolean") {
    faults = faults.filter(f => f.isActive === params.data.active);
  }

  const limit = params.data.limit ?? 50;
  const result = faults.slice(0, limit).map(f => ({
    id: f.id,
    type: f.type,
    severity: f.severity,
    cause: f.cause,
    recommendedAction: f.recommendedAction,
    occurrences: f.occurrences,
    confidence: f.confidence,
    trend: f.trend,
    isActive: f.isActive,
    firstSeen: f.firstSeen.toISOString(),
    lastSeen: f.lastSeen.toISOString(),
    description: f.description ?? null,
  }));

  res.json(GetFaultsResponse.parse(result));
});

router.get("/faults/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetFaultParams.safeParse({ id: parseFloat(raw) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid fault ID" });
    return;
  }

  const [fault] = await db.select().from(faultsTable).where(eq(faultsTable.id, parsed.data.id));
  if (!fault) {
    res.status(404).json({ error: "Fault not found" });
    return;
  }

  res.json(GetFaultResponse.parse({
    id: fault.id,
    type: fault.type,
    severity: fault.severity,
    cause: fault.cause,
    recommendedAction: fault.recommendedAction,
    occurrences: fault.occurrences,
    confidence: fault.confidence,
    trend: fault.trend,
    isActive: fault.isActive,
    firstSeen: fault.firstSeen.toISOString(),
    lastSeen: fault.lastSeen.toISOString(),
    description: fault.description ?? null,
  }));
});

export default router;
