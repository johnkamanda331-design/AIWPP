import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { GenerateReportBody, GenerateReportResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// In-memory store for generated reports (production would use DB/object storage)
const reportStore = new Map<string, {
  type: string; from: string; to: string; format: string; includeCharts: boolean;
}>();

router.post("/reports/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const reportId = randomUUID();
  reportStore.set(reportId, {
    type:          parsed.data.type,
    from:          parsed.data.from,
    to:            parsed.data.to,
    format:        parsed.data.format ?? "pdf",
    includeCharts: parsed.data.includeCharts ?? true,
  });

  // Expire after 5 minutes
  setTimeout(() => reportStore.delete(reportId), 5 * 60 * 1000);

  res.json(GenerateReportResponse.parse({
    reportId,
    status:      "ready",
    downloadUrl: `/api/reports/${reportId}/download`,
    message:     `${parsed.data.type} report for ${parsed.data.from} to ${parsed.data.to}`,
  }));
});

router.get("/reports/:reportId/download", requireAuth, async (req, res): Promise<void> => {
  const reportId = Array.isArray(req.params.reportId)
    ? req.params.reportId[0]
    : req.params.reportId;

  const report = reportStore.get(reportId);
  if (!report) {
    res.status(404).json({ error: "Report not found or expired. Please regenerate." });
    return;
  }

  const { type, from, to, format } = report;
  const fromDate  = new Date(from);
  const toDate    = new Date(to);
  const dayCount  = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1);
  const data      = buildReportData(type, fromDate, dayCount);
  const filename  = `aippmcs-${type}-${from}-to-${to}`;

  if (format === "json") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
    res.send(JSON.stringify(data, null, 2));
    return;
  }

  if (format === "csv" || format === "excel") {
    const csv = buildCSV(data);
    res.setHeader(
      "Content-Type",
      format === "excel" ? "application/vnd.ms-excel" : "text/csv",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.send(csv);
    return;
  }

  // PDF: serve as print-ready HTML
  const html = buildHTMLReport(data, type, from, to);
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.html"`);
  res.send(html);
});

// ────────────────────────────────────────────────────────────────────────────
// Data generation helpers
// ────────────────────────────────────────────────────────────────────────────

function buildReportData(type: string, from: Date, dayCount: number) {
  const rng   = (base: number, v: number) => parseFloat((base + (Math.random() - 0.5) * v).toFixed(3));
  const days  = Array.from({ length: Math.min(dayCount, 90) }, (_, i) => {
    const d            = new Date(from);
    d.setDate(d.getDate() + i);
    const consumption  = rng(3.92, 2.0);
    const runtime      = parseFloat((consumption / 0.87).toFixed(2));
    const cost         = parseFloat((consumption * 24.80).toFixed(2));
    return { date: d.toISOString().split("T")[0], consumption, runtime, cost };
  });

  const totalKwh    = days.reduce((s, d) => s + d.consumption, 0);
  const totalHrs    = days.reduce((s, d) => s + d.runtime,     0);
  const totalCost   = days.reduce((s, d) => s + d.cost,        0);

  return {
    meta: {
      reportType:    type,
      generatedAt:   new Date().toISOString(),
      period:        { from: from.toISOString().split("T")[0], to: days.at(-1)?.date ?? from.toISOString().split("T")[0], days: dayCount },
      device:        { name: "Pump Controller #1", firmware: "v2.4.1" },
    },
    summary: {
      totalConsumption:    parseFloat(totalKwh.toFixed(3)),
      totalRuntime:        parseFloat(totalHrs.toFixed(2)),
      estimatedCost:       parseFloat(totalCost.toFixed(2)),
      avgDailyConsumption: parseFloat((totalKwh  / days.length).toFixed(3)),
      avgDailyRuntime:     parseFloat((totalHrs  / days.length).toFixed(2)),
      peakDemand:          1.12,
      healthScore:         87,
      faultCount:          Math.floor(Math.random() * 5),
      pumpStarts:          days.length * 2,
    },
    dailyData: (type === "comprehensive" || type === "energy" || type === "runtime" || type === "voltage_quality") ? days : [],
    faults:    (type === "comprehensive" || type === "faults" || type === "maintenance") ? buildFaults()  : [],
    recommendations: buildRecommendations(type),
  };
}

