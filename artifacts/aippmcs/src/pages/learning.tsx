import { useState } from "react";
import { useGetLearningStatus, usePerformLearningAction } from "@workspace/api-client-react";
import {
  Card, CardContent, CardHeader, CardTitle,
  CardDescription, CardFooter,
} from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrainCircuit, Lock, Unlock, RefreshCw,
  Activity, Clock, Zap, BookOpen,
  ShieldCheck, TrendingUp, AlertCircle, ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Learning() {
  const { data: status, isLoading, refetch } = useGetLearningStatus();
  const performAction = usePerformLearningAction();
  const { toast }     = useToast();
  const [activeTab, setActiveTab] = useState("status");

  const handleAction = async (action: string) => {
    try {
      await performAction.mutateAsync({ data: { action: action as any } });
      toast({ title: "Action applied", description: `Learning model: ${action}.` });
      refetch();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  if (isLoading) return <LearningSkeleton />;
  if (!status)   return null;

  const statusConfig = {
    learning:         { label: "Learning",         color: "text-primary",          bg: "bg-primary/10 border-primary/30",     icon: RefreshCw, spin: true  },
    confident:        { label: "Confident",         color: "text-primary",          bg: "bg-primary/10 border-primary/30",     icon: ShieldCheck, spin: false },
    frozen:           { label: "Frozen",            color: "text-muted-foreground", bg: "bg-muted border-border",              icon: Lock,      spin: false },
    insufficient_data:{ label: "Insufficient Data", color: "text-warning",          bg: "bg-warning/10 border-warning/30",     icon: AlertCircle, spin: false },
  } as const;

  const cfg = statusConfig[status.status as keyof typeof statusConfig] ?? statusConfig.learning;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adaptive Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The controller learns the unique electrical signature of this pump installation.
          </p>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-md border font-medium text-sm flex items-center gap-2",
          cfg.bg, cfg.color,
        )}>
          <StatusIcon className={cn("w-4 h-4", cfg.spin && "animate-spin")} />
          {cfg.label}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="status"   className="flex-1 sm:flex-none gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5" /> Model Status
          </TabsTrigger>
          <TabsTrigger value="how"      className="flex-1 sm:flex-none gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> How It Works
          </TabsTrigger>
          <TabsTrigger value="profile"  className="flex-1 sm:flex-none gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Operating Profile
          </TabsTrigger>
        </TabsList>

        {/* ── Model Status tab ─────────────────────────────────────────────── */}
        <TabsContent value="status" className="mt-4 space-y-4">
          <Card className="shadow-sm overflow-hidden">
            <div className="bg-sidebar text-sidebar-foreground p-6 flex flex-col md:flex-row items-center gap-8 border-b border-sidebar-border">
              <div className="w-24 h-24 rounded-full bg-sidebar-accent border-4 border-sidebar-border flex items-center justify-center shrink-0">
                <BrainCircuit className={cn(
                  "w-10 h-10",
                  status.status === "learning" ? "text-primary animate-pulse" : "text-sidebar-foreground opacity-50",
                )} />
              </div>
              <div className="flex-1 w-full space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold tracking-wide uppercase opacity-80">
                      Model Confidence
                    </span>
                    <span className="font-mono font-bold text-lg">{status.confidence}%</span>
                  </div>
                  <Progress
                    value={status.confidence}
                    className="h-3 [&>div]:bg-primary bg-sidebar-accent"
                  />
                  <p className="text-xs opacity-60 mt-1">
                    {status.confidence >= 80
                      ? "High confidence — adaptive protection thresholds enabled"
                      : status.confidence >= 50
                        ? "Moderate confidence — learning from additional cycles"
                        : "Establishing baseline — continue normal pump operation"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <StatPill label="Cycles Learned"    value={String(status.cycles)} />
                  <StatPill label="Baseline"          value={status.baselineCreated ? "Established" : "Pending"} />
                  <StatPill label="Model Version"     value={status.currentModel} mono />
                </div>
              </div>
            </div>

            <CardFooter className="p-5 bg-muted/20 border-t flex gap-3 flex-wrap">
              {status.status === "frozen" ? (
                <Button onClick={() => handleAction("unfreeze")} variant="outline" className="gap-2">
                  <Unlock className="w-4 h-4" /> Unfreeze Learning
                </Button>
              ) : (
                <Button onClick={() => handleAction("freeze")} variant="secondary" className="gap-2">
                  <Lock className="w-4 h-4" /> Freeze Baseline
                </Button>
              )}
              <Button
                onClick={() => handleAction("restart")}
                variant="destructive"
                className="gap-2 ml-auto"
              >
                <RefreshCw className="w-4 h-4" /> Reset Model
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── How It Works tab ─────────────────────────────────────────────── */}
        <TabsContent value="how" className="mt-4">
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 border-b border-primary/15 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base text-primary">How Adaptive Learning Works</CardTitle>
                  <CardDescription className="text-primary/70 text-xs mt-0.5">
                    The controller builds a unique electrical fingerprint of your specific pump.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {HOW_IT_WORKS_STEPS.map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-4 px-5 py-4 border-b border-border last:border-0",
                    "hover:bg-muted/30 transition-colors",
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{step.title}</div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="px-5 py-4 bg-muted/20 border-t flex items-start gap-3 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 shrink-0 text-primary mt-0.5" />
              <p>
                <strong className="text-foreground">Freeze the model</strong> once your pump is operating
                at its best and you want the baseline to remain fixed — useful after a new installation
                or overhaul when you know the operating conditions are ideal.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* ── Operating Profile tab ────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base">Learned Operating Profile</CardTitle>
              <CardDescription>
                Statistical baseline derived from {status.cycles} measured operating cycles.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ProfileStat
                  label="Nominal Voltage" icon={Zap}
                  value={status.operatingProfile.nominalVoltage} unit="V"
                />
                <ProfileStat
                  label="Nominal Current" icon={Activity}
                  value={status.operatingProfile.nominalCurrent} unit="A"
                />
                <ProfileStat
                  label="Nominal Power"   icon={Activity}
                  value={(status.operatingProfile.nominalPower / 1000).toFixed(2)} unit="kW"
                />
                <ProfileStat
                  label="Startup Duration" icon={Clock}
                  value={status.operatingProfile.startupDuration} unit="sec"
                />
                <ProfileStat
                  label="Shutdown Duration" icon={Clock}
                  value={status.operatingProfile.shutdownDuration} unit="sec"
                />
                {status.operatingProfile.startupCurrentPeak != null && (
                  <ProfileStat
                    label="Startup Peak Current" icon={Zap}
                    value={status.operatingProfile.startupCurrentPeak!} unit="A"
                  />
                )}
              </div>
              {status.operatingProfile.avgRuntime != null && (
                <div className="mt-4 p-4 rounded-lg border bg-muted/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Average Runtime per Cycle
                    </div>
                    <div className="font-mono text-2xl font-bold text-foreground mt-1">
                      {status.operatingProfile.avgRuntime!.toFixed(2)}
                      <span className="text-sm font-sans text-muted-foreground ml-1">hrs</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS = [
  {
    icon: Activity,
    title: "Phase 1 — Data Collection",
    body: "During every pump start, run, and stop, the controller captures voltage, current, power, frequency, and temperature at high frequency. Each complete pump cycle adds one data point to the model.",
  },
  {
    icon: TrendingUp,
    title: "Phase 2 — Baseline Formation",
    body: "After a minimum number of cycles (configurable, default 10), the model calculates statistical averages and acceptable operating bands for each measured parameter. This becomes the electrical fingerprint of your specific installation.",
  },
  {
    icon: BrainCircuit,
    title: "Phase 3 — Confidence Building",
    body: "Confidence increases as more cycles confirm the baseline. Once confidence exceeds 80%, the controller switches from factory-default protection thresholds to custom thresholds derived from this pump's own signature — providing tighter, more accurate protection.",
  },
  {
    icon: ShieldCheck,
    title: "Phase 4 — Adaptive Protection",
    body: "With a high-confidence model, the controller can detect subtle deviations that generic thresholds would miss: early bearing wear causes a small but consistent current increase, and dry-running causes a characteristic drop in load. These are caught earlier.",
  },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="opacity-60 text-xs uppercase tracking-wider">{label}</span>
      <span className={cn("text-lg font-medium", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function ProfileStat({ label, value, unit, icon: Icon }: {
  label: string; value: string | number; unit: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-secondary/50 rounded-lg p-4 border border-border">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-foreground">
        {value}
        <span className="text-sm font-sans text-muted-foreground font-normal ml-1">{unit}</span>
      </div>
    </div>
  );
}

function LearningSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-16 w-64" />
      <Skeleton className="h-12 w-full sm:w-80" />
      <Skeleton className="h-[360px] w-full" />
    </div>
  );
}
