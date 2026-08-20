import { prisma } from "../../lib/prisma";
import type { ChatCompletionMessage } from "../../types/chat";

export const VISION_SYSTEM_PROMPT = `You are the specialized Vision Clinical & Nutritional AI Agent for GlucoCare.
Your role is to analyze images uploaded by the user, which are typically:
1. Medical Lab Results / Surat Lab (e.g. Tes Gula Darah Puasa, HbA1c, Profil Lipid, Fungsi Ginjal/Kreatinin, Urin).
2. Food & Meal Photos / Foto Makanan (to estimate Glycemic Index, Carbs, Calories, and Diabetic suitability).
3. Physical symptoms (e.g., wound or skin condition).

Guidelines:
- If analyzing a LAB RESULT:
  * Extract and transcribe the key test names, values, units, and reference ranges.
  * Clearly highlight if values are Normal, High, or Low (e.g. HbA1c > 6.5% indicates Diabetes).
  * Explain what it means in simple Indonesian without making an absolute final diagnosis.
  * Advise consulting their physician for medication adjustments.

- If analyzing FOOD / NUTRITION:
  * Identify the items on the plate (e.g., Nasi putih, Ayam goreng, Sayur bayam).
  * Estimate the portion, total estimated Calories, and total Carbohydrates.
  * Evaluate the Glycemic Index (GI: Low / Medium / High).
  * Give practical advice for diabetic patients (e.g. "Ganti nasi putih dengan nasi merah atau perbanyak sayur untuk menurunkan lonjakan glukosa").

- If analyzing WOUNDS / PHYSICAL SIGNS:
  * Provide safe first-aid hygiene advice.
  * Urgently recommend specialist consultation if signs of infection (pus, swelling, redness) are present.

Keep your tone empathetic, professional, and in Indonesian.`;

export async function prepareVisionResponse(
  sessionId: string,
  userMessage: string,
  imageBase64: string,
): Promise<{
  sessionId: string;
  history: ChatCompletionMessage[];
  systemPrompt: string;
  sources: [];
  isEmergency: boolean;
  userMessage: string;
  isVision: boolean;
}> {
  // Store message in DB (note that we store the text prompt, image can be prepended or logged)
  const displayContent = userMessage ? `${userMessage}\n[Foto Terlampir]` : `[Mengirim Foto untuk Dianalisis]`;

  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "USER",
      content: displayContent,
    },
  });

  // Ensure Base64 format is standardized with data url prefix
  const formattedImageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  // Formulate Multimodal message
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    {
      type: "text",
      text: userMessage || "Tolong analisis dan jelaskan gambar yang saya lampirkan ini.",
    },
    {
      type: "image_url",
      image_url: {
        url: formattedImageUrl,
      },
    },
  ];

  const history: ChatCompletionMessage[] = [
    {
      role: "user",
      content: userContent as any,
    },
  ];

  return {
    sessionId,
    history,
    systemPrompt: VISION_SYSTEM_PROMPT,
    sources: [],
    isEmergency: false,
    userMessage: displayContent,
    isVision: true,
  };
}
