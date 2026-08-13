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
