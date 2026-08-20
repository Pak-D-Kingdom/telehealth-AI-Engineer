import { z } from "zod";
import { env } from "../config/env";
import type { ChatCompletionMessage, LeadData } from "../types/chat";
import { sendChatCompletion } from "./ai.service";

const extractedLeadSchema = z.object({
  name: z.string().trim().min(1).max(160).nullish(),
  whatsapp: z.string().trim().min(1).max(40).nullish(),
  diabetesType: z.string().trim().min(1).max(80).nullish(),
  currentMedication: z.string().trim().min(1).max(2_000).nullish(),
  primaryComplaint: z.string().trim().min(1).max(2_000).nullish(),
});

const EMERGENCY_PHRASES = [
  "pingsan",
  "kejang",
  "sesak napas",
  "sesak nafas",
  "tidak sadar",
  "tidak sadarkan diri",
  "koma",
  "napas bau aseton",
  "kebingungan berat",
  "muntah terus-menerus",
  "muntah terus menerus",
];

export function checkEmergencyFlag(message: string) {
  const normalized = message.toLocaleLowerCase("id-ID");
  return EMERGENCY_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function isLeadComplete(lead: LeadData) {
  return Boolean(lead.name?.trim() && lead.whatsapp?.trim() && lead.diabetesType?.trim());
}

export async function extractLeadData(
  conversation: ChatCompletionMessage[],
  currentLead: LeadData,
) {
  const systemPrompt = `Ekstrak data yang dinyatakan pengguna secara eksplisit dari percakapan: name, whatsapp, diabetesType, currentMedication, primaryComplaint.
Balas hanya JSON valid dengan kelima key tersebut. Gunakan null jika tidak diketahui. Jangan mengambil ucapan assistant sebagai data pengguna dan jangan mengarang data.`;

  try {
    const response = await sendChatCompletion(conversation, systemPrompt, {
      jsonMode: true,
      maxTokens: 400,
      model: env.GROQ_EXTRACTION_MODEL,
      temperature: 0,
    });
    const extracted = extractedLeadSchema.parse(JSON.parse(response));

    return {
      name: extracted.name ?? currentLead.name,
      whatsapp: extracted.whatsapp ?? currentLead.whatsapp,
      diabetesType: extracted.diabetesType ?? currentLead.diabetesType,
      currentMedication: extracted.currentMedication ?? currentLead.currentMedication,
      primaryComplaint: extracted.primaryComplaint ?? currentLead.primaryComplaint,
    } satisfies LeadData;
  } catch (error) {
    console.error("Ekstraksi lead gagal; data lama dipertahankan.", error);
    return currentLead;
  }
}
