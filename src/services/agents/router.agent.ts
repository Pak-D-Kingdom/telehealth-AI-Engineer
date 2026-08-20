import { sendChatCompletion } from "../ai.service";
import type { ChatCompletionMessage } from "../../types/chat";

const ROUTER_SYSTEM_PROMPT = `You are a medical AI intent router for GlucoCare, a diabetes telehealth assistant.
Your job is to analyze the user's latest message (and brief history if needed) and classify the INTENT into exactly one of the following categories:

1. "TRIAGE": The user is reporting a medical symptom, complaining about a physical condition, asking for a diagnosis, or expressing an emergency/urgent health concern (e.g., "Kaki saya luka bernanah", "Saya merasa sangat lemas", "Kepala saya pusing berputar", "Gula darah saya drop 50").
2. "EDUCATION": The user is asking for general information, theory, definitions, nutritional advice, how to use a device, or drug information (e.g., "Apa itu HbA1c?", "Berapa kalori nasi putih?", "Kapan harus minum Metformin?", "Cara pakai glukometer").

You must return a valid JSON object strictly matching this schema:
{
  "intent": "TRIAGE" | "EDUCATION"
}`;

export async function routeUserIntent(
  userMessage: string,
  history: ChatCompletionMessage[],
): Promise<"TRIAGE" | "EDUCATION"> {
  try {
    const payloadHistory: ChatCompletionMessage[] = [
      ...history.slice(-3), // Only care about the very recent context
      { role: "user", content: userMessage },
    ];

    const response = await sendChatCompletion(payloadHistory, ROUTER_SYSTEM_PROMPT, {
      jsonMode: true,
      maxTokens: 100,
      temperature: 0.1, // Low temp for deterministic classification
    });

    if (!response) {
      return "EDUCATION";
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
    console.error("[Router Agent] Error routing message:", error);
    throw error;
  }
}
