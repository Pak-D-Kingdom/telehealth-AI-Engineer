export interface ChatCompletionMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatIntent =
  | "EMERGENCY"
  | "CARE_RECOMMENDATION"
  | "MEDICATION_INFORMATION"
  | "GLUCOSE_MONITORING"
  | "LIFESTYLE_EDUCATION"
  | "DIABETES_EDUCATION"
  | "GENERAL";

export type ChatFeedbackRating = "HELPFUL" | "NOT_HELPFUL";
export type ChatFeedbackReason =
  | "IRRELEVANT"
  | "UNCLEAR"
  | "TOO_LONG"
  | "INCORRECT"
  | "OTHER";

export interface ChatFeedback {
  rating: ChatFeedbackRating;
  reason?: ChatFeedbackReason;
  comment?: string;
  updatedAt: Date;
}

export interface LeadData {
  name?: string;
  whatsapp?: string;
  diabetesType?: string;
  currentMedication?: string;
  primaryComplaint?: string;
}

export interface ChatSource {
  title: string;
  source: string;
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

export interface RelatedCareOptions {
  reason: string;
  disclaimer: string;
  products: RelatedCareProduct[];
  doctors: RelatedCareDoctor[];
}

export interface ChatReply {
  messageId: string;
  sessionId: string;
  reply: string;
  leadComplete: boolean;
  isEmergency: boolean;
  sources: ChatSource[];
  modelUsed?: string;
  relatedCare?: RelatedCareOptions;
}
