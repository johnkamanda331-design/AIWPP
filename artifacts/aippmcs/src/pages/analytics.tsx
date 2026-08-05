import { useState } from "react";
import { useGetAnalytics, useGetAnalyticsInsights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Area, AreaChart, Bar, BarChart,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Period = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "daily",   label: "Per Day — Last 7 days"   },
  { value: "weekly",  label: "Per Week — Last 4 weeks" },
  { value: "monthly", label: "Per Month — Last year"   },
  { value: "yearly",  label: "Yearly"                  },
];

const PERIOD_UNIT: Record<Period, string> = {
  daily:   "day",
  weekly:  "week",
  monthly: "month",
  yearly:  "year",
};

export default function Analytics() {
  const [energyPeriod,  setEnergyPeriod]  = useState<Period>("monthly");
  const [runtimePeriod, setRuntimePeriod] = useState<Period>("monthly");

  const { data: energyData,  isLoading: energyLoading  } = useGetAnalytics(
    { period: energyPeriod,  metric: "energy"  },
    { query: { queryKey: ["analytics", energyPeriod,  "energy"]  } },
  );
  const { data: runtimeData, isLoading: runtimeLoading } = useGetAnalytics(
    { period: runtimePeriod, metric: "runtime" },
    { query: { queryKey: ["analytics", runtimePeriod, "runtime"] } },
  );
  const { data: insights } = useGetAnalyticsInsights();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Historical trends and operational insights.</p>
      </div>

      {/* ── Engineering Insights ─────────────────────────────────────────── */}
      {insights && insights.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader className="pb-2 pt-4 sm:pt-5 px-4 sm:px-5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-primary">
              <Lightbulb className="w-5 h-5" /> Engineering Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {insights.map(insight => (
                <div
                  key={insight.id}
                  className="bg-background rounded-md p-3 sm:p-4 border shadow-sm flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {insight.category}
                    </span>
                    {insight.changePercent != null && (
                      <span className={cn(
                        "text-xs font-mono font-medium flex items-center gap-1 shrink-0",
                        insight.severity === "positive" ? "text-primary" :
                        insight.severity === "critical" ||
                        insight.severity === "warning"  ? "text-destructive" : "text-muted-foreground",
                      )}>
                        {insight.changePercent > 0
                          ? <TrendingUp  className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(insight.changePercent)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-snug">{insight.insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

        {/* Energy Consumption */}
        <Card className="shadow-sm">
          <CardHeader className="pt-4 sm:pt-5 px-4 sm:px-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base sm:text-lg">Energy Consumption</CardTitle>
                <CardDescription>kWh per {PERIOD_UNIT[energyPeriod]}</CardDescription>
              </div>
              <PeriodSelect value={energyPeriod} onChange={setEnergyPeriod} />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-4 sm:pb-5">
            {energyLoading ? <Skeleton className="h-[260px] sm:h-[300px] w-full" /> : (
              <div className="h-[260px] sm:h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatChartData(energyData)}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" vertical={false}
                      stroke="var(--color-border)" opacity={0.5}
                    />
                    <XAxis
                      dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <YAxis
                      axisLine={false} tickLine={false} width={36}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor:     "var(--color-border)",
                        borderRadius:    "8px",
                        fontSize:        "12px",
                      }}
                      formatter={(val: number) => [`${val.toFixed(2)} kWh`, "Energy"]}
                    />
                    <Bar
                      dataKey="value" fill="var(--color-primary)"
                      radius={[4, 4, 0, 0]} maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pump Runtime */}
        <Card className="shadow-sm">
          <CardHeader className="pt-4 sm:pt-5 px-4 sm:px-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base sm:text-lg">Pump Runtime</CardTitle>
                <CardDescription>Operating hours per {PERIOD_UNIT[runtimePeriod]}</CardDescription>
              </div>
              <PeriodSelect value={runtimePeriod} onChange={setRuntimePeriod} />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-4 sm:pb-5">
            {runtimeLoading ? <Skeleton className="h-[260px] sm:h-[300px] w-full" /> : (
              <div className="h-[260px] sm:h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={formatChartData(runtimeData)}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRuntime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--color-chart-4)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-4)" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3" vertical={false}
                      stroke="var(--color-border)" opacity={0.5}
                    />
                    <XAxis
                      dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <YAxis
                      axisLine={false} tickLine={false} width={36}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor:     "var(--color-border)",
                        borderRadius:    "8px",
                        fontSize:        "12px",
                      }}
                      formatter={(val: number) => [`${val.toFixed(2)} hrs`, "Runtime"]}
                    />
                    <Area
                      type="monotone" dataKey="value"
                      stroke="var(--color-chart-4)" strokeWidth={2.5}
                      fillOpacity={1} fill="url(#colorRuntime)" dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PeriodSelect({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as Period)}>
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map(o => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatChartData(data: any) {
  if (!data?.labels || !data?.datasets?.length) return [];
  return data.labels.map((label: string, i: number) => ({
    label,
    value: data.datasets[0].data[i] ?? 0,
  }));
}
