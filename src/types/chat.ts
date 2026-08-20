export interface ChatCompletionMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  image?: string;
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
  specs: string | null;
  description: string | null;
}

export interface DoctorRef {
  name: string;
  specialty: string;
  experience: string;
  image: string;
  query: string;
}

export interface ChatReply {
  sessionId: string;
  reply: string;
  leadComplete: boolean;
  isEmergency: boolean;
  sbarComplete?: boolean;
  sources: ChatSource[];
  products?: ProductRef[];
  doctorReferral?: DoctorRef;
  suggestions?: string[];
}
