import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  GetNotificationsResponse,
  GetNotificationsQueryParams,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const params = GetNotificationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let notifications = await db.select()
    .from(notificationsTable)
    .orderBy(notificationsTable.timestamp);

  if (params.data.unreadOnly) {
    notifications = notifications.filter(n => !n.isRead);
  }
  if (params.data.severity) {
    notifications = notifications.filter(n => n.severity === params.data.severity);
  }

  const limit = params.data.limit ?? 50;
  const result = notifications.slice(-limit).reverse().map(n => ({
    id: n.id,
    type: n.type,
    severity: n.severity,
    message: n.message,
    timestamp: n.timestamp.toISOString(),
    isRead: n.isRead,
    details: n.details ?? null,
  }));

  res.json(GetNotificationsResponse.parse(result));
});

router.put("/notifications/read-all", requireAuth, async (_req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true });
  res.json(MarkAllNotificationsReadResponse.parse({ success: true, message: "All notifications marked as read" }));
});

router.put("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = MarkNotificationReadParams.safeParse({ id: parseFloat(raw) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  const [updated] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, parsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(MarkNotificationReadResponse.parse({ success: true, message: "Marked as read" }));
});

export default router;
