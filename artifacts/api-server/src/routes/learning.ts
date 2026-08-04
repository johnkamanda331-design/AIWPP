import { Router, type IRouter } from "express";
import { GetLearningStatusResponse, PerformLearningActionBody, PerformLearningActionResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// In production this would come from the ESP32 controller's learning model data
let learningState = {
  status: "confident" as "learning" | "confident" | "frozen" | "insufficient_data",
  cycles: 342,
  confidence: 96.2,
  baselineCreated: true,
  currentModel: "v3.2 (multi-cycle adaptive baseline)",
  progressPercent: 100,
};

router.get("/learning", requireAuth, async (_req, res): Promise<void> => {
  const lastUpdated = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  res.json(GetLearningStatusResponse.parse({
    ...learningState,
    operatingProfile: {
      nominalVoltage: 228.3,
      nominalCurrent: 4.18,
      nominalPower: 869.5,
      startupDuration: 2.4,
      shutdownDuration: 1.8,
      avgRuntime: 1.35,
      startupCurrentPeak: 11.2,
    },
    lastUpdated: lastUpdated.toISOString(),
  }));
});

router.post("/learning/action", requireAuth, async (req, res): Promise<void> => {
  const parsed = PerformLearningActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { action } = parsed.data;
  switch (action) {
    case "restart":
      learningState = { status: "learning", cycles: 0, confidence: 0, baselineCreated: false, currentModel: "initializing", progressPercent: 0 };
      break;
    case "freeze":
      learningState.status = "frozen";
      break;
    case "unfreeze":
      learningState.status = "confident";
      break;
  }

  res.json(PerformLearningActionResponse.parse({ success: true, message: `Learning action '${action}' performed successfully` }));
});

export default router;