function buildFaults() {
  return [
    { timestamp: new Date(Date.now() - 5  * 86_400_000).toISOString(), type: "under_voltage",     severity: "medium", duration: "00:03:12", cause: "Mains dipped to 198 V",                action: "Monitor supply quality; consider voltage stabiliser" },
    { timestamp: new Date(Date.now() - 12 * 86_400_000).toISOString(), type: "frequent_restart",  severity: "high",   duration: "00:00:45", cause: "3 starts within 10 minutes",           action: "Check pump priming and float switch" },
    { timestamp: new Date(Date.now() - 28 * 86_400_000).toISOString(), type: "long_runtime",      severity: "low",    duration: "06:42:00", cause: "Scheduled run exceeded 6-hour limit",  action: "Review schedule; check downstream demand" },
  ];
}

function buildRecommendations(type: string): string[] {
  const all = [
    "Schedule pump operation during off-peak hours (22:00–06:00) to reduce energy costs under EPRA Time-of-Use tariffs.",
    "Current idle draw of 38 W indicates continuous controller operation. Enable scheduled sleep mode to reduce idle consumption.",
    "Power factor of 0.91 is acceptable. If it drops below 0.85, consider a power factor correction capacitor.",
    "Perform routine mechanical inspection — bearings and shaft seal — within the next 30 days based on runtime hours.",
    "Review under-voltage events. Persistent grid fluctuations may indicate a distribution transformer overload in your area.",
  ];
  if (type === "energy")      return all.slice(0, 3);
  if (type === "maintenance") return all.slice(3);
  if (type === "runtime")     return [all[0], all[1]];
  return all;
}

// ────────────────────────────────────────────────────────────────────────────
// CSV builder
// ────────────────────────────────────────────────────────────────────────────

function buildCSV(data: ReturnType<typeof buildReportData>): string {
  const rows: string[] = [];
  const { meta, summary, dailyData, faults, recommendations } = data;

  rows.push(`AIPPMCS Report — ${meta.reportType.toUpperCase().replace(/_/g, " ")}`);
  rows.push(`Generated,${meta.generatedAt}`);
  rows.push(`Period,${meta.period.from} to ${meta.period.to} (${meta.period.days} days)`);
  rows.push(`Device,${meta.device.name} — Firmware ${meta.device.firmware}`);
  rows.push("");

  rows.push("SUMMARY");
  rows.push("Metric,Value,Unit");
  rows.push(`Total Consumption,${summary.totalConsumption},kWh`);
  rows.push(`Total Runtime,${summary.totalRuntime},hours`);
  rows.push(`Estimated Cost (EPRA SC-11),${summary.estimatedCost},KSh`);
  rows.push(`Average Daily Consumption,${summary.avgDailyConsumption},kWh/day`);
  rows.push(`Average Daily Runtime,${summary.avgDailyRuntime},hrs/day`);
  rows.push(`Peak Demand,${summary.peakDemand},kW`);
  rows.push(`Health Score,${summary.healthScore},%`);
  rows.push(`Total Faults,${summary.faultCount},count`);
  rows.push(`Total Pump Starts,${summary.pumpStarts},count`);
  rows.push("");

  if (dailyData.length > 0) {
    rows.push("DAILY BREAKDOWN");
    rows.push("Date,Consumption (kWh),Runtime (hrs),Estimated Cost (KSh)");
    dailyData.forEach(d => rows.push(`${d.date},${d.consumption},${d.runtime},${d.cost}`));
    rows.push("");
  }

  if (faults.length > 0) {
    rows.push("FAULT LOG");
    rows.push("Timestamp,Fault Type,Severity,Duration,Cause,Recommended Action");
    faults.forEach(f => rows.push(
      `${f.timestamp},${f.type.replace(/_/g," ")},${f.severity},${f.duration},"${f.cause}","${f.action}"`,
    ));
    rows.push("");
  }

  if (recommendations.length > 0) {
    rows.push("RECOMMENDATIONS");
    recommendations.forEach((r, i) => rows.push(`${i + 1},"${r}"`));
  }

  return rows.join("\r\n");
}

// ────────────────────────────────────────────────────────────────────────────
// HTML / print-ready PDF report
// ────────────────────────────────────────────────────────────────────────────

