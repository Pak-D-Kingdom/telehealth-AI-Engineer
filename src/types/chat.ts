export interface ChatCompletionMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  image?: string;
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

export interface ProductRef {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  specs?: string | null;
  description?: string | null;
}

export interface DoctorRef {
  name: string;
  specialty: string;
  experience: string;
  image: string;
  query: string;
}

export interface RelatedCareProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string | null;
  guidance?: string;
  requiresPrescription?: boolean;
}

export interface RelatedCareDoctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  experience: string;
  image: string | null;
  nextAvailability?: {
    slotId: string;
    mode: "ONLINE" | "OFFLINE";
    startsAt: string;
    endsAt: string;
    price: number;
    clinic: {
      name: string;
      city: string;
    } | null;
  };
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
  suggestedReplies: SuggestedReply[];
}

export interface ChatReply {
  messageId?: string;
  sessionId: string;
  reply: string;
  leadComplete: boolean;
  isEmergency: boolean;
  sbarComplete?: boolean;
  sources: ChatSource[];
  modelUsed?: string;
  products?: ProductRef[];
  doctorReferral?: DoctorRef;
  suggestions?: string[];
  relatedCare?: RelatedCareOptions;
}
