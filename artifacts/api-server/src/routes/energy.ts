import { Router, type IRouter } from "express";
import { GetEnergyDataResponse, GetEnergyDataQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── EPRA 2024 SC-11 tariff (Kenya) ─────────────────────────────────────────
const BAND1_ENERGY  = 15.80;
const BAND2_ENERGY  = 15.95;
const BAND1_LIMIT   = 1500;
const TOTAL_LEVIES  = 5.58;   // FCC + FERFA + IAF + ERC + REP + WRMA
const FIXED_MONTHLY = 200;    // KSh before VAT
const VAT           = 0.16;

function epraMonthlyBill(kWh: number): number {
  const energyCharge =
    kWh <= BAND1_LIMIT
      ? kWh * BAND1_ENERGY
      : BAND1_LIMIT * BAND1_ENERGY + (kWh - BAND1_LIMIT) * BAND2_ENERGY;
  const subtotal = energyCharge + kWh * TOTAL_LEVIES + FIXED_MONTHLY;
  return parseFloat((subtotal * (1 + VAT)).toFixed(2));
}

function epraDailyCost(kWh: number): number {
  const energyCharge =
    kWh <= BAND1_LIMIT
      ? kWh * BAND1_ENERGY
      : BAND1_LIMIT * BAND1_ENERGY + (kWh - BAND1_LIMIT) * BAND2_ENERGY;
  // Prorate fixed charge over 30 days
  const subtotal = energyCharge + kWh * TOTAL_LEVIES + FIXED_MONTHLY / 30;
  return parseFloat((subtotal * (1 + VAT)).toFixed(2));
}
// ─────────────────────────────────────────────────────────────────────────────

router.get("/energy", requireAuth, async (req, res): Promise<void> => {
  const params = GetEnergyDataQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const period = params.data.period ?? "month";
  const days   = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;

  // Realistic base: ~3.92 kWh/day with ±10% noise
  const rng = (base: number, pct: number) =>
    parseFloat((base * (1 + (Math.random() - 0.5) * pct)).toFixed(3));

  const totalConsumption = parseFloat((days * rng(3.92, 0.1)).toFixed(2));

  const dailyBreakdown = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d           = new Date(Date.now() - (days - i - 1) * 86_400_000);
    const consumption = rng(3.92, 0.3);
    return {
      date:        d.toISOString().split("T")[0],
      consumption,
      cost:        epraDailyCost(consumption),
      runtime:     parseFloat((consumption / 0.87).toFixed(2)),
    };
  });

  const projectedMonthlyKwh = 30 * 3.92;

  res.json(GetEnergyDataResponse.parse({
    period,
    totalConsumption,
    estimatedCost:    epraMonthlyBill(totalConsumption),
    projectedMonthly: epraMonthlyBill(projectedMonthlyKwh),
    peakUsage:        1.12,
    idleConsumption:  parseFloat((totalConsumption * 0.03).toFixed(3)),
    dailyBreakdown,
    suggestions: [
      "Schedule pump operation during off-peak hours (22:00–06:00) — potential 18–23% cost saving under EPRA Time-of-Use conditions.",
      "Idle power draw of 38 W is continuous. Enabling scheduled sleep mode could save ~0.9 kWh/day.",
      "Monthly consumption of ~118 kWh is well within EPRA Band 1 (≤ 1 500 kWh). No tiered surcharge applies.",
    ],
  }));
});

export default router;
