import { useGetLearningStatus, usePerformLearningAction } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, Lock, Unlock, RefreshCw, Info, Activity, Clock, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Learning() {
  const { data: status, isLoading, refetch } = useGetLearningStatus();
  const performAction = usePerformLearningAction();
  const { toast } = useToast();

  const handleAction = async (action: any) => {
    try {
      await performAction.mutateAsync({ data: { action } });
      toast({ title: "Action Successful", description: `Learning ${action} applied.` });
      refetch();
    } catch (err) {
      toast({ title: "Action Failed", variant: "destructive" });
    }
  };

  if (isLoading) return <LearningSkeleton />;
  if (!status) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adaptive Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">The controller learns the unique electrical signature of this specific pump installation.</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-md border font-medium text-sm capitalize flex items-center gap-2",
          status.status === 'learning' ? "bg-primary/10 border-primary/30 text-primary-foreground" :
          status.status === 'frozen' ? "bg-muted border-border text-muted-foreground" :
          "bg-secondary border-border text-foreground"
        )}>
          {status.status === 'learning' && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
          {status.status === 'frozen' && <Lock className="w-4 h-4" />}
          State: {status.status.replace('_', ' ')}
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <div className="bg-sidebar p-6 text-sidebar-foreground flex flex-col md:flex-row items-center gap-8 border-b border-sidebar-border">
          <div className="w-24 h-24 rounded-full bg-sidebar-accent border-4 border-sidebar-border flex items-center justify-center shrink-0">
            <BrainCircuit className={cn("w-10 h-10", status.status === 'learning' ? "text-primary animate-pulse" : "text-sidebar-foreground opacity-50")} />
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold tracking-wide uppercase opacity-80">Model Confidence</span>
                <span className="font-mono font-bold text-lg">{status.confidence}%</span>
              </div>
              <Progress value={status.confidence} className="h-3 [&>div]:bg-primary bg-sidebar-accent" />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex flex-col">
                <span className="opacity-60 text-xs uppercase tracking-wider">Cycles Learned</span>
                <span className="font-mono text-lg font-medium">{status.cycles}</span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-60 text-xs uppercase tracking-wider">Baseline Status</span>
                <span className="font-medium text-lg capitalize">{status.baselineCreated ? "Established" : "Pending"}</span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-60 text-xs uppercase tracking-wider">Model Version</span>
                <span className="font-mono text-lg font-medium">{status.currentModel}</span>
              </div>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Learned Operating Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProfileStat label="Nominal Voltage" value={status.operatingProfile.nominalVoltage} unit="V" icon={Zap} />
            <ProfileStat label="Nominal Current" value={status.operatingProfile.nominalCurrent} unit="A" icon={Activity} />
            <ProfileStat label="Nominal Power" value={(status.operatingProfile.nominalPower / 1000).toFixed(2)} unit="kW" icon={Activity} />
            <ProfileStat label="Startup Time" value={status.operatingProfile.startupDuration} unit="sec" icon={Clock} />
          </div>
        </CardContent>
        
        <CardFooter className="p-6 bg-muted/20 border-t flex gap-4 flex-wrap">
          {status.status === 'frozen' ? (
            <Button onClick={() => handleAction('unfreeze')} variant="outline" className="gap-2">
              <Unlock className="w-4 h-4" /> Unfreeze Learning
            </Button>
          ) : (
            <Button onClick={() => handleAction('freeze')} variant="secondary" className="gap-2">
              <Lock className="w-4 h-4" /> Freeze Baseline
            </Button>
          )}
          <Button onClick={() => handleAction('restart')} variant="destructive" className="gap-2 ml-auto">
            <RefreshCw className="w-4 h-4" /> Reset Model
          </Button>
        </CardFooter>
      </Card>

      <div className="bg-info/10 border border-info/30 rounded-md p-4 flex gap-3 text-info-foreground text-sm">
        <Info className="w-5 h-5 shrink-0 text-info" />
        <div className="space-y-2">
          <p><strong>How Adaptive Learning Works:</strong> The controller continuously monitors the pump during startup, running, and shutdown phases. Over multiple cycles, it builds a statistical baseline of normal operation.</p>
          <p>Once confidence reaches 80%, the controller automatically enables tighter protection thresholds based on this exact pump's signature, rather than generic factory defaults.</p>
          <p><em>Freeze the model</em> if the pump is operating perfectly and you don't want the baseline to shift over time due to gradual wear.</p>
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value, unit, icon: Icon }: any) {
  return (
    <div className="bg-secondary/50 rounded-lg p-4 border border-border">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-foreground">
        {value} <span className="text-sm font-sans text-muted-foreground font-normal">{unit}</span>
      </div>
    </div>
  );
}

function LearningSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-16 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
