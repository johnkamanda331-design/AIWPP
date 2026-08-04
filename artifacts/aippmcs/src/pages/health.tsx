import { useGetHealthScore } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ShieldAlert, Zap, Cpu, Settings, Calendar, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function HealthScore() {
  const { data: health, isLoading } = useGetHealthScore();

  if (isLoading) return <HealthSkeleton />;
  if (!health) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-factor diagnostic assessment of pump and controller condition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm border-t-4 border-t-primary flex flex-col items-center justify-center p-8">
          <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Overall Health</div>
          
          <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-8 border-muted">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle 
                cx="50%" cy="50%" r="46%" 
                fill="none" stroke="currentColor" strokeWidth="8%" 
                className={cn(
                  health.overall >= 80 ? "text-primary" : 
                  health.overall >= 60 ? "text-warning" : "text-destructive"
                )}
                strokeDasharray={`${health.overall * 2.89} 300`} 
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-bold text-mono tracking-tighter">{health.overall}</span>
              <span className="text-sm text-muted-foreground mt-1">/ 100</span>
            </div>
          </div>
          
          <div className="mt-8 text-center space-y-1 w-full">
            <div className="flex justify-between text-sm px-4 py-2 bg-secondary rounded-md">
              <span className="text-muted-foreground">Confidence Level</span>
              <span className="font-mono font-medium">{health.confidence}%</span>
            </div>
            {health.remainingUsefulLifeDays && (
              <div className="flex justify-between text-sm px-4 py-2 bg-secondary rounded-md">
                <span className="text-muted-foreground">Est. Life Remaining</span>
                <span className="font-mono font-medium">{health.remainingUsefulLifeDays} days</span>
              </div>
            )}
          </div>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Component Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <HealthBar label="Electrical Condition" score={health.electricalCondition} icon={Zap} />
              <HealthBar label="Voltage Quality" score={health.voltageQuality} icon={Activity} />
              <HealthBar label="Bearing Condition (Est)" score={health.bearingCondition} icon={Settings} />
              <HealthBar label="Motor Loading" score={health.motorLoading} icon={Cpu} />
              <HealthBar label="Runtime Behavior" score={health.runtimeBehavior} icon={Calendar} />
              <HealthBar label="Protection Status" score={health.protectionStatus} icon={ShieldAlert} />
            </CardContent>
          </Card>
          
          {health.recommendations && health.recommendations.length > 0 && (
            <Card className="shadow-sm border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-warning flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Maintenance Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {health.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm items-start">
                      <ArrowRight className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, score, icon: Icon }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </div>
        <span className="font-mono text-sm font-bold">{score}/100</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all", 
            score >= 80 ? "bg-primary" : 
            score >= 60 ? "bg-warning" : "bg-destructive"
          )} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-16 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-[400px] md:col-span-1" />
        <Skeleton className="h-[400px] md:col-span-2" />
      </div>
    </div>
  );
}
