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
  "nyeri dada",
  "sakit dada hebat",
  "sulit bernapas",
  "sulit bernafas",
  "bibir kebiruan",
  "lemah sebelah badan",
  "wajah mencong",
  "bicara pelo",
  "perdarahan hebat",
];

const KETOACIDOSIS_WARNING_PHRASES = [
  "keton",
  "napas bau aseton",
  "nafas bau aseton",
  "muntah",
  "nyeri perut",
  "kebingungan",
  "sulit bernapas",
  "sulit bernafas",
];

export function checkEmergencyFlag(message: string) {
  const normalized = message.toLocaleLowerCase("id-ID");
  if (EMERGENCY_PHRASES.some((phrase) => normalized.includes(phrase))) return true;

  const glucoseValues = [...normalized.matchAll(
    /(?:gula darah|glukosa|gds|gdp)\D{0,20}(\d{2,3})\s*(?:mg\/?dl)?/g,
  )].map((match) => Number(match[1]));

  return glucoseValues.some((value) =>
    value <= 54 ||
    value >= 600 ||
    (value >= 300 && KETOACIDOSIS_WARNING_PHRASES.some((phrase) => normalized.includes(phrase)))
  );
}

export function isLeadComplete(lead: LeadData) {
  return Boolean(
    lead.name?.trim() &&
    normalizeWhatsappNumber(lead.whatsapp) &&
    lead.diabetesType?.trim(),
  );
}

export function normalizeWhatsappNumber(value: string | null | undefined) {
  if (!value) return undefined;

  let digits = value.trim().replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");

  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;

  return /^628\d{7,11}$/.test(digits) ? `+${digits}` : undefined;
}

export async function extractLeadData(
  conversation: ChatCompletionMessage[],
  currentLead: LeadData,
) {
  const systemPrompt = `Ekstrak data yang dinyatakan pengguna secara eksplisit dari pesan pengguna: name, whatsapp, diabetesType, currentMedication, primaryComplaint.
Balas hanya JSON valid dengan kelima key tersebut. Gunakan null jika tidak diketahui. Nomor whatsapp harus benar-benar dinyatakan sebagai nomor kontak, bukan angka hasil pemeriksaan. Jangan mengarang data.`;

  const userMessages = conversation.filter((message) => message.role === "user");
  if (userMessages.length === 0) return currentLead;

  try {
    const response = await sendChatCompletion(userMessages, systemPrompt, {
      jsonMode: true,
      maxTokens: 400,
      model: env.AI_EXTRACTION_MODEL ?? env.AI_CHAT_MODEL,
      temperature: 0,
    });
    const extracted = extractedLeadSchema.parse(parseJsonObject(response));

    const whatsapp = normalizeWhatsappNumber(extracted.whatsapp)
      ?? normalizeWhatsappNumber(currentLead.whatsapp);

    return {
      name: extracted.name ?? currentLead.name,
      whatsapp,
      diabetesType: extracted.diabetesType ?? currentLead.diabetesType,
      currentMedication: extracted.currentMedication ?? currentLead.currentMedication,
      primaryComplaint: extracted.primaryComplaint ?? currentLead.primaryComplaint,
    } satisfies LeadData;
  } catch (error) {
    console.warn(JSON.stringify({
      event: "lead_extraction_failed",
      code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    }));
    return currentLead;
  }
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const firstBrace = value.indexOf("{");
    const lastBrace = value.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) throw new SyntaxError("JSON object tidak ditemukan.");
    return JSON.parse(value.slice(firstBrace, lastBrace + 1));
  }
}
