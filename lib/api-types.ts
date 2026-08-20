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

export type ReportChartType = "bar" | "line" | "doughnut" | "table" | "ranking";

export interface ReportChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  color?: string;
  percentage?: number;
  formattedValue?: string;
}

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface ReportKPI {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  description?: string;
}

export interface ReportKeyTakeaway {
  title: string;
  description: string;
  type: "positive" | "warning" | "neutral" | "danger";
}

export interface ReportRecommendation {
  action: string;
  impact: "Tinggi" | "Sedang" | "Rendah";
  department: string;
}

export interface AdminAiReportResult {
  title: string;
  summary: string;
  timeRange: string;
  chartType: ReportChartType;
  dimensionLabel?: string;
  metricLabel?: string;
  secondaryMetricLabel?: string;
  unit?: string;
  chartData?: ReportChartDataPoint[];
  tableColumns?: ReportTableColumn[];
  tableRows?: Record<string, string | number | boolean | null>[];
  kpis?: ReportKPI[];
  takeaways?: ReportKeyTakeaway[];
  recommendations?: ReportRecommendation[];
  sqlQueryUsed?: string;
  tablesReferenced?: string[];
  generatedAt: string;
  confidenceScore: number;
}

export interface AdminAiReportQueryRequest {
  query: string;
  timeRange?: "7d" | "30d" | "90d" | "all";
}

