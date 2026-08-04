import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { GenerateReportBody, GenerateReportResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/reports/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const reportId = randomUUID();

  // In production this would queue a report generation job
  // For now we return a simulated success with a placeholder download URL
  res.json(GenerateReportResponse.parse({
    reportId,
    status: "ready",
    downloadUrl: `/api/reports/${reportId}/download`,
    message: `${parsed.data.type} report for ${parsed.data.from} to ${parsed.data.to} generated as ${parsed.data.format ?? "pdf"}`,
  }));
});

export default router;
