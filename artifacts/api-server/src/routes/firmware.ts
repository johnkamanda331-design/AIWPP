import { Router, type IRouter } from "express";
import { GetFirmwareInfoResponse, TriggerFirmwareUpdateBody, TriggerFirmwareUpdateResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

let updateInProgress = false;
let updateProgress = 0;

router.get("/firmware", requireAuth, async (_req, res): Promise<void> => {
  res.json(GetFirmwareInfoResponse.parse({
    currentVersion: "v2.4.1",
    currentDate: "2025-11-15",
    availableUpdate: "v2.5.0",
    availableUpdateDate: "2026-01-20",
    releaseNotes: "v2.5.0 Release Notes:\n• Improved adaptive learning algorithm — 15% faster baseline convergence\n• Added three-phase monitoring support (hardware optional)\n• Fixed rare brownout detection false positive under rapid voltage fluctuations\n• MQTT QoS 2 support for critical fault notifications\n• Reduced idle power consumption by 12%\n• Security: hardened TLS 1.3 only mode",
    canRollback: true,
    rollbackVersion: "v2.3.8",
    updateInProgress,
    updateProgress: updateInProgress ? updateProgress : null,
  }));
});

router.post("/firmware/update", requireAuth, async (req, res): Promise<void> => {
  const parsed = TriggerFirmwareUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (updateInProgress) {
    res.status(400).json({ error: "A firmware update is already in progress" });
    return;
  }

  updateInProgress = true;
  updateProgress = 0;

  // Simulate update progress
  const interval = setInterval(() => {
    updateProgress = Math.min(updateProgress + Math.floor(Math.random() * 15 + 5), 100);
    if (updateProgress >= 100) {
      updateInProgress = false;
      updateProgress = 0;
      clearInterval(interval);
    }
  }, 2000);

  res.json(TriggerFirmwareUpdateResponse.parse({ success: true, message: `Firmware ${parsed.data.action} initiated` }));
});

export default router;
