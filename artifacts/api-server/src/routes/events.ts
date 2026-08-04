import { Router, type IRouter } from "express";
import { desc, like, and, gte, lte, SQL } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { GetEventsResponse, GetEventsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/events", requireAuth, async (req, res): Promise<void> => {
  const params = GetEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { severity, type, from, to, search, limit = 100, offset = 0 } = params.data;

  const conditions: SQL[] = [];
  if (severity) conditions.push(like(eventsTable.severity, severity));
  if (type) conditions.push(like(eventsTable.type, type));
  if (from) conditions.push(gte(eventsTable.timestamp, new Date(from)));
  if (to) conditions.push(lte(eventsTable.timestamp, new Date(to)));
  if (search) conditions.push(like(eventsTable.description, `%${search}%`));

  const allEvents = await db.select()
    .from(eventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(eventsTable.timestamp));

  const total = allEvents.length;
  const paged = allEvents.slice(offset, offset + limit);

  res.json(GetEventsResponse.parse({
    events: paged.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      timestamp: e.timestamp.toISOString(),
      severity: e.severity,
      details: e.details ?? null,
    })),
    total,
    offset,
    limit,
  }));
});

export default router;
