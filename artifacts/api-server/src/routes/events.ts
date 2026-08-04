import { Router, type IRouter } from "express";
import { desc, like, and, gte, lte, SQL, count } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { GetEventsResponse, GetEventsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { CONFIG } from "../lib/config";

const router: IRouter = Router();

router.get("/events", requireAuth, async (req, res): Promise<void> => {
  const params = GetEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { severity, type, from, to, search } = params.data;
  const limit = Math.min(Number(params.data.limit ?? CONFIG.PAGINATION.DEFAULT_LIMIT), CONFIG.PAGINATION.MAX_LIMIT);
  const offset = Math.max(Number(params.data.offset ?? 0), 0);

  const conditions: SQL[] = [];
  if (severity) conditions.push(like(eventsTable.severity, severity));
  if (type) conditions.push(like(eventsTable.type, type));
  if (from) conditions.push(gte(eventsTable.timestamp, new Date(from)));
  if (to) conditions.push(lte(eventsTable.timestamp, new Date(to)));
  if (search) conditions.push(like(eventsTable.description, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Run count + page fetch in parallel — never loads the full table into memory
  const [countResult, paged] = await Promise.all([
    db.select({ total: count() }).from(eventsTable).where(where),
    db.select()
      .from(eventsTable)
      .where(where)
      .orderBy(desc(eventsTable.timestamp))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;

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
