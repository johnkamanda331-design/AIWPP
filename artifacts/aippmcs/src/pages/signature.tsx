import { useGetElectricalSignature } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ShieldAlert, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Signature() {
  const { data: sig, isLoading } = useGetElectricalSignature();

  if (isLoading) return <SignatureSkeleton />;
  if (!sig) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Electrical Signature Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">High-frequency waveform analysis of the motor's operational profile.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm bg-sidebar text-sidebar-foreground border-sidebar-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full space-y-4">
            <div className="w-20 h-20 rounded-full bg-sidebar-accent flex items-center justify-center border-4 border-sidebar-border">
              <Activity className="w-10 h-10 text-sidebar-primary" />
            </div>
            <div>
              <div className="text-sm uppercase tracking-wider font-semibold opacity-70 mb-1">Similarity Score</div>
              <div className="text-5xl font-mono font-bold">{sig.similarityScore}%</div>
            </div>
            <p className="text-sm opacity-80 mt-2 px-4">
              Measures how closely the current motor signature matches the learned baseline.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Operating Envelope</CardTitle>
            <CardDescription>Current readings vs Learned boundaries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <EnvelopeBar 
                label="Current (A)" 
                min={sig.normalRunningRegion.minCurrent} 
                max={sig.normalRunningRegion.maxCurrent} 
                current={sig.currentReading.current} 
              />
              <EnvelopeBar 
                label="Power (kW)" 
                min={sig.normalRunningRegion.minPower / 1000} 
                max={sig.normalRunningRegion.maxPower / 1000} 
                current={sig.currentReading.power / 1000} 
              />
              <EnvelopeBar 
                label="Voltage (V)" 
                min={sig.normalRunningRegion.minVoltage} 
                max={sig.normalRunningRegion.maxVoltage} 
                current={sig.currentReading.voltage} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Inrush Current Profile</CardTitle>
            <CardDescription>Motor startup sequence analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sig.startupProfile}>
                  <defs>
                    <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="timeOffset" tickFormatter={(v) => `${v}s`} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="current" stroke="var(--color-primary)" fill="url(#colorCurrent)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Long-term Trend Deviation</CardTitle>
            <CardDescription>Historical baseline vs current performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sig.trendComparison}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="timestamp" tickFormatter={(v) => v.substring(5,10)} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="historical" stroke="var(--color-muted)" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="Baseline" />
                  <Area type="monotone" dataKey="current" stroke="var(--color-warning)" fill="url(#colorTrend)" strokeWidth={3} name="Current" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EnvelopeBar({ label, min, max, current }: any) {
  // Normalize everything to a 0-100% scale for visualization
  // Let's assume the chart shows from min - 20% to max + 20%
  const range = max - min;
  const padding = range * 0.5;
  const vizMin = Math.max(0, min - padding);
  const vizMax = max + padding;
  const vizRange = vizMax - vizMin;
  
  const getPercent = (val: number) => ((val - vizMin) / vizRange) * 100;
  
  const pMin = getPercent(min);
  const pMax = getPercent(max);
  const pCurrent = getPercent(current);

  const isOutOfBounds = current < min || current > max;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono font-bold text-sm">
          {current.toFixed(2)}
        </span>
      </div>
      <div className="relative h-6 bg-secondary/50 rounded-full border border-border">
        {/* Safe Region */}
        <div 
          className="absolute h-full bg-primary/20 border-l border-r border-primary/50"
          style={{ left: `${pMin}%`, width: `${pMax - pMin}%` }}
        />
        {/* Current Marker */}
        <div 
          className="absolute top-0 bottom-0 w-2 -ml-1 rounded bg-foreground shadow-md z-10"
          style={{ left: `${Math.min(100, Math.max(0, pCurrent))}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs font-mono text-muted-foreground">
        <span>Min: {min.toFixed(2)}</span>
        {isOutOfBounds && <span className="text-destructive font-sans font-medium">Out of envelope!</span>}
        <span>Max: {max.toFixed(2)}</span>
      </div>
    </div>
  );
}

function SignatureSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
