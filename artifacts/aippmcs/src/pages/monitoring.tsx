import type { LiveTelemetry } from "@workspace/api-client-react";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Power, Zap, Thermometer, Radio, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MAX_POINTS = 40;
const TOKEN_KEY = "mtiririko_auth";

type ChartPoint = {
  ts: string;
  voltage: number;
  current: number;
  power: number;
};

// ── Fetch-based SSE hook ─────────────────────────────────────────────────────
// Uses fetch() + ReadableStream so we can send the Authorization header
// (native EventSource does not support custom headers).
function useTelemetryStream() {
  const [data, setData]           = useState<LiveTelemetry | null>(null);
  const [isConnected, setConnected] = useState(false);
  const [error, setError]         = useState<Error | null>(null);
  const [retryKey, setRetryKey]   = useState(0);
  const backoffRef                = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout>;

    async function connect() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { setError(new Error("Not authenticated")); return; }

      try {
        const response = await fetch("/api/monitoring/stream", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error("No stream body");

        setConnected(true);
        setError(null);
        backoffRef.current = 0;

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer      = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try { setData(JSON.parse(line.slice(6)) as LiveTelemetry); } catch { /* skip */ }
            }
          }
        }
        throw new Error("Stream closed"); // reconnect on clean close
      } catch (err) {
        if (controller.signal.aborted) return;
        setConnected(false);
        setError(err instanceof Error ? err : new Error("Stream error"));
        const delay = Math.min(1_000 * 2 ** backoffRef.current, 30_000);
        backoffRef.current++;
        retryTimer = setTimeout(connect, delay);
      }
    }

    connect();
    return () => { controller.abort(); clearTimeout(retryTimer); };
  }, [retryKey]);

  const reconnect = () => { backoffRef.current = 0; setRetryKey(k => k + 1); };
  return { data, isConnected, error, reconnect };
}

