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
  const rand   = (base: number, v: number) => parseFloat((base + (Math.random() - 0.5) * v).toFixed(2));

  let labels: string[];
  let points: number;

  switch (period) {
    case "daily": {
      // Last 7 days — one point per day
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return days[d.getDay()];
      });
      points = 7;
      break;
    }
    case "weekly":
      labels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];
      points = 4;
      break;
    case "monthly":
      labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      points = 12;
      break;
    default: // yearly — last 4 years
      labels = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - 3 + i));
      points = 4;
  }

  res.json(GetAnalyticsResponse.parse({
    period,
    labels,
    datasets: [
      { metric: "runtime",        label: "Runtime (hrs)",   unit: "h",   data: Array.from({ length: points }, () => rand(5.2,  2.0)) },
      { metric: "energy",         label: "Energy (kWh)",    unit: "kWh", data: Array.from({ length: points }, () => rand(3.9,  1.5)) },
      { metric: "power",          label: "Avg Power (W)",   unit: "W",   data: Array.from({ length: points }, () => rand(870,  60))  },
      { metric: "voltage",        label: "Avg Voltage (V)", unit: "V",   data: Array.from({ length: points }, () => rand(228,  5))   },
      { metric: "current",        label: "Avg Current (A)", unit: "A",   data: Array.from({ length: points }, () => rand(4.18, 0.3)) },
      { metric: "powerFactor",    label: "Power Factor",    unit: "",    data: Array.from({ length: points }, () => rand(0.91, 0.02))},
      { metric: "faults",         label: "Faults",          unit: "",    data: Array.from({ length: points }, () => Math.floor(Math.random() * 3)) },
      { metric: "healthScore",    label: "Health Score",    unit: "%",   data: Array.from({ length: points }, () => rand(87,   3))   },
    ],
  }));
});

router.get("/analytics/insights", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date().toISOString();
  res.json(GetAnalyticsInsightsResponse.parse([
    { id: 1, category: "runtime",    insight: "Runtime has increased 14% compared to last month — possibly seasonal demand.", severity: "neutral",  changePercent: 14.0,  timestamp: now },
    { id: 2, category: "efficiency", insight: "Pump efficiency appears stable. Power factor consistently above 0.90.",        severity: "positive", changePercent: null,  timestamp: now },
    { id: 3, category: "voltage",    insight: "Voltage fluctuations increased this week — 3 brownout events detected.",       severity: "warning",  changePercent: 22.0,  timestamp: now },
    { id: 4, category: "energy",     insight: "Energy consumption down 8% this week. Scheduling optimisation is working.",    severity: "positive", changePercent: -8.0,  timestamp: now },
    { id: 5, category: "health",     insight: "Health score stable at 87/100. No significant degradation detected.",          severity: "positive", changePercent: null,  timestamp: now },
    { id: 6, category: "faults",     insight: "Fault count unchanged from last month. Protection thresholds holding.",        severity: "neutral",  changePercent: 0.0,   timestamp: now },
  ]));
});

export default router;
