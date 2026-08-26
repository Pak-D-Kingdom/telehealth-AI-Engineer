import type { ChatIntent } from "../types/chat";
import { checkEmergencyFlag } from "./conversation-state.service";
import { shouldShowRelatedCare } from "./care-catalog.service";

const MEDICATION_PATTERN =
  /\b(obat|metformin|insulin|glp-?1|suplemen|resep|dosis|efek samping|interaksi obat)\b/i;
const MONITORING_PATTERN =
  /\b(gula darah|glukosa|hba1c|gdp|gds|glucometer|strip|cek gula|hasil pemeriksaan)\b/i;
const LIFESTYLE_PATTERN =
  /\b(makan|makanan|diet|karbohidrat|gula|olahraga|aktivitas fisik|tidur|berat badan)\b/i;
const DIABETES_PATTERN =
  /\b(diabetes|prediabetes|hipoglikemia|hiperglikemia|gestasional|resistensi insulin)\b/i;

export function classifyChatIntent(
  message: string,
  conversationContext = message,
): ChatIntent {
  if (checkEmergencyFlag(message)) return "EMERGENCY";
  if (shouldShowRelatedCare(message, conversationContext)) return "CARE_RECOMMENDATION";
  if (MEDICATION_PATTERN.test(message)) return "MEDICATION_INFORMATION";
  if (MONITORING_PATTERN.test(message)) return "GLUCOSE_MONITORING";
  if (LIFESTYLE_PATTERN.test(message)) return "LIFESTYLE_EDUCATION";
  if (DIABETES_PATTERN.test(message)) return "DIABETES_EDUCATION";
  return "GENERAL";
}
