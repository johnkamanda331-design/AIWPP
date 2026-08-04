import { useGetFaults, useGetFaultSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Faults() {
  const { data: faults, isLoading: faultsLoading } = useGetFaults();
  const { data: summary, isLoading: summaryLoading } = useGetFaultSummary();

  if (faultsLoading || summaryLoading) {
    return <FaultsSkeleton />;
  }

  const activeFaults = faults?.filter(f => f.isActive) || [];
  const historicalFaults = faults?.filter(f => !f.isActive) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fault Detection</h1>
        <p className="text-sm text-muted-foreground mt-1">Active alerts, historical faults, and diagnostic recommendations</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-destructive mb-1">Active Faults</div>
              <div className="text-3xl font-bold text-destructive font-mono">{summary.totalActive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">Critical</div>
              <div className="text-3xl font-bold text-foreground font-mono">{summary.bySeverity['critical'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">High/Medium</div>
              <div className="text-3xl font-bold text-foreground font-mono">
                {(summary.bySeverity['high'] || 0) + (summary.bySeverity['medium'] || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">Historical Total</div>
              <div className="text-3xl font-bold text-foreground font-mono">{summary.totalHistorical}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeFaults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Active Faults Requires Attention
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {activeFaults.map(fault => (
              <FaultCard key={fault.id} fault={fault} active={true} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight mt-8">Historical Faults</h2>
        {historicalFaults.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-4 text-primary opacity-50" />
              <p>No historical faults recorded</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {historicalFaults.map(fault => (
              <FaultCard key={fault.id} fault={fault} active={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FaultCard({ fault, active }: any) {
  return (
    <Card className={cn(
      "shadow-sm overflow-hidden",
      active ? "border-l-4" : "opacity-80 hover:opacity-100 transition-opacity",
      active && fault.severity === 'critical' ? "border-l-destructive" :
      active && fault.severity === 'high' ? "border-l-destructive/70" :
      active ? "border-l-warning" : "border-l-transparent"
    )}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className={cn(
            "p-4 md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/30",
            active ? "" : "grayscale"
          )}>
            <div className="flex justify-between items-start mb-2">
              <Badge variant={
                fault.severity === 'critical' ? "destructive" : 
                fault.severity === 'high' ? "destructive" :
                fault.severity === 'medium' ? "secondary" : "outline"
              } className={cn(fault.severity === 'medium' && active ? "bg-warning text-warning-foreground" : "")}>
                {fault.severity.toUpperCase()}
              </Badge>
              {active && <Badge variant="outline" className="bg-destructive/10 text-destructive border-0 flex gap-1 items-center"><span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> ACTIVE</Badge>}
            </div>
            <h3 className="font-semibold text-lg capitalize">{fault.type.replace(/_/g, ' ')}</h3>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Confidence</span>
                <span className="font-mono font-medium text-foreground">{fault.confidence}%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Occurrences</span>
                <span className="font-mono font-medium text-foreground">{fault.occurrences}</span>
              </div>
              <div className="flex justify-between text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <span>Last Seen</span>
                <span className="font-mono text-xs">{new Date(fault.lastSeen).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 md:w-2/3 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Root Cause Analysis
                </h4>
                <p className="text-sm font-medium">{fault.cause}</p>
              </div>
              
              <div className="bg-secondary/50 rounded-md p-3 border border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Recommended Action
                </h4>
                <p className="text-sm">{fault.recommendedAction}</p>
              </div>
            </div>
            
            {!active && (
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> Resolved. Total active time: <span className="font-mono">...</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FaultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-8 w-40 mt-8" />
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    </div>
  );
}
