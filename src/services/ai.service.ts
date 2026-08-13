import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import type { ChatCompletionMessage } from "../types/chat";

interface CompletionOptions {
  jsonMode?: boolean;
  maxTokens?: number;
  model?: string;
  temperature?: number;
}

const groqResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string().min(1) }),
    }),
  ).min(1),
});

const groqErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    type: z.string().optional(),
  }),
});

export async function sendChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  if (!env.GROQ_API_KEY) {
    throw new AppError(
      503,
      "CHATBOT_NOT_CONFIGURED",
      "Layanan chatbot belum dikonfigurasi. Hubungi administrator.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model ?? env.GROQ_CHAT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.2,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = groqErrorSchema.safeParse(await response.json().catch(() => undefined));
      const providerCode = errorBody.success
        ? (errorBody.data.error.code ?? errorBody.data.error.type)
        : undefined;
      console.error(
        `Groq API gagal dengan status ${response.status}${providerCode ? ` (${providerCode})` : ""}.`,
      );

      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
        throw new AppError(
          503,
          "AI_RATE_LIMITED",
          "Layanan AI sedang mencapai batas penggunaan. Silakan coba lagi beberapa saat.",
          retryAfterSeconds ? { retryAfterSeconds } : undefined,
        );
      }

      throw new AppError(
        502,
        "AI_PROVIDER_ERROR",
        "Layanan AI sedang tidak tersedia. Silakan coba kembali.",
      );
    }

    const result = groqResponseSchema.safeParse(await response.json());
    if (!result.success) {
      throw new AppError(
        502,
        "INVALID_AI_RESPONSE",
        "Layanan AI mengembalikan respons yang tidak valid.",
      );
    }

    return result.data.choices[0]!.message.content.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "AI_TIMEOUT", "Layanan AI terlalu lama merespons.");
    }

    throw new AppError(
      502,
      "AI_PROVIDER_ERROR",
      "Layanan AI sedang tidak tersedia. Silakan coba kembali.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}
