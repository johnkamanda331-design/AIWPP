import { Router, type IRouter } from "express";
import { GetAnalyticsResponse, GetAnalyticsInsightsResponse, GetAnalyticsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/analytics", requireAuth, async (req, res): Promise<void> => {
  const params = GetAnalyticsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const period = params.data.period ?? "weekly";

  let labels: string[];
  let points: number;

  switch (period) {
    case "daily":
      labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
      points = 24;
      break;
    case "weekly":
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      points = 7;
      break;
    case "monthly":
      labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
      points = 30;
      break;
    default: // yearly
      labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      points = 12;
  }

  const rand = (base: number, variance: number) =>
    parseFloat((base + (Math.random() - 0.5) * variance).toFixed(2));

  res.json(GetAnalyticsResponse.parse({
    period,
    labels,
    datasets: [
      { metric: "runtime", label: "Runtime (hrs)", unit: "h", data: Array.from({ length: points }, () => rand(5.2, 2)) },
      { metric: "energy", label: "Energy (kWh)", unit: "kWh", data: Array.from({ length: points }, () => rand(3.9, 1.5)) },
      { metric: "power", label: "Avg Power (W)", unit: "W", data: Array.from({ length: points }, () => rand(870, 60)) },
      { metric: "voltage", label: "Avg Voltage (V)", unit: "V", data: Array.from({ length: points }, () => rand(228, 5)) },
      { metric: "current", label: "Avg Current (A)", unit: "A", data: Array.from({ length: points }, () => rand(4.18, 0.3)) },
      { metric: "powerFactor", label: "Power Factor", unit: "", data: Array.from({ length: points }, () => rand(0.91, 0.02)) },
      { metric: "faults", label: "Faults", unit: "", data: Array.from({ length: points }, () => Math.floor(Math.random() * 3)) },
      { metric: "healthScore", label: "Health Score", unit: "%", data: Array.from({ length: points }, () => rand(87, 3)) },
    ],
  }));
});

router.get("/analytics/insights", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date().toISOString();
  res.json(GetAnalyticsInsightsResponse.parse([
    { id: 1, category: "runtime", insight: "Runtime has increased 14% compared to last month — possibly due to seasonal demand.", severity: "neutral", changePercent: 14.0, timestamp: now },
    { id: 2, category: "efficiency", insight: "Pump efficiency appears stable. Power factor consistently above 0.90 across all operating cycles.", severity: "positive", changePercent: null, timestamp: now },
    { id: 3, category: "voltage", insight: "Voltage fluctuations increased this week — 3 minor under-voltage events detected. Supply quality may be degrading.", severity: "warning", changePercent: 22.0, timestamp: now },
    { id: 4, category: "energy", insight: "Peak demand charge optimization opportunity: 68% of energy consumed occurs in peak tariff hours.", severity: "warning", changePercent: null, timestamp: now },
    { id: 5, category: "health", insight: "Health score has been stable at 87/100 for the past 2 weeks. No significant degradation detected.", severity: "positive", changePercent: 0, timestamp: now },
  ]));
});

export default router;
