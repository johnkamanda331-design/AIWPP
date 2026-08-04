import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  Zap,
  Clock,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Wifi,
  Thermometer,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: ['/api/dashboard/summary'],
      refetchInterval: 5000,
    }
  });

  if (isLoading) return <DashboardSkeleton />;
  if (!summary) return null;

  const isNormal = summary.systemStatus === "normal";
  const isCritical = summary.systemStatus === "critical";
  const isWarning = summary.systemStatus === "warning";

  const healthColor =
    summary.pumpHealthScore > 80 ? "text-primary" :
    summary.pumpHealthScore > 50 ? "text-warning" : "text-destructive";

  const healthBarClass =
    summary.pumpHealthScore > 80 ? "[&>div]:bg-primary" :
    summary.pumpHealthScore > 50 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive";

  return (
    <div className="space-y-5">

      {/* System Status Banner */}
      <div className={cn(
        "flex items-center justify-between px-5 py-3.5 rounded-lg border",
        isNormal
          ? "bg-primary/5 border-primary/20"
          : isWarning
          ? "bg-warning/8 border-warning/25"
          : "bg-destructive/8 border-destructive/25"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isNormal ? "bg-primary animate-pulse" :
            isWarning ? "bg-warning animate-pulse" : "bg-destructive animate-pulse"
          )} />
          <div>
            <span className={cn(
              "text-sm font-semibold tracking-wide uppercase",
              isNormal ? "text-primary" : isWarning ? "text-warning" : "text-destructive"
            )}>
              System {summary.systemStatus}
            </span>
            <span className="text-sm text-muted-foreground ml-3">
              {isNormal
                ? "All parameters within nominal ranges."
                : "Abnormal conditions detected — review active faults."}
            </span>
          </div>
        </div>
        <Link href={isNormal ? "/monitoring" : "/faults"}>
          <button className={cn(
            "hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border transition-colors",
            isNormal
              ? "text-primary border-primary/20 hover:bg-primary/8"
              : isWarning
              ? "text-warning border-warning/20 hover:bg-warning/8"
              : "text-destructive border-destructive/20 hover:bg-destructive/8"
          )}>
            View Details <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Pump State */}
        <Card className="col-span-1 md:col-span-2 shadow-xs border-border/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pump State</div>
                <div className={cn(
                  "text-3xl font-bold tracking-tight capitalize",
                  summary.pumpState === "running" ? "text-primary" :
                  summary.pumpState === "fault" ? "text-destructive" : "text-foreground"
                )}>
                  {summary.pumpState}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    summary.controllerOnline ? "bg-primary" : "bg-destructive"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    Controller {summary.controllerOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Health Score</div>
                <div className={cn("text-3xl font-bold font-mono", healthColor)}>
                  {summary.pumpHealthScore}
                  <span className="text-base text-muted-foreground font-sans">/100</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>System Health</span>
                <span className={cn("font-mono", healthColor)}>{summary.pumpHealthScore}%</span>
              </div>
              <Progress value={summary.pumpHealthScore} className={cn("h-1.5", healthBarClass)} />
            </div>
          </CardContent>
        </Card>

        {/* Runtime */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Runtime</div>
              <Clock className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="text-3xl font-bold font-mono text-foreground">
              {summary.todayRuntime.toFixed(1)}
              <span className="text-base text-muted-foreground font-sans ml-1">hrs</span>
            </div>
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="text-xs text-muted-foreground mb-0.5">Next Schedule</div>
              <div className="text-sm font-medium text-foreground truncate">
                {summary.nextScheduledStart ? `Start at ${summary.nextScheduledStart}` : "No active schedules"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Energy */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Energy</div>
              <Zap className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <div className="text-3xl font-bold font-mono text-foreground">
              {summary.todayEnergy.toFixed(1)}
              <span className="text-base text-muted-foreground font-sans ml-1">kWh</span>
            </div>
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="text-xs text-muted-foreground mb-0.5">Estimated Cost</div>
              <div className="text-sm font-bold font-mono text-foreground">${summary.todayCost.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Adaptive Learning */}
        <Card className="shadow-xs border-border/60">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              Adaptive Learning
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={summary.learningStatus === "confident" ? "default" : "secondary"}
                className="capitalize text-xs"
              >
                {summary.learningStatus.replace("_", " ")}
              </Badge>
            </div>

            {summary.learningConfidence !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono text-foreground">{summary.learningConfidence}%</span>
                </div>
                <Progress value={summary.learningConfidence} className="h-1" />
              </div>
            )}

            <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-2">
              <div className="rounded-md bg-secondary/60 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Thermometer className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Internal Temp</span>
                </div>
                <div className="font-mono font-semibold text-foreground text-sm">{summary.controllerTemp}°C</div>
              </div>
              <div className="rounded-md bg-secondary/60 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wifi className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">WiFi Signal</span>
                </div>
                <div className="font-mono font-semibold text-foreground text-sm">{summary.wifiSignal} dBm</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="col-span-1 lg:col-span-2 shadow-xs border-border/60 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Recent Events
            </CardTitle>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1 px-5 pb-5">
            {summary.recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No recent events</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {summary.recentEvents.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="flex gap-3 items-start py-3 first:pt-0 last:pb-0">
                    <div className={cn(
                      "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                      event.severity === "critical" ? "bg-destructive" :
                      event.severity === "high" ? "bg-destructive/70" :
                      event.severity === "medium" ? "bg-warning" : "bg-info"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground leading-snug">{event.description}</p>
                        <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{event.type.replace("_", " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-36 col-span-1 md:col-span-2" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-56 lg:col-span-2" />
      </div>
    </div>
  );
}
