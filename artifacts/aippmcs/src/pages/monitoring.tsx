import { useGetLiveData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Power, Zap, Thermometer, Radio, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Monitoring() {
  const { data: telemetry, isLoading } = useGetLiveData({
    query: {
      queryKey: ['/api/monitoring/live'],
      refetchInterval: 2000,
    }
  });

  if (isLoading) {
    return <MonitoringSkeleton />;
  }

  if (!telemetry) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time electrical telemetry and controller status</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 bg-secondary rounded-md border text-secondary-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live Update (2s)
        </div>
      </div>

      {/* Main Electrical Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ParameterCard 
          title="Voltage" 
          value={telemetry.voltage.toFixed(1)} 
          unit="V" 
          icon={Zap}
          trend={telemetry.historicalMax?.voltage ? ((telemetry.voltage / telemetry.historicalMax.voltage) * 100) : undefined}
          min={telemetry.historicalMin?.voltage}
          max={telemetry.historicalMax?.voltage}
        />
        <ParameterCard 
          title="Current" 
          value={telemetry.current.toFixed(2)} 
          unit="A" 
          icon={Activity}
          trend={telemetry.historicalMax?.current ? ((telemetry.current / telemetry.historicalMax.current) * 100) : undefined}
          min={telemetry.historicalMin?.current}
          max={telemetry.historicalMax?.current}
        />
        <ParameterCard 
          title="Real Power" 
          value={(telemetry.realPower / 1000).toFixed(2)} 
          unit="kW" 
          icon={Power}
          trend={telemetry.historicalMax?.realPower ? ((telemetry.realPower / telemetry.historicalMax.realPower) * 100) : undefined}
        />
        <ParameterCard 
          title="Power Factor" 
          value={telemetry.powerFactor.toFixed(2)} 
          unit="" 
          icon={ArrowRightLeft}
          trend={telemetry.powerFactor * 100}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Additional Power Metrics */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Power Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow label="Frequency" value={telemetry.frequency.toFixed(2)} unit="Hz" />
            <MetricRow label="Apparent Power" value={(telemetry.apparentPower / 1000).toFixed(2)} unit="kVA" />
            <MetricRow label="Reactive Power" value={(telemetry.reactivePower / 1000).toFixed(2)} unit="kVAR" />
            <MetricRow label="Total Energy" value={telemetry.energy.toFixed(1)} unit="kWh" />
            <MetricRow label="Today's Runtime" value={telemetry.runtime.toFixed(1)} unit="hours" />
          </CardContent>
        </Card>

        {/* System States */}
        <Card className="col-span-1 shadow-sm bg-sidebar text-sidebar-foreground border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-lg text-sidebar-foreground">Hardware States</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StateIndicator label="Motor State" state={telemetry.motorState} />
            <StateIndicator label="Supply State" state={telemetry.supplyState} />
            <StateIndicator label="Relay State" state={telemetry.relayState} />
          </CardContent>
        </Card>

        {/* Environment & Comms */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Environment & Comm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Internal Temp</div>
                <div className="text-2xl font-bold text-mono flex items-end gap-1">
                  {telemetry.internalTemp.toFixed(1)} <span className="text-base text-muted-foreground font-sans">°C</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                <Radio className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Signal Quality</span>
                  <span className="font-mono">{telemetry.communicationQuality}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${telemetry.communicationQuality}%` }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Add recharts live scrolling chart here */}
    </div>
  );
}

function ParameterCard({ title, value, unit, icon: Icon, trend, min, max }: any) {
  return (
    <Card className="shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-16 h-16" />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <div className="text-3xl font-bold text-mono tracking-tight text-foreground flex items-end gap-1">
          {value} <span className="text-lg text-muted-foreground font-sans mb-1">{unit}</span>
        </div>
        
        {(min !== undefined || max !== undefined) && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Min: {min?.toFixed(1) || '-'}</span>
            <span>Max: {max?.toFixed(1) || '-'}</span>
          </div>
        )}
        
        {trend !== undefined && (
          <div className="mt-4 h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn("h-full", trend > 90 ? "bg-warning" : "bg-primary")} 
              style={{ width: `${Math.min(100, Math.max(0, trend))}%` }} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground font-medium">{value} <span className="text-xs opacity-70 font-sans">{unit}</span></span>
    </div>
  );
}

function StateIndicator({ label, state }: { label: string, state: string }) {
  const isHealthy = state === "running" || state === "normal" || state === "closed";
  const isWarning = state === "starting" || state === "stopped" || state === "open";
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium opacity-80">{label}</span>
      <div className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5 border",
        isHealthy ? "bg-primary/20 text-sidebar-primary-foreground border-primary/30" : 
        isWarning ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : 
        "bg-destructive/20 text-destructive-foreground border-destructive/30"
      )}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          isHealthy ? "bg-primary" : isWarning ? "bg-muted-foreground" : "bg-destructive"
        )} />
        {state}
      </div>
    </div>
  );
}

function MonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    </div>
  );
}
