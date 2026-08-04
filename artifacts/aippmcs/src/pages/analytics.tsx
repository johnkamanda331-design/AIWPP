import { useState } from "react";
import { useGetAnalytics, useGetAnalyticsInsights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, Lightbulb, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function Analytics() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  
  const { data: energyData, isLoading: energyLoading } = useGetAnalytics({ period, metric: 'energy' }, { query: { queryKey: ["analytics", period, "energy"] } });
  const { data: runtimeData, isLoading: runtimeLoading } = useGetAnalytics({ period, metric: 'runtime' }, { query: { queryKey: ["analytics", period, "runtime"] } });
  const { data: insights, isLoading: insightsLoading } = useGetAnalyticsInsights();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Historical trends and AI-generated operational insights.</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily (Last 7 days)</SelectItem>
            <SelectItem value="weekly">Weekly (Last 4 weeks)</SelectItem>
            <SelectItem value="monthly">Monthly (Last 12 mos)</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {insights && insights.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Lightbulb className="w-5 h-5" /> Engineering Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map(insight => (
                <div key={insight.id} className="bg-background rounded-md p-4 border shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{insight.category}</span>
                    {insight.changePercent && (
                      <span className={cn(
                        "text-xs font-mono font-medium flex items-center gap-1",
                        insight.severity === 'positive' ? "text-primary" : 
                        insight.severity === 'critical' || insight.severity === 'warning' ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {insight.changePercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(insight.changePercent)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium">{insight.insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Energy Consumption</CardTitle>
            <CardDescription>kWh per {period.replace('ly', '')}</CardDescription>
          </CardHeader>
          <CardContent>
            {energyLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatChartData(energyData)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} tickFormatter={(val) => `${val}`} />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Pump Runtime</CardTitle>
            <CardDescription>Operating hours per {period.replace('ly', '')}</CardDescription>
          </CardHeader>
          <CardContent>
            {runtimeLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatChartData(runtimeData)}>
                    <defs>
                      <linearGradient id="colorRuntime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-4)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-chart-4)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--color-chart-4)" strokeWidth={3} fillOpacity={1} fill="url(#colorRuntime)" />
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

// Helper to map API AnalyticsData format to Recharts format
function formatChartData(data: any) {
  if (!data || !data.labels || !data.datasets || data.datasets.length === 0) return [];
  return data.labels.map((label: string, index: number) => ({
    label,
    value: data.datasets[0].data[index]
  }));
}
