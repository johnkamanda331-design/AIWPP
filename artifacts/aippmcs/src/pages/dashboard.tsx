import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, Zap, Clock, ShieldAlert, Cpu, CheckCircle2, ArrowRight } from "lucide-react";
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Top Status Banner */}
      <div className={cn(
        "rounded-lg border p-4 flex items-center justify-between shadow-sm",
        summary.systemStatus === "normal" ? "bg-primary/10 border-primary/20 text-primary-foreground" :
        summary.systemStatus === "warning" ? "bg-warning/10 border-warning/30 text-warning-foreground" :
        "bg-destructive/10 border-destructive/30 text-destructive-foreground"
      )}>
        <div className="flex items-center gap-3">
          {summary.systemStatus === "normal" ? <CheckCircle2 className="text-primary w-6 h-6" /> :
           summary.systemStatus === "warning" ? <AlertTriangle className="text-warning w-6 h-6" /> :
           <AlertTriangle className="text-destructive w-6 h-6" />}
          <div>
            <h2 className="font-semibold text-foreground tracking-tight text-lg">System {summary.systemStatus.toUpperCase()}</h2>
            <p className="text-sm opacity-80 text-foreground">
              {summary.systemStatus === "normal" ? "All monitored parameters are within nominal ranges." :
               "Abnormal conditions detected. Check active faults."}
            </p>
          </div>
        </div>
        <Link href={summary.systemStatus === "normal" ? "/monitoring" : "/faults"}>
          <div className="hidden sm:flex items-center gap-1 text-sm font-medium bg-background px-3 py-1.5 rounded-full border text-foreground hover:bg-muted cursor-pointer transition-colors">
            View Details <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Status Block */}
        <Card className="col-span-1 md:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              Pump Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-inner",
                  summary.pumpState === "running" ? "bg-primary border-primary/30 text-primary-foreground" :
                  summary.pumpState === "stopped" ? "bg-muted border-border text-muted-foreground" :
                  "bg-destructive border-destructive/30 text-destructive-foreground"
                )}>
                  <Zap className={cn("w-8 h-8", summary.pumpState === "running" ? "animate-pulse" : "")} />
                </div>
                <div>
                  <div className="text-3xl font-bold tracking-tight text-foreground capitalize">
                    {summary.pumpState}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <div className={cn("w-2 h-2 rounded-full", summary.controllerOnline ? "bg-primary" : "bg-destructive")} />
                    {summary.controllerOnline ? "Controller Online" : "Controller Offline"}
                  </div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm text-muted-foreground mb-1">Health Score</div>
                <div className="text-3xl font-bold text-mono flex items-end justify-end gap-1">
                  {summary.pumpHealthScore}
                  <span className="text-lg text-muted-foreground mb-1">/100</span>
                </div>
              </div>
            </div>
            <Progress value={summary.pumpHealthScore} className={cn("h-2", 
              summary.pumpHealthScore > 80 ? "[&>div]:bg-primary" :
              summary.pumpHealthScore > 50 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
            )} />
          </CardContent>
        </Card>

        {/* Runtime & Energy */}
        <Card className="shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Today's Runtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-mono text-foreground mb-1">{summary.todayRuntime.toFixed(1)} <span className="text-lg text-muted-foreground font-sans">hrs</span></div>
            <div className="text-sm text-muted-foreground mt-4">Next Schedule</div>
            <div className="font-medium text-foreground">
              {summary.nextScheduledStart ? `Start at ${summary.nextScheduledStart}` : 'No active schedules'}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-muted-foreground" />
              Today's Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-mono text-foreground mb-1">{summary.todayEnergy.toFixed(1)} <span className="text-lg text-muted-foreground font-sans">kWh</span></div>
            <div className="text-sm text-muted-foreground mt-4">Estimated Cost</div>
            <div className="font-medium text-mono text-foreground">${summary.todayCost.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning & AI Status */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="w-5 h-5 text-muted-foreground" />
              Adaptive Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <Badge variant={summary.learningStatus === "confident" ? "default" : "secondary"} className="capitalize">
                    {summary.learningStatus.replace("_", " ")}
                  </Badge>
                </div>
                {summary.learningConfidence !== undefined && (
                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-mono text-foreground">{summary.learningConfidence}%</span>
                    </div>
                    <Progress value={summary.learningConfidence} className="h-1.5" />
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground mb-2">Controller Environment</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/50 rounded p-2">
                    <div className="text-xs text-muted-foreground">Internal Temp</div>
                    <div className="font-mono font-medium text-foreground">{summary.controllerTemp}°C</div>
                  </div>
                  <div className="bg-secondary/50 rounded p-2">
                    <div className="text-xs text-muted-foreground">WiFi Signal</div>
                    <div className="font-mono font-medium text-foreground">{summary.wifiSignal} dBm</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-muted-foreground" />
              Recent Events
            </CardTitle>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1">
            {summary.recentEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                <p>No recent events</p>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.recentEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="flex gap-3 items-start">
                    <div className={cn(
                      "mt-0.5 w-2 h-2 rounded-full shrink-0",
                      event.severity === "critical" ? "bg-destructive" :
                      event.severity === "high" ? "bg-destructive/80" :
                      event.severity === "medium" ? "bg-warning" : "bg-info"
                    )} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground leading-none">{event.description}</p>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.type}</p>
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
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-40 col-span-1 md:col-span-2" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
    </div>
  );
}
