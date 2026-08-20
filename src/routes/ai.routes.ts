import { Router } from "express";
import {
  analyzeGlucoseTrends,
  calculateFindriscRisk,
  checkMedicationInteractions,
  checkContraindications,
  analyzeFood,
  compareFood,
  generateClinicalSummary,
  generatePrescriptionDraft,
} from "../controllers/ai.controller";

const router = Router();

// Health Calculators & Algorithms (Instant response, rule-based / clinical formulas)
router.post("/glucose/trends", analyzeGlucoseTrends);
router.post("/risk/findrisc", calculateFindriscRisk);
router.post("/medications/interactions", checkMedicationInteractions);
router.post("/medications/contraindications", checkContraindications);

// Vision & Food Analysis (Multimodal AI)
router.post("/food/analyze", analyzeFood);
router.post("/food/compare", compareFood);
router.post("/analyze", analyzeFood);
router.post("/compare", compareFood);

// Clinical Summaries & Prescription (Doctor Portal AI)
router.post("/clinical/summary", generateClinicalSummary);
router.post("/clinical/prescription-draft", generatePrescriptionDraft);

export { router as aiRouter };
