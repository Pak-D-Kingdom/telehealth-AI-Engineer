import type { RequestHandler } from "express";
import { executeAdminAiReport } from "../services/admin-report.service";
import { adminReportQuerySchema } from "../validators/admin-report.validator";

export const queryReport: RequestHandler = async (req, res) => {
  const { query } = adminReportQuerySchema.parse(req.body);
  const data = await executeAdminAiReport(query);
  res.status(200).json({ data });
};
