import { useGetEnergyData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, BatteryCharging, TrendingDown, Lightbulb, Banknote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { calcEPRACostKSh, formatKSh, EPRA_RATE_KSH_PER_KWH } from "@/lib/epra-tariff";

export default function Energy() {
  const { data: energy, isLoading } = useGetEnergyData({ period: "month" }, { query: { queryKey: ["energy", "month"] } });

  if (isLoading) return <EnergySkeleton />;
  if (!energy) return null;

  const costKSh          = calcEPRACostKSh(energy.totalConsumption);
  const projectedKSh     = calcEPRACostKSh(energy.projectedMonthly);
  const dailyWithCost    = energy.dailyBreakdown.map((d: any) => ({
    ...d,
    costKSh: calcEPRACostKSh(d.consumption),
  }));

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Energy Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track power consumption and estimated costs per EPRA Schedule of Tariffs (Kenya).</p>
      </div>

      {/* EPRA Tariff Note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
        <Banknote className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <span>
          Costs calculated at <strong className="text-foreground">KSh {EPRA_RATE_KSH_PER_KWH}/kWh</strong> — EPRA 2024 SC-11 tariff (energy charge + FCC + FERFA + IAF + levies + VAT 16%).
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Consumption"
          value={energy.totalConsumption.toFixed(1)}
          unit="kWh"
          icon={Zap}
          subtitle="This Month"
        />
        <MetricCard
          title="Estimated Cost"
          value={formatKSh(costKSh, 0)}
          unit=""
          icon={Banknote}
          subtitle="This Month (EPRA tariff)"
          highlight
        />
        <MetricCard
          title="Projected Bill"
          value={formatKSh(projectedKSh, 0)}
          unit=""
          icon={TrendingDown}
          subtitle="End of Month"
        />
        <MetricCard
          title="Peak Demand"
          value={energy.peakUsage.toFixed(2)}
          unit="kW"
          icon={BatteryCharging}
          subtitle="Highest recorded load"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Daily Consumption Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pt-4 sm:pt-5 px-4 sm:px-5">
            <CardTitle className="text-base sm:text-lg">Daily Consumption</CardTitle>
            <CardDescription>kWh per day — cost in KSh</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-4 sm:pb-5">
            <div className="h-[260px] sm:h-[300px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyWithCost} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.substring(5, 10)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} width={36} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(val: number, name: string) => {
                      if (name === "consumption") return [`${val.toFixed(2)} kWh`, "Energy"];
                      return [formatKSh(val, 0), "Est. Cost"];
                    }}
                  />
                  <Bar dataKey="consumption" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} name="consumption" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Savings Opportunities */}
        <Card className="shadow-sm border-info/30 bg-info/5">
          <CardHeader className="pt-4 sm:pt-5 px-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-info text-base sm:text-lg">
              <Lightbulb className="w-5 h-5" /> Savings Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
            <ul className="space-y-3">
              {energy.suggestions.map((sug: string, i: number) => (
                <li key={i} className="text-sm font-medium text-foreground bg-background rounded p-3 border shadow-sm leading-snug">
                  {sug}
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-info/20">
              <div className="text-xs text-muted-foreground mb-1">Idle Consumption</div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                {energy.idleConsumption.toFixed(2)}
                <span className="text-sm font-sans font-normal text-muted-foreground ml-1">kWh/day</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ≈ {formatKSh(calcEPRACostKSh(energy.idleConsumption))}/day idle cost
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon: Icon, subtitle, highlight }: any) {
  return (
    <Card className={`shadow-sm relative overflow-hidden ${highlight ? "border-primary/30" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{title}</div>
          <Icon className={`w-4 h-4 shrink-0 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${highlight ? "text-primary" : "text-foreground"} break-all`}>
          {value}
          {unit && <span className="text-base text-muted-foreground font-sans ml-1">{unit}</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function EnergySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[360px] lg:col-span-2" />
        <Skeleton className="h-[360px]" />
      </div>
    </div>
  );
}
