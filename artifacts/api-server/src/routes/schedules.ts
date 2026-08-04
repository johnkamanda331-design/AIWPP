import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, schedulesTable } from "@workspace/db";
import {
  GetSchedulesResponse,
  CreateScheduleBody,
  CreateScheduleResponse,
  UpdateScheduleBody,
  UpdateScheduleParams,
  UpdateScheduleResponse,
  DeleteScheduleParams,
  DeleteScheduleResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function mapSchedule(s: typeof schedulesTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    startTime: s.startTime,
    endTime: s.endTime,
    days: JSON.parse(s.days) as number[],
    startDate: s.startDate ?? null,
    endDate: s.endDate ?? null,
    isActive: s.isActive,
    priority: s.priority,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/schedules", requireAuth, async (_req, res): Promise<void> => {
  const schedules = await db.select().from(schedulesTable).orderBy(schedulesTable.priority);
  res.json(GetSchedulesResponse.parse(schedules.map(mapSchedule)));
});

router.post("/schedules", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { days, ...rest } = parsed.data;
  const [schedule] = await db.insert(schedulesTable).values({
    ...rest,
    days: JSON.stringify(days ?? []),
  }).returning();

  res.status(201).json(CreateScheduleResponse.parse(mapSchedule(schedule)));
});

router.put("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const idParsed = UpdateScheduleParams.safeParse({ id: parseFloat(raw) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid schedule ID" });
    return;
  }

  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { days, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (days !== undefined) updateData.days = JSON.stringify(days);

  const [updated] = await db.update(schedulesTable)
    .set(updateData)
    .where(eq(schedulesTable.id, idParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  res.json(UpdateScheduleResponse.parse(mapSchedule(updated)));
});

router.delete("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const idParsed = DeleteScheduleParams.safeParse({ id: parseFloat(raw) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid schedule ID" });
    return;
  }

  const [deleted] = await db.delete(schedulesTable)
    .where(eq(schedulesTable.id, idParsed.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  res.json(DeleteScheduleResponse.parse({ success: true, message: "Schedule deleted" }));
});

export default router;
