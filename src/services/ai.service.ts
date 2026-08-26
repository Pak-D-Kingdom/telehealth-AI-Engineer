import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import type { ChatCompletionMessage } from "../types/chat";

interface CompletionOptions {
  jsonMode?: boolean;
  maxTokens?: number;
  model?: string;
  temperature?: number;
  isVision?: boolean;
  onMetrics?: (metrics: AIRequestMetrics) => void;
  onModelSelected?: (model: string) => void;
}

export interface AIRequestMetrics {
  model: string;
  gatewayAttempts: number;
  fallbackUsed: boolean;
  gatewayLatencyMs: number;
}

export type AIProviderState =
  | "READY"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED";

export interface AIModelStatus {
  model: string;
  status: AIProviderState;
  retryAfterSeconds?: number;
}

export interface AIProviderStatus extends AIModelStatus {
  provider: "groq" | "9router";
  models?: AIModelStatus[];
}

interface ModelHealth {
  rateLimitedUntil: number;
  unavailableUntil: number;
}

const PROVIDER_UNAVAILABLE_COOLDOWN_MS = 60_000;
const modelHealth = new Map<string, ModelHealth>();

/**
 * Returns all configured Groq API keys and OpenRouter API keys from process.env
 */
function getAllApiKeys(): { groqKeys: string[]; openRouterKeys: string[] } {
  const groqKeys: string[] = [];
  const openRouterKeys: string[] = [];

  for (const [key, value] of Object.entries(process.env)) {
    if (!value || typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.startsWith("gsk_") && !groqKeys.includes(trimmed)) {
      groqKeys.push(trimmed);
    } else if (trimmed.startsWith("sk-or-v1-") && !openRouterKeys.includes(trimmed)) {
      openRouterKeys.push(trimmed);
    }
  }

  if (groqKeys.length === 0 && env.GROQ_API_KEY) {
    groqKeys.push(env.GROQ_API_KEY);
  }

  return { groqKeys, openRouterKeys };
}

let currentGroqKeyIndex = 0;

export function getAIProviderStatus(model = env.GROQ_CHAT_MODEL): AIProviderStatus {
  const { groqKeys } = getAllApiKeys();
  if (groqKeys.length === 0 && !env.AI_GATEWAY_API_KEY) {
    return { provider: "groq", model, status: "NOT_CONFIGURED" };
  }

  const now = Date.now();
  const health = getModelHealth(model);

  if (health.rateLimitedUntil > now) {
    return {
      provider: "groq",
      model,
      status: "RATE_LIMITED",
      retryAfterSeconds: Math.max(1, Math.ceil((health.rateLimitedUntil - now) / 1000)),
    };
  }

  return { provider: "groq", model, status: "READY" };
}

/**
 * Executes an LLM completion with automatic multi-key rotation (Groq key 1..N -> OpenRouter -> Gateway)
 */
