import { Router, type IRouter } from "express";
import { GetEnergyDataResponse, GetEnergyDataQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/energy", requireAuth, async (req, res): Promise<void> => {
  const params = GetEnergyDataQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const period = params.data.period ?? "month";
  const days = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;

  const totalConsumption = parseFloat((days * 3.92 * (1 + (Math.random() - 0.5) * 0.1)).toFixed(2));
  const electricityRate = 0.18;
  const estimatedCost = parseFloat((totalConsumption * electricityRate).toFixed(2));

  const dailyBreakdown = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000);
    const consumption = parseFloat((3.92 + (Math.random() - 0.5) * 1.2).toFixed(3));
    return {
      date: date.toISOString().split("T")[0],
      consumption,
      cost: parseFloat((consumption * electricityRate).toFixed(2)),
      runtime: parseFloat((consumption / 0.87).toFixed(2)),
    };
  });

  res.json(GetEnergyDataResponse.parse({
    period,
    totalConsumption,
    estimatedCost,
    projectedMonthly: parseFloat((30 * 3.92 * electricityRate).toFixed(2)),
    peakUsage: 1.12,
    idleConsumption: parseFloat((totalConsumption * 0.03).toFixed(3)),
    dailyBreakdown,
    suggestions: [
      "Consider scheduling pump operation during off-peak tariff hours (10pm-6am) to reduce costs by up to 23%.",
      "Current idle power draw of 38W indicates the controller is running continuously. Consider scheduled sleep mode.",
      "Peak demand of 1.12 kW could be reduced by staggering pump starts to avoid simultaneous startups.",
    ],
  }));
});

export default router;
