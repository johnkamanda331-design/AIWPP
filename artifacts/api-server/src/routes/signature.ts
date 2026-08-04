import { Router, type IRouter } from "express";
import { GetElectricalSignatureResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/signature", requireAuth, async (_req, res): Promise<void> => {
  // Generate realistic startup and shutdown profiles
  const startupProfile = Array.from({ length: 30 }, (_, i) => ({
    timeOffset: parseFloat((i * 0.1).toFixed(1)),
    current: parseFloat((i < 5 ? 4.2 + (11.2 - 4.2) * (i / 5) : 11.2 - (11.2 - 4.2) * ((i - 5) / 25)).toFixed(2)),
    power: parseFloat((i < 5 ? 869 + (2300 - 869) * (i / 5) : 2300 - (2300 - 869) * ((i - 5) / 25)).toFixed(1)),
  }));

  const shutdownProfile = Array.from({ length: 20 }, (_, i) => ({
    timeOffset: parseFloat((i * 0.1).toFixed(1)),
    current: parseFloat((4.18 * Math.exp(-i * 0.15)).toFixed(2)),
    power: parseFloat((869 * Math.exp(-i * 0.15)).toFixed(1)),
  }));

  // Trend comparison over last 7 days
  const now = Date.now();
  const trendComparison = Array.from({ length: 48 }, (_, i) => ({
    timestamp: new Date(now - (47 - i) * 3 * 60 * 60 * 1000).toISOString(),
    historical: parseFloat((4.18 + Math.sin(i / 8) * 0.1).toFixed(2)),
    current: parseFloat((4.18 + Math.sin(i / 8) * 0.1 + (Math.random() - 0.5) * 0.05).toFixed(2)),
  }));

  res.json(GetElectricalSignatureResponse.parse({
    normalRunningRegion: {
      minCurrent: 3.85,
      maxCurrent: 4.65,
      minPower: 810.0,
      maxPower: 980.0,
      minVoltage: 218.0,
      maxVoltage: 240.0,
    },
    currentReading: {
      current: 4.22,
      power: 872.5,
      voltage: 228.8,
      powerFactor: 0.912,
    },
    deviation: 0.8,
    confidenceLevel: 96.2,
    similarityScore: 98.4,
    startupProfile,
    shutdownProfile,
    trendComparison,
  }));
});

export default router;
