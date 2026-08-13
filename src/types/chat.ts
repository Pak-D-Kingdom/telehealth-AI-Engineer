export interface ChatCompletionMessage {
  role: "user" | "assistant";
  content: string;
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

export interface ChatReply {
  sessionId: string;
  reply: string;
  leadComplete: boolean;
  isEmergency: boolean;
  sources: ChatSource[];
}
