export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
}

export type ChatSessionStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";
export type LeadQualificationStatus = "ELIGIBLE" | "NEEDS_REVIEW" | "NOT_ELIGIBLE";

export interface AdminChatLead {
  id: string;
  sessionId: string;
  name: string | null;
  whatsapp: string | null;
  diabetesType: string | null;
  currentMedication: string | null;
  primaryComplaint: string | null;
  qualificationStatus: LeadQualificationStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminChatSession {
  id: string;
  status: ChatSessionStatus;
  leadCaptured: boolean;
  isEmergency: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  lead: AdminChatLead | null;
  messageCount: number;
}

export interface AdminChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources: Array<{ title: string; source: string }> | null;
  createdAt: string;
}

export interface AdminChatDetail extends AdminChatSession {
  messages: AdminChatMessage[];
}

export interface AdminChatStats {
  total: number;
  active: number;
  completed: number;
  emergency: number;
  captured: number;
  needsReview: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  specs: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  slug?: string;
  name: string;
  category: string;
  price: number;
  image?: string | null;
  specs?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface DoctorCategory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  experience: string;
  registrationNumber: string | null;
  image: string | null;
  isActive: boolean;
  categories: DoctorCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface DoctorInput {
  slug?: string;
  name: string;
  specialty: string;
  experience: string;
  registrationNumber?: string | null;
  image?: string | null;
  isActive?: boolean;
  categoryIds: string[];
}

// -------------------------------------------------------------
// AI Finance & Lead Scoring CRM Types
// -------------------------------------------------------------

export interface CategoryValuation {
  category: string;
  count: number;
  averagePrice: number;
  totalCatalogValue: number;
}

export interface FinancialInsightsData {
  catalogSummary: {
    totalActiveProducts: number;
    totalCatalogValue: number;
    averageProductPrice: number;
    categoryBreakdown: CategoryValuation[];
  };
  pipelineSummary: {
    totalLeads: number;
    qualifiedLeads: number;
    estimatedPipelineRevenue: number;
    averageLeadPotentialValue: number;
    highIntentLeadsCount: number;
  };
  executiveSummary: {
    overview: string;
    keyOpportunities: string[];
    bundlingRecommendations: string[];
    actionableAdvice: string;
  };
  generatedAt: string;
}

export interface FinanceQueryData {
  answer: string;
  relatedMetrics?: {
    totalPipelineRevenue: number;
    totalLeads: number;
  };
}

export type LeadTier = "HOT" | "WARM" | "COLD";

export interface LeadScoreFactors {
  contactCompleteness: number;
  complaintUrgency: number;
  clinicalRelevance: number;
  engagementScore: number;
}

export interface ScoredLead {
  leadId: string;
  sessionId: string;
  patientName: string;
  whatsapp: string | null;
  diabetesType: string | null;
  primaryComplaint: string | null;
  currentMedication: string | null;
  totalScore: number;
  tier: LeadTier;
  factors: LeadScoreFactors;
  recommendedProducts: string[];
  recommendedSpecialist: string;
  conversionSummary: string;
  whatsAppDraft: string;
  whatsAppLink: string | null;
  scoredAt: string;
}

export interface LeadBatchScoresData {
  stats: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    averageScore: number;
  };
  leads: ScoredLead[];
}

// -------------------------------------------------------------
// AI Pharmacy Inventory & Restock Forecasting Types
// -------------------------------------------------------------

export type StockStatus = "CRITICAL_REFILL" | "REORDER_RECOMMENDED" | "HEALTHY";

export interface ProductInventoryItem {
  productId: string;
  productName: string;
  category: string;
  price: number;
  estimatedCurrentStock: number;
  dailyDemandRate: number;
  runoutDays: number;
  stockStatus: StockStatus;
  recommendedReorderQty: number;
  estimatedReorderCost: number;
  demandSignalReasons: string[];
}

export interface InventoryForecastData {
  summary: {
    totalProductsTracked: number;
    criticalItemsCount: number;
    reorderRecommendedCount: number;
    healthyItemsCount: number;
    totalEstimatedReorderBudget: number;
    fastestDepletingProduct: string;
  };
  items: ProductInventoryItem[];
  aiExecutiveAdvice: {
    procurementSummary: string;
    priorityActions: string[];
    supplierStrategy: string;
  };
  generatedAt: string;
}

export interface InventoryQueryData {
  answer: string;
  relatedMetrics?: {
    criticalCount: number;
    totalBudget: number;
  };
}

// -------------------------------------------------------------
// Free User AI Agent: Daily Meal & Carb Planner Types
// -------------------------------------------------------------

export type DiabetesTypeOption = "TIPE_2" | "TIPE_1" | "PRA_DIABETES" | "GESTASIONAL" | "UMUM";
export type DietaryPreferenceOption = "hemat" | "standar" | "bebas_santan" | "vegetarian" | "rendah_garam";

export interface MealPlanInput {
  diabetesType?: DiabetesTypeOption;
  calorieTarget?: number;
  dietaryPreferences?: DietaryPreferenceOption;
  allergiesOrDislikes?: string;
}

export interface MealItem {
  mealType: "SARAPAN" | "SNACK_PAGI" | "MAKAN_SIANG" | "SNACK_SORE" | "MAKAN_MALAM";
  timeRecommendation: string;
  menuName: string;
  portion: string;
  carbsGrams: number;
  proteinGrams: number;
  calories: number;
  glycemicIndex: "RENDAH" | "SEDANG" | "TINGGI";
  tips: string;
}

export interface DailyPlanSummary {
  totalCalories: number;
  totalCarbsGrams: number;
  totalProteinGrams: number;
  totalFiberGrams: number;
  glycemicImpact: "RENDAH" | "SEDANG" | "TINGGI";
  nutritionAdvice: string;
  eatingSequenceTip: string;
}

export interface ProPlanPreview {
  bannerTitle: string;
  bannerDesc: string;
  ctaText: string;
  features: string[];
}

export interface MealPlanData {
  dailyPlanSummary: DailyPlanSummary;
  meals: MealItem[];
  proPlanPreview: ProPlanPreview;
  generatedAt: string;
}

