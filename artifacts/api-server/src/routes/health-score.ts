import { Router, type IRouter } from "express";
import { GetHealthScoreResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/health-score", requireAuth, async (_req, res): Promise<void> => {
  const predicted = new Date(Date.now() + 47 * 24 * 60 * 60 * 1000);

  res.json(GetHealthScoreResponse.parse({
    overall: 87,
    bearingCondition: 82,
    electricalCondition: 91,
    voltageQuality: 78,
    motorLoading: 88,
    runtimeBehavior: 93,
    protectionStatus: 95,
    predictedMaintenance: predicted.toISOString().split("T")[0],
    confidence: 91.4,
    trend: "stable",
    remainingUsefulLifeDays: 210,
    lastUpdated: new Date().toISOString(),
    recommendations: [
      "Voltage quality score of 78/100 — consider contacting utility provider about supply stability.",
      "Bearing condition trending slightly downward. Inspect motor bearings at next maintenance window.",
      "All protection thresholds operating within normal parameters.",
      "Schedule preventive maintenance inspection within 47 days as predicted.",
    ],
  }));
});

export default router;
