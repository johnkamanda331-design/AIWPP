import { Router, type IRouter } from "express";
import { desc, eq, gte, count } from "drizzle-orm";
import { db, eventsTable, faultsTable, notificationsTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get recent events
  const recentEvents = await db.select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.timestamp))
    .limit(5);

  // Count unread notifications
  const [{ value: unreadCount }] = await db.select({ value: count() })
    .from(notificationsTable)
    .where(eq(notificationsTable.isRead, false));

  // Get active faults
  const activeFaults = await db.select().from(faultsTable).where(eq(faultsTable.isActive, true));
  const systemStatus = activeFaults.some(f => f.severity === "critical") ? "fault"
    : activeFaults.some(f => f.severity === "high") ? "warning"
    : activeFaults.length > 0 ? "warning"
    : "normal";

  // Simulated live controller data (would come from MQTT/hardware in production)
  const runtime = 4.2 + Math.random() * 0.1;
  const energy = runtime * 0.75;
  const cost = energy * 0.18;

  const now = new Date();
  const nextStart = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const nextStop = new Date(nextStart.getTime() + 4 * 60 * 60 * 1000);

  res.json(GetDashboardSummaryResponse.parse({
    pumpState: activeFaults.some(f => f.isActive && f.severity === "critical") ? "fault" : "running",
    powerAvailable: true,
    controllerOnline: true,
    internetStatus: true,
    wifiSignal: -52,
    controllerTemp: 38.5 + Math.random() * 2,
    firmwareVersion: "v2.4.1",
    lastSync: new Date().toISOString(),
    todayRuntime: parseFloat(runtime.toFixed(2)),
    todayEnergy: parseFloat(energy.toFixed(3)),
    todayCost: parseFloat(cost.toFixed(2)),
    nextScheduledStart: nextStart.toISOString(),
    nextScheduledStop: nextStop.toISOString(),
    pumpHealthScore: 87,
    learningStatus: "confident",
    learningConfidence: 96.2,
    recentEvents: recentEvents.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      timestamp: e.timestamp.toISOString(),
      severity: e.severity,
      details: e.details ?? null,
    })),
    activeNotifications: unreadCount,
    systemStatus,
  }));
});

export default router;
