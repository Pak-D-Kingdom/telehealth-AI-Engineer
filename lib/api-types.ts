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
export type ChatFeedbackRating = "HELPFUL" | "NOT_HELPFUL";
export type ChatFeedbackReason =
  | "IRRELEVANT"
  | "UNCLEAR"
  | "TOO_LONG"
  | "INCORRECT"
  | "OTHER";

export interface ChatFeedback {
  rating: ChatFeedbackRating;
  reason?: ChatFeedbackReason | null;
  comment?: string | null;
  updatedAt: string;
}

export interface RelatedCareProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  guidance: string;
  requiresPrescription: boolean;
}

export interface RelatedCareDoctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  experience: string;
  image: string | null;
}

export interface SuggestedReply {
  id: string;
  label: string;
  message: string;
}

export interface RelatedCareOptions {
  reason: string;
  disclaimer: string;
  products: RelatedCareProduct[];
  doctors: RelatedCareDoctor[];
  suggestedReplies?: SuggestedReply[];
}

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
  consentAt: string | null;
  consentVersion: string | null;
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
  modelUsed: string | null;
  intent: string | null;
  responseLatencyMs: number | null;
  gatewayLatencyMs: number | null;
  gatewayAttempts: number | null;
  fallbackUsed: boolean | null;
  retrievalStatus: string | null;
  retrievalLatencyMs: number | null;
  retrievalMatchCount: number | null;
  retrievalTopSimilarity: number | null;
  feedback: ChatFeedback | null;
  relatedCare: RelatedCareOptions | null;
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
  feedbackHelpful: number;
  feedbackNotHelpful: number;
  helpfulRate: number | null;
  ragErrors: number;
  fallbackResponses: number;
  averageResponseLatencyMs: number | null;
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
