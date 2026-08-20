import { Router } from "express";
import { queryReport } from "../controllers/admin-report.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);
router.post("/query", queryReport);

export { router as adminReportRouter };