export default function Monitoring() {
  const { data: telemetry, isConnected, error, reconnect } = useTelemetryStream();
  const isLoading = telemetry === null && !error;

  const bufferRef = useRef<ChartPoint[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (!telemetry) return;
    const now = new Date();
    const point: ChartPoint = {
      ts: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      voltage: Number(telemetry.voltage.toFixed(1)),
      current: Number(telemetry.current.toFixed(2)),
      power: Number((telemetry.realPower / 1000).toFixed(3)),
    };
    bufferRef.current = [...bufferRef.current.slice(-(MAX_POINTS - 1)), point];
    setChartData([...bufferRef.current]);
  }, [telemetry]);

  if (isLoading) return <MonitoringSkeleton />;
  if (error && !telemetry) return (
    <ErrorState
      variant="offline"
      title="Telemetry stream unavailable"
      message="Could not connect to the live data stream. Retrying automatically."
      onRetry={reconnect}
    />
  );
  if (!telemetry) return null;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time electrical telemetry · live stream</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 border rounded",
          isConnected
            ? "bg-primary/8 text-primary border-primary/20"
            : "bg-muted text-muted-foreground border-border/60"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
          {isConnected ? "Live" : "Reconnecting…"}
        </div>
      </div>

      {/* Primary Electrical Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ParameterCard
          title="Voltage"
          value={telemetry.voltage.toFixed(1)}
          unit="V"
          icon={Zap}
          trend={telemetry.historicalMax?.voltage
            ? (telemetry.voltage / telemetry.historicalMax.voltage) * 100
            : undefined}
          min={telemetry.historicalMin?.voltage}
          max={telemetry.historicalMax?.voltage}
        />
        <ParameterCard
          title="Current"
          value={telemetry.current.toFixed(2)}
          unit="A"
          icon={Activity}
          trend={telemetry.historicalMax?.current
            ? (telemetry.current / telemetry.historicalMax.current) * 100
            : undefined}
          min={telemetry.historicalMin?.current}
          max={telemetry.historicalMax?.current}
        />
        <ParameterCard
          title="Real Power"
          value={(telemetry.realPower / 1000).toFixed(2)}
          unit="kW"
          icon={Power}
          trend={telemetry.historicalMax?.realPower
            ? (telemetry.realPower / telemetry.historicalMax.realPower) * 100
            : undefined}
        />
        <ParameterCard
          title="Power Factor"
          value={telemetry.powerFactor.toFixed(3)}
          unit=""
          icon={ArrowRightLeft}
          trend={telemetry.powerFactor * 100}
        />
      </div>

      {/* Live Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendChart
          title="Voltage"
          unit="V"
          dataKey="voltage"
          data={chartData}
          color="hsl(var(--chart-4))"
          domain={['auto', 'auto']}
        />
        <TrendChart
          title="Current"
          unit="A"
          dataKey="current"
          data={chartData}
          color="hsl(var(--chart-1))"
          domain={[0, 'auto']}
        />
        <TrendChart
          title="Real Power"
          unit="kW"
          dataKey="power"
          data={chartData}
          color="hsl(var(--chart-2))"
          domain={[0, 'auto']}
        />
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Power Quality */}
        <Card className="shadow-xs border-border/60">
          <CardHeader className="pt-5 px-5 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Power Quality</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            <MetricRow label="Frequency"      value={telemetry.frequency.toFixed(2)}                  unit="Hz"   />
            <MetricRow label="Apparent Power" value={(telemetry.apparentPower / 1000).toFixed(2)}     unit="kVA"  />
            <MetricRow label="Reactive Power" value={(telemetry.reactivePower / 1000).toFixed(2)}     unit="kVAR" />
            <MetricRow label="Total Energy"   value={telemetry.energy.toFixed(1)}                     unit="kWh"  />
            <MetricRow label="Today's Runtime" value={telemetry.runtime.toFixed(1)}                   unit="hrs"  />
          </CardContent>
        </Card>

        {/* Hardware States */}
        <Card className="shadow-xs bg-sidebar text-sidebar-foreground border-sidebar-border/80">
          <CardHeader className="pt-5 px-5 pb-3">
            <CardTitle className="text-sm font-semibold text-sidebar-foreground">Hardware States</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <StateIndicator label="Motor State"  state={telemetry.motorState}  />
            <StateIndicator label="Supply State" state={telemetry.supplyState} />
            <StateIndicator label="Relay State"  state={telemetry.relayState}  />
          </CardContent>
        </Card>

        {/* Environment & Comm */}
        <Card className="shadow-xs border-border/60">
          <CardHeader className="pt-5 px-5 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Environment &amp; Comm</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary/70 flex items-center justify-center shrink-0">
                <Thermometer className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-0.5">Internal Temp</div>
                <div className="text-2xl font-bold font-mono">
                  {telemetry.internalTemp.toFixed(1)}
                  <span className="text-sm text-muted-foreground font-sans ml-1">°C</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/70 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Signal Quality</span>
                    <span className="font-mono text-foreground">{telemetry.communicationQuality}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        telemetry.communicationQuality > 70 ? "bg-primary" :
                        telemetry.communicationQuality > 40 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${telemetry.communicationQuality}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function TrendChart({
  title, unit, dataKey, data, color, domain,
}: {
  title: string;
  unit: string;
  dataKey: keyof ChartPoint;
  data: ChartPoint[];
  color: string;
  domain: [number | string, number | string];
}) {
  const latest = data[data.length - 1]?.[dataKey];

  return (
    <Card className="shadow-xs border-border/60">
      <CardHeader className="pt-5 px-5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          {latest !== undefined && (
            <span className="text-sm font-bold font-mono text-foreground">
              {latest} <span className="text-xs text-muted-foreground font-sans">{unit}</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {data.length < 2 ? (
          <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">
            Collecting data…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={112}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="ts"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={domain}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickCount={4}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 2 }}
                itemStyle={{ color: "hsl(var(--foreground))", fontFamily: "var(--font-mono)" }}
                formatter={(val: number) => [`${val} ${unit}`, title]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${dataKey})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ParameterCard({ title, value, unit, icon: Icon, trend, min, max }: {
  title: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Card className="shadow-xs border-border/60 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </div>
        <div className="text-3xl font-bold font-mono tracking-tight text-foreground flex items-end gap-1">
          {value}
          {unit && <span className="text-base text-muted-foreground font-sans mb-0.5">{unit}</span>}
        </div>

        {(min !== undefined || max !== undefined) && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>↓ {min?.toFixed(1) ?? '—'}</span>
            <span>↑ {max?.toFixed(1) ?? '—'}</span>
          </div>
        )}

        {trend !== undefined && (
          <div className="mt-3 h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", trend > 90 ? "bg-warning" : "bg-primary")}
              style={{ width: `${Math.min(100, Math.max(0, trend))}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0 last:pb-0 first:pt-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground font-medium">
        {value} <span className="text-xs text-muted-foreground font-sans">{unit}</span>
      </span>
    </div>
  );
}

function StateIndicator({ label, state }: { label: string; state: string }) {
  const isHealthy = state === "running" || state === "normal" || state === "closed";
  const isWarning = state === "starting" || state === "stopped" || state === "open";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-sidebar-foreground/70">{label}</span>
      <div className={cn(
        "px-2.5 py-1 rounded text-xs font-semibold capitalize flex items-center gap-1.5 border",
        isHealthy
          ? "bg-primary/20 text-sidebar-primary border-primary/25"
          : isWarning
          ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border"
          : "bg-destructive/20 text-destructive border-destructive/25"
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
    <div className="space-y-5">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-44" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    </div>
  );
}