function buildHTMLReport(
  data: ReturnType<typeof buildReportData>,
  type: string,
  from: string,
  to: string,
): string {
  const { meta, summary, dailyData, faults, recommendations } = data;

  const dailyRows = dailyData.map(d =>
    `<tr><td>${d.date}</td><td>${d.consumption}</td><td>${d.runtime}</td><td>KSh ${d.cost.toFixed(2)}</td></tr>`,
  ).join("");

  const faultRows = faults.map(f =>
    `<tr><td>${new Date(f.timestamp).toLocaleDateString("en-KE")}</td><td>${f.type.replace(/_/g," ")}</td><td class="sev-${f.severity}">${f.severity}</td><td>${f.cause}</td><td>${f.action}</td></tr>`,
  ).join("");

  const title = type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AIPPMCS ${title} Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; margin: 48px; color: #1c2b26; font-size: 13.5px; line-height: 1.6; }
  h1  { color: #1a6b45; font-size: 20px; margin: 0 0 4px; }
  h2  { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #1a6b45; margin: 28px 0 10px; border-bottom: 1px solid #c6e8d9; padding-bottom: 5px; }
  .meta { font-size: 11.5px; color: #6b8a7a; margin-bottom: 24px; }
  .logo { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #1a6b45; margin-bottom: 6px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .card { background: #f3faf6; border-left: 3px solid #1a6b45; padding: 10px 14px; border-radius: 0 4px 4px 0; }
  .card-val   { font-size: 18px; font-weight: 700; color: #1a6b45; line-height: 1.2; }
  .card-label { font-size: 10.5px; color: #6b8a7a; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  thead tr th { background: #1a6b45; color: #fff; padding: 7px 11px; text-align: left; font-weight: 600; font-size: 11.5px; }
  tbody tr td { padding: 6px 11px; border-bottom: 1px solid #edf4f0; }
  tbody tr:nth-child(even) td { background: #f7fbf9; }
  .sev-critical { color: #b91c1c; font-weight: 600; }
  .sev-high     { color: #d97706; font-weight: 600; }
  .sev-medium   { color: #ca8a04; }
  .rec-list { list-style: none; padding: 0; margin: 0; }
  .rec-list li { background: #f3faf6; border-left: 3px solid #1a6b45; padding: 9px 14px; margin: 6px 0; border-radius: 0 4px 4px 0; font-size: 13px; }
  .footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #e0ede7; font-size: 10.5px; color: #9ab8aa; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="logo">AIPPMCS</div>
<h1>${title} Report</h1>
<div class="meta">
  Generated ${new Date(meta.generatedAt).toLocaleString("en-KE")} &nbsp;·&nbsp;
  Period: ${from} to ${to} (${meta.period.days} days) &nbsp;·&nbsp;
  Device: ${meta.device.name} &nbsp;·&nbsp; Firmware ${meta.device.firmware}
</div>

<h2>Summary</h2>
<div class="grid">
  <div class="card"><div class="card-val">${summary.totalConsumption} kWh</div><div class="card-label">Total Consumption</div></div>
  <div class="card"><div class="card-val">${summary.totalRuntime} hrs</div><div class="card-label">Total Runtime</div></div>
  <div class="card"><div class="card-val">KSh ${summary.estimatedCost.toFixed(0)}</div><div class="card-label">Estimated Cost (EPRA)</div></div>
  <div class="card"><div class="card-val">${summary.avgDailyConsumption} kWh</div><div class="card-label">Avg Daily Consumption</div></div>
  <div class="card"><div class="card-val">${summary.avgDailyRuntime} hrs</div><div class="card-label">Avg Daily Runtime</div></div>
  <div class="card"><div class="card-val">${summary.peakDemand} kW</div><div class="card-label">Peak Demand</div></div>
  <div class="card"><div class="card-val">${summary.healthScore}%</div><div class="card-label">Health Score</div></div>
  <div class="card"><div class="card-val">${summary.faultCount}</div><div class="card-label">Total Faults</div></div>
</div>

${dailyData.length > 0 ? `
<h2>Daily Breakdown</h2>
<table>
  <thead><tr><th>Date</th><th>Consumption (kWh)</th><th>Runtime (hrs)</th><th>Estimated Cost</th></tr></thead>
  <tbody>${dailyRows}</tbody>
</table>` : ""}

${faults.length > 0 ? `
<h2>Fault Log</h2>
<table>
  <thead><tr><th>Date</th><th>Fault Type</th><th>Severity</th><th>Cause</th><th>Recommended Action</th></tr></thead>
  <tbody>${faultRows}</tbody>
</table>` : ""}

${recommendations.length > 0 ? `
<h2>Recommendations</h2>
<ul class="rec-list">
  ${recommendations.map(r => `<li>${r}</li>`).join("")}
</ul>` : ""}

<div class="footer">
  AIPPMCS — Adaptive Intelligent Water Pump Protection, Monitoring and Control System<br>
  Costs calculated per EPRA 2024 SC-11 tariff (energy charge + FCC + FERFA + IAF + ERC + REP + WRMA + VAT 16%).
  For PDF output, use your browser's Print → Save as PDF function.
</div>
</body>
</html>`;
}

export default router;
