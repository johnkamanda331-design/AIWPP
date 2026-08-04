import { useGetEnergyData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, DollarSign, BatteryCharging, TrendingDown, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Energy() {
  const { data: energy, isLoading } = useGetEnergyData({ query: { queryKey: ["energy", "month"] } });

  if (isLoading) return <EnergySkeleton />;
  if (!energy) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Energy Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track power consumption and estimated operating costs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Consumption" 
          value={energy.totalConsumption.toFixed(1)} 
          unit="kWh" 
          icon={Zap} 
          subtitle="This Month"
        />
        <MetricCard 
          title="Estimated Cost" 
          value={`$${energy.estimatedCost.toFixed(2)}`} 
          unit="" 
          icon={DollarSign} 
          subtitle="This Month"
        />
        <MetricCard 
          title="Projected Bill" 
          value={`$${energy.projectedMonthly.toFixed(2)}`} 
          unit="" 
          icon={TrendingDown} 
          subtitle="End of Month"
        />
        <MetricCard 
          title="Peak Demand" 
          value={energy.peakUsage.toFixed(2)} 
          unit="kW" 
          icon={BatteryCharging} 
          subtitle="Highest load recorded"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Daily Consumption</CardTitle>
            <CardDescription>kWh per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energy.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="date" tickFormatter={(val) => val.substring(5,10)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }}
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="consumption" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-info/30 bg-info/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Lightbulb className="w-5 h-5" /> Savings Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {energy.suggestions.map((sug, i) => (
                <li key={i} className="text-sm font-medium text-foreground bg-background rounded p-3 border shadow-sm">
                  {sug}
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-info/20">
              <div className="text-sm text-muted-foreground mb-1">Measured Idle Consumption</div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {energy.idleConsumption.toFixed(2)} <span className="text-sm font-sans font-normal">kWh/day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon: Icon, subtitle }: any) {
  return (
    <Card className="shadow-sm relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold text-mono tracking-tight text-foreground flex items-end gap-1">
          {value} <span className="text-lg text-muted-foreground font-sans mb-1">{unit}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function EnergySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[400px] lg:col-span-2" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
