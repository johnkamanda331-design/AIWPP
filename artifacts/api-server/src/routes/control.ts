import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db, controlCommandsTable, eventsTable } from "@workspace/db";
import { SendControlCommandBody, SendControlCommandResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// Commands that require technician or above
const RESTRICTED_COMMANDS = ["start", "stop", "restart", "reset_fault", "emergency_stop", "enable_auto", "enable_manual"];

router.post("/control/command", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendControlCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { action, reason } = parsed.data;
  const user = req.user!;

  // Check permissions — viewers cannot issue commands
  if (user.role === "viewer") {
    res.status(403).json({ error: "Viewers cannot issue control commands" });
    return;
  }

  // Maintenance users can only do non-destructive actions
  const dangerousActions = ["emergency_stop", "restart", "reset_fault"];
  if (user.role === "maintenance" && dangerousActions.includes(action)) {
    res.status(403).json({ error: "Insufficient permissions for this action" });
    return;
  }

  const commandId = randomUUID();

  // Log the command
  await db.insert(controlCommandsTable).values({
    commandId,
    action,
    userId: user.userId,
    status: "accepted",
    reason: reason ?? null,
  });

  // Log an event
  await db.insert(eventsTable).values({
    type: "control_command",
    description: `Command issued: ${action.replace(/_/g, " ")}`,
    severity: dangerousActions.includes(action) ? "high" : "info",
    details: reason ? `Reason: ${reason}` : null,
    timestamp: new Date(),
  });

  req.log.info({ action, commandId, userId: user.userId }, "Control command issued");

  res.json(SendControlCommandResponse.parse({
    success: true,
    commandId,
    status: "accepted",
    message: `Command '${action}' accepted and queued`,
  }));
});

export default router;
