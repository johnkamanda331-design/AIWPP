import { useState } from "react";
import { useGenerateReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, FileJson, FileSpreadsheet,
  Loader2, CheckCircle2, Calendar, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TOKEN_KEY = "mtiririko_auth";

const REPORT_TYPES = [
  { value: "comprehensive",    label: "Comprehensive System Audit",   description: "Energy, runtime, faults, health, recommendations" },
  { value: "energy",           label: "Energy Consumption",           description: "Daily kWh, cost breakdown, EPRA tariff analysis"   },
  { value: "faults",           label: "Fault History & Diagnostics",  description: "All fault events, severity, recommended actions"   },
  { value: "runtime",          label: "Runtime Log",                  description: "Pump starts, stops, daily operating hours"         },
  { value: "voltage_quality",  label: "Power Quality Analysis",       description: "Voltage, frequency, power factor, brownouts"       },
  { value: "maintenance",      label: "Maintenance Recommendations",  description: "Predicted maintenance, health trend, suggestions"  },
] as const;

const FORMAT_OPTIONS = [
  { value: "pdf",   label: "PDF / Print",        icon: FileText,        ext: "html", hint: "Opens as print-ready HTML" },
  { value: "csv",   label: "CSV Data",            icon: FileSpreadsheet, ext: "csv",  hint: "Compatible with Excel, Sheets" },
  { value: "excel", label: "Excel Spreadsheet",   icon: FileSpreadsheet, ext: "csv",  hint: "Excel-formatted CSV" },
  { value: "json",  label: "JSON (API Format)",   icon: FileJson,        ext: "json", hint: "Raw structured data" },
] as const;

type Format = typeof FORMAT_OPTIONS[number]["value"];

export default function Reports() {
  const generate  = useGenerateReport();
  const { toast } = useToast();

  const today   = new Date().toISOString().split("T")[0];
  const month30 = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];

  const [reportType,    setReportType]    = useState("comprehensive");
  const [from,          setFrom]          = useState(month30);
  const [to,            setTo]            = useState(today);
  const [format,        setFormat]        = useState<Format>("pdf");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const selectedType    = REPORT_TYPES.find(t => t.value === reportType)!;
  const selectedFormat  = FORMAT_OPTIONS.find(f => f.value === format)!;

  const dayCount = Math.max(1, Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
  ) + 1);

  const handleGenerate = async () => {
    if (!from || !to || new Date(from) > new Date(to)) {
      toast({ title: "Invalid date range", description: "Start date must be before end date.", variant: "destructive" });
      return;
    }

    try {
      const res = await generate.mutateAsync({
        data: { type: reportType as any, from, to, format, includeCharts },
      });

      if (res.status === "ready" && res.downloadUrl) {
        await downloadReport(res.downloadUrl, reportType, from, to, selectedFormat.ext);
        setLastGenerated(new Date().toLocaleTimeString());
        toast({ title: "Report downloaded", description: `${selectedType.label} report saved.` });
      }
    } catch {
      toast({ title: "Generation failed", description: "Could not generate report. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate system reports for compliance, auditing, and maintenance records.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>Configure and download your custom system report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Start Date
              </Label>
              <Input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> End Date
              </Label>
              <Input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          {/* Date range summary */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Selected range: <strong className="text-foreground">{from}</strong> to{" "}
              <strong className="text-foreground">{to}</strong>
              {" "}— <strong className="text-foreground">{dayCount} day{dayCount !== 1 ? "s" : ""}</strong>
            </span>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Output Format</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMAT_OPTIONS.map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium
                      transition-all cursor-pointer
                      ${format === f.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs text-center leading-tight">{f.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground px-1">
              {selectedFormat.hint}
            </p>
          </div>

          {/* PDF charts toggle */}
          {format === "pdf" && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-0.5">
                <Label>Include Charts &amp; Graphs</Label>
                <p className="text-xs text-muted-foreground">Embeds visual summaries in the HTML report</p>
              </div>
              <Switch
                checked={includeCharts}
                onCheckedChange={setIncludeCharts}
              />
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="w-full gap-2 mt-2"
            size="lg"
          >
            {generate.isPending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Download className="w-5 h-5" />}
            {generate.isPending ? "Generating…" : "Generate & Download Report"}
          </Button>

          {lastGenerated && (
            <div className="flex items-center gap-2 text-sm text-primary justify-center">
              <CheckCircle2 className="w-4 h-4" />
              Last generated at {lastGenerated}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="shadow-none border-dashed bg-muted/30">
        <CardContent className="py-4 px-5">
          <div className="flex gap-3 text-sm">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1 text-muted-foreground">
              <p>
                <strong className="text-foreground">CSV / Excel</strong> — downloads immediately. Open directly in Microsoft Excel, Google Sheets, or any spreadsheet application.
              </p>
              <p>
                <strong className="text-foreground">PDF</strong> — downloads as print-ready HTML. Open in your browser, then use <kbd className="font-mono text-xs bg-background border rounded px-1">Ctrl+P</kbd> → "Save as PDF" to produce a formatted PDF document.
              </p>
              <p>
                <strong className="text-foreground">JSON</strong> — structured data export for integration with other systems or custom analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Download helper ─────────────────────────────────────────────────────────

async function downloadReport(
  url: string,
  reportType: string,
  from: string,
  to: string,
  ext: string,
): Promise<void> {
  const token    = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const blob     = await response.blob();
  const blobUrl  = URL.createObjectURL(blob);
  const anchor   = document.createElement("a");
  anchor.href    = blobUrl;
  anchor.download = `aippmcs-${reportType}-${from}-to-${to}.${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
}
