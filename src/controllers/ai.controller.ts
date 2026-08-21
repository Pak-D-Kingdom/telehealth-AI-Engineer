import { Request, Response, NextFunction } from "express";
import {
  GlucoseAnalyzer,
  RiskCalculator,
  InteractionChecker,
  ContraindicationChecker,
} from "../services/health-tools.service";
import { FoodAnalyzerService } from "../services/food-analyzer.service";
import { ClinicalService } from "../services/clinical.service";
import { FinanceAgent } from "../services/agents/finance.agent";
import { LeadScoringAgent } from "../services/agents/lead-scoring.agent";
import { InventoryAgent } from "../services/agents/inventory.agent";

export async function analyzeGlucoseTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { readings } = req.body;
    const result = GlucoseAnalyzer.analyze(readings);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function calculateFindriscRisk(req: Request, res: Response, next: NextFunction) {
  try {
    const result = RiskCalculator.calculateFindrisc(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function checkMedicationInteractions(req: Request, res: Response, next: NextFunction) {
  try {
    const { medications } = req.body;
    const result = InteractionChecker.check(medications || []);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function checkContraindications(req: Request, res: Response, next: NextFunction) {
  try {
    const { proposed_medications, patient_conditions } = req.body;
    const result = ContraindicationChecker.check(proposed_medications || [], patient_conditions || {});
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function analyzeFood(req: Request, res: Response, next: NextFunction) {
  try {
    const { image_base64, image, user_note } = req.body;
    const base64Data = image_base64 || image;
    const result = await FoodAnalyzerService.analyzeFoodImage(base64Data, user_note);
    res.status(200).json({ ...result, success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function compareFood(req: Request, res: Response, next: NextFunction) {
  try {
    const { images, user_note } = req.body;
    const result = await FoodAnalyzerService.compareFoodImages(images || [], user_note);
    res.status(200).json({ ...result, success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function generateClinicalSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ClinicalService.generateClinicalSummary(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function generatePrescriptionDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ClinicalService.generatePrescriptionDraft(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// -------------------------------------------------------------
// Admin AI Agent Handlers (Finance & Lead Scoring CRM)
// -------------------------------------------------------------

export async function getFinancialInsights(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await FinanceAgent.generateFinancialInsights();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function queryFinanceAdvisor(req: Request, res: Response, next: NextFunction) {
  try {
    const { query } = req.body;
    const result = await FinanceAgent.askFinanceAdvisor(query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getLeadScore(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const result = await LeadScoringAgent.scoreLead(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getBatchLeadScores(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await LeadScoringAgent.scoreAllLeads();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// -------------------------------------------------------------
// Admin Pharmacy Inventory & Restock Forecasting Handlers
// -------------------------------------------------------------

export async function getInventoryForecast(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await InventoryAgent.generateInventoryForecast();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function queryInventoryAdvisor(req: Request, res: Response, next: NextFunction) {
  try {
    const { query } = req.body;
    const result = await InventoryAgent.askInventoryAdvisor(query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