async function callLLMWithRotation(
  messages: Array<{ role: string; content: any; tool_calls?: any }>,
  model: string = env.GROQ_CHAT_MODEL,
  options: CompletionOptions = {},
): Promise<any> {
  const { groqKeys, openRouterKeys } = getAllApiKeys();
  const totalGroq = groqKeys.length;

  if (totalGroq === 0 && openRouterKeys.length === 0 && !env.AI_GATEWAY_API_KEY) {
    throw new AppError(503, "CHATBOT_NOT_CONFIGURED", "Layanan AI belum dikonfigurasi.");
  }

  const effectiveGroqModel = options.isVision
    ? "qwen/qwen3.6-27b"
    : (model || "openai/gpt-oss-120b");
  const effectiveOpenRouterModel = options.isVision
    ? "qwen/qwen-2.5-vl-72b-instruct"
    : "meta-llama/llama-3.3-70b-instruct";

  // 1. Try Groq Keys via Rotation
  for (let i = 0; i < totalGroq; i++) {
    const keyIndex = (currentGroqKeyIndex + i) % totalGroq;
    const apiKey = groqKeys[keyIndex]!;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: effectiveGroqModel,
          messages,
          max_tokens: options.maxTokens ?? 1000,
          temperature: options.temperature ?? 0.2,
          ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (response.status === 429) {
        console.warn(`[Key Rotation] Groq key index ${keyIndex} rate limited (429). Rotating...`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Key Rotation] Groq key index ${keyIndex} failed (${response.status}):`, errorText);
        continue;
      }

      currentGroqKeyIndex = (keyIndex + 1) % totalGroq;
      markModelReady(effectiveGroqModel);
      options.onModelSelected?.(effectiveGroqModel);
      return await response.json();
    } catch (err: any) {
      console.warn(`[Key Rotation] Error with Groq key index ${keyIndex}:`, err.message || err);
    }
  }

  // 2. OpenRouter Fallback / Primary for Vision
  if (openRouterKeys.length > 0) {
    for (const openRouterKey of openRouterKeys) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
          },
          body: JSON.stringify({
            model: effectiveOpenRouterModel,
            messages,
            max_tokens: options.maxTokens ?? 512,
          }),
        });

        if (response.ok) {
          options.onModelSelected?.(effectiveOpenRouterModel);
          return await response.json();
        } else {
          const errorText = await response.text();
          console.error("[Key Rotation] OpenRouter error:", response.status, errorText);
        }
      } catch (err) {
        console.error("[Key Rotation] OpenRouter attempt failed:", err);
      }
    }
  }

  // 3. AI Gateway Fallback (if configured)
  if (env.AI_GATEWAY_API_KEY) {
    try {
      const response = await fetch(`${env.AI_GATEWAY_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.AI_CHAT_MODEL || model,
          messages,
          max_tokens: options.maxTokens ?? 512,
          temperature: options.temperature ?? 0.2,
          ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error("[AI Gateway] Fallback attempt failed:", err);
    }
  }

  throw new AppError(503, "AI_RATE_LIMITED", "Layanan AI sedang mencapai batas penggunaan. Mohon coba lagi beberapa saat.");
}

export async function sendChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  const model = options.model ?? env.GROQ_CHAT_MODEL;
  const payloadMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const startTime = Date.now();

  try {
    const data = await callLLMWithRotation(payloadMessages, model, options);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(502, "INVALID_AI_RESPONSE", "Layanan AI mengembalikan respons kosong.");
    }
    options.onMetrics?.({
      model,
      gatewayAttempts: 1,
      fallbackUsed: false,
      gatewayLatencyMs: Date.now() - startTime,
    });
    return content.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "AI_PROVIDER_ERROR", `Layanan AI bermasalah: ${(error as any).message || error}`);
  }
}

export async function* streamChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  const { groqKeys, openRouterKeys } = getAllApiKeys();
  const payloadMessages = [{ role: "system", content: systemPrompt }, ...messages];

  // If Vision is requested, use OpenRouter
  if (options.isVision && openRouterKeys.length > 0) {
    for (const openRouterKey of openRouterKeys) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: payloadMessages,
            max_tokens: options.maxTokens ?? 512,
            stream: true,
          }),
        });

        if (response.ok && response.body) {
          options.onModelSelected?.("openai/gpt-4o-mini");
          for await (const data of readServerSentEvents(response.body)) {
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // ignore parse errors
            }
          }
          return;
        }
      } catch (err) {
        console.warn("[Stream AI] OpenRouter vision streaming failed:", err);
      }
    }
  }

  // Normal text streaming via Groq
  const model = options.model ?? env.GROQ_CHAT_MODEL;
  const apiKey = groqKeys[currentGroqKeyIndex] || env.GROQ_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          max_tokens: options.maxTokens ?? 512,
          temperature: options.temperature ?? 0.2,
          stream: true,
        }),
      });

      if (response.ok && response.body) {
        options.onModelSelected?.(model);
        for await (const data of readServerSentEvents(response.body)) {
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // ignore parse errors
          }
        }
        return;
      }
    } catch (err) {
      console.warn("[Stream AI] Groq streaming failed, attempting OpenRouter fallback...", err);
    }
  }

  // OpenRouter fallback for text streaming
  if (openRouterKeys.length > 0) {
    for (const openRouterKey of openRouterKeys) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct",
            messages: payloadMessages,
            max_tokens: options.maxTokens ?? 512,
            stream: true,
          }),
        });

        if (response.ok && response.body) {
          options.onModelSelected?.("meta-llama/llama-3.3-70b-instruct");
          for await (const data of readServerSentEvents(response.body)) {
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // ignore parse errors
            }
          }
          return;
        }
      } catch (err) {
        console.warn("[Stream AI] OpenRouter streaming fallback failed:", err);
      }
    }
  }

  throw new AppError(502, "INVALID_AI_RESPONSE", "Layanan AI tidak dapat mengalirkan respons.");
}

async function* readServerSentEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) yield data;
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

function getModelHealth(model: string) {
  const existing = modelHealth.get(model);
  if (existing) return existing;
  const health = { rateLimitedUntil: 0, unavailableUntil: 0 };
  modelHealth.set(model, health);
  return health;
}

function markModelReady(model: string) {
  const health = getModelHealth(model);
  health.rateLimitedUntil = 0;
  health.unavailableUntil = 0;
}
