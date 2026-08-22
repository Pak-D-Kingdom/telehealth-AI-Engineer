import { sendChatCompletion } from "../ai.service";
import type { ChatCompletionMessage } from "../../types/chat";

const ROUTER_SYSTEM_PROMPT = `You are a medical AI intent router for GlucoCare, a diabetes telehealth assistant.
Your job is to analyze the user's latest message (and brief history if needed) and classify the INTENT into exactly one of the following categories:

1. "TRIAGE": The user is reporting a medical symptom, complaining about a physical condition, answering an intake nurse question (e.g. duration "sejak 5 bulan lalu", pain scale, symptoms), asking for a diagnosis, or expressing an emergency/urgent health concern (e.g., "Kaki saya luka bernanah", "Saya merasa sangat lemas", "Kepala saya pusing berputar", "Gula darah saya drop 50", "sejak 5 bulan yang lalu").
2. "EDUCATION": The user is asking for general information, theory, definitions, nutritional advice, how to use a device, or drug information (e.g., "Apa itu HbA1c?", "Berapa kalori nasi putih?", "Kapan harus minum Metformin?", "Cara pakai glukometer").

Return JSON:
{
  "intent": "TRIAGE" | "EDUCATION"
}`;

export async function routeUserIntent(
  userMessage: string,
  history: ChatCompletionMessage[],
): Promise<"TRIAGE" | "EDUCATION"> {
  try {
    const payloadHistory: ChatCompletionMessage[] = [
      ...history.slice(-3),
      { role: "user", content: `Analisis intensi pesan berikut dan balas format JSON: "${userMessage}"` },
    ];

    const response = await sendChatCompletion(payloadHistory, ROUTER_SYSTEM_PROMPT, {
      model: process.env.GROQ_EXTRACTION_MODEL || "llama-3.1-8b-instant",
      maxTokens: 100,
      temperature: 0.1,
    });

    if (!response) {
      return fallbackHeuristic(userMessage, history);
    }

    let cleaned = response.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const match = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : cleaned;
    const parsed = JSON.parse(jsonStr);

    if (parsed.intent === "TRIAGE" || (typeof parsed.intent === "string" && parsed.intent.toUpperCase() === "TRIAGE")) {
      return "TRIAGE";
    }

    return "EDUCATION";
  } catch (error) {
    console.warn("[Router Agent] Error routing message, using resilient heuristic fallback:", error);
    return fallbackHeuristic(userMessage, history);
  }
}

function fallbackHeuristic(userMessage: string, history: ChatCompletionMessage[]): "TRIAGE" | "EDUCATION" {
  const lower = userMessage.toLowerCase();
  
  // If recent context was triage or medical complaint
  const lastHistory = history.slice(-2).map((h) => (typeof h.content === "string" ? h.content.toLowerCase() : "")).join(" ");
  if (
    lastHistory.includes("sejak kapan") ||
    lastHistory.includes("luka") ||
    lastHistory.includes("gejala") ||
    lastHistory.includes("keluhan") ||
    lastHistory.includes("triage")
  ) {
    return "TRIAGE";
  }

  if (
    lower.includes("luka") ||
    lower.includes("sakit") ||
    lower.includes("lemas") ||
    lower.includes("pusing") ||
    lower.includes("drop") ||
    lower.includes("gemetar") ||
    lower.includes("kebas") ||
    lower.includes("kesemutan") ||
    lower.includes("bulan") ||
    lower.includes("minggu") ||
    lower.includes("hari")
  ) {
    return "TRIAGE";
  }

  return "EDUCATION";
}
