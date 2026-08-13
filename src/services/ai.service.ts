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

export type AIProviderState =
  | "READY"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED";

export interface AIProviderStatus {
  provider: "groq";
  model: string;
  status: AIProviderState;
  retryAfterSeconds?: number;
}

interface ModelHealth {
  rateLimitedUntil: number;
  unavailableUntil: number;
}

const PROVIDER_UNAVAILABLE_COOLDOWN_MS = 60_000;
const PROVIDER_AUTH_COOLDOWN_MS = 5 * 60_000;
const modelHealth = new Map<string, ModelHealth>();

const groqResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string().min(1) }),
    }),
  ).min(1),
});

const groqStreamChunkSchema = z.object({
  choices: z.array(
    z.object({
      delta: z.object({ content: z.string().nullable().optional() }),
    }),
  ),
});

const groqErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    type: z.string().optional(),
  }),
});

export function getAIProviderStatus(model = env.GROQ_CHAT_MODEL): AIProviderStatus {
  if (!env.GROQ_API_KEY) {
    return { provider: "groq", model, status: "NOT_CONFIGURED" };
  }

  const now = Date.now();
  const health = getModelHealth(model);

  if (health.rateLimitedUntil > now) {
    return {
      provider: "groq",
      model,
      status: "RATE_LIMITED",
      retryAfterSeconds: toRetryAfterSeconds(health.rateLimitedUntil - now),
    };
  }

  if (health.unavailableUntil > now) {
    return {
      provider: "groq",
      model,
      status: "UNAVAILABLE",
      retryAfterSeconds: toRetryAfterSeconds(health.unavailableUntil - now),
    };
  }

  return { provider: "groq", model, status: "READY" };
}

export async function sendChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  const model = options.model ?? env.GROQ_CHAT_MODEL;
  assertProviderAvailable(model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchCompletion(messages, systemPrompt, model, options, false, controller);

    if (!response.ok) {
      throw await createProviderError(response, model);
    }

    markModelReady(model);
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
    throw normalizeProviderError(error, model);
  } finally {
    clearTimeout(timeout);
  }
}

export async function* streamChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  const model = options.model ?? env.GROQ_CHAT_MODEL;
  assertProviderAvailable(model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchCompletion(messages, systemPrompt, model, options, true, controller);

    if (!response.ok) {
      throw await createProviderError(response, model);
    }

    if (!response.body) {
      throw new AppError(
        502,
        "INVALID_AI_RESPONSE",
        "Layanan AI tidak mengembalikan stream respons.",
      );
    }

    markModelReady(model);
    for await (const data of readServerSentEvents(response.body)) {
      if (data === "[DONE]") return;

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(data);
      } catch {
        throw new AppError(
          502,
          "INVALID_AI_RESPONSE",
          "Layanan AI mengembalikan stream yang tidak valid.",
        );
      }

      const chunk = groqStreamChunkSchema.safeParse(parsedJson);
      if (!chunk.success) {
        throw new AppError(
          502,
          "INVALID_AI_RESPONSE",
          "Layanan AI mengembalikan stream yang tidak valid.",
        );
      }

      const content = chunk.data.choices[0]?.delta.content;
      if (content) yield content;
    }
  } catch (error) {
    throw normalizeProviderError(error, model);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  model: string,
  options: CompletionOptions,
  stream: boolean,
  controller: AbortController,
) {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.2,
      stream,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: controller.signal,
  });
}

async function createProviderError(response: Response, model: string) {
  const errorBody = groqErrorSchema.safeParse(await response.json().catch(() => undefined));
  const providerCode = errorBody.success
    ? (errorBody.data.error.code ?? errorBody.data.error.type)
    : undefined;
  console.error(
    `Groq API gagal dengan status ${response.status}${providerCode ? ` (${providerCode})` : ""}.`,
  );

  if (response.status === 429) {
    const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after")) ?? 60;
    getModelHealth(model).rateLimitedUntil = Date.now() + retryAfterSeconds * 1_000;
    return new AppError(
      503,
      "AI_RATE_LIMITED",
      "Layanan AI sedang mencapai batas penggunaan. Silakan coba lagi beberapa saat.",
      { retryAfterSeconds },
    );
  }

  if (response.status === 401 || response.status === 403) {
    getModelHealth(model).unavailableUntil = Date.now() + PROVIDER_AUTH_COOLDOWN_MS;
    return new AppError(
      503,
      "AI_PROVIDER_AUTH_ERROR",
      "Konfigurasi layanan AI ditolak oleh provider. Hubungi administrator.",
      { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_AUTH_COOLDOWN_MS) },
    );
  }

  markModelUnavailable(model);
  return new AppError(
    502,
    "AI_PROVIDER_ERROR",
    "Layanan AI sedang tidak tersedia. Silakan coba kembali.",
    { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_UNAVAILABLE_COOLDOWN_MS) },
  );
}

function assertProviderAvailable(model: string) {
  const status = getAIProviderStatus(model);

  if (status.status === "NOT_CONFIGURED") {
    throw new AppError(
      503,
      "CHATBOT_NOT_CONFIGURED",
      "Layanan chatbot belum dikonfigurasi. Hubungi administrator.",
    );
  }

  if (status.status === "RATE_LIMITED") {
    throw new AppError(
      503,
      "AI_RATE_LIMITED",
      "Layanan AI sedang mencapai batas penggunaan. Silakan coba lagi beberapa saat.",
      { retryAfterSeconds: status.retryAfterSeconds },
    );
  }

  if (status.status === "UNAVAILABLE") {
    throw new AppError(
      503,
      "AI_PROVIDER_UNAVAILABLE",
      "Layanan AI sedang tidak tersedia. Silakan coba kembali.",
      { retryAfterSeconds: status.retryAfterSeconds },
    );
  }
}

function normalizeProviderError(error: unknown, model: string) {
  if (error instanceof AppError) return error;

  markModelUnavailable(model);
  if (error instanceof Error && error.name === "AbortError") {
    return new AppError(
      504,
      "AI_TIMEOUT",
      "Layanan AI terlalu lama merespons.",
      { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_UNAVAILABLE_COOLDOWN_MS) },
    );
  }

  return new AppError(
    502,
    "AI_PROVIDER_ERROR",
    "Layanan AI sedang tidak tersedia. Silakan coba kembali.",
    { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_UNAVAILABLE_COOLDOWN_MS) },
  );
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

    const data = buffer
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) yield data;
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

function markModelUnavailable(model: string) {
  getModelHealth(model).unavailableUntil = Date.now() + PROVIDER_UNAVAILABLE_COOLDOWN_MS;
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(1, Math.ceil((timestamp - Date.now()) / 1_000));
}

function toRetryAfterSeconds(milliseconds: number) {
  return Math.max(1, Math.ceil(milliseconds / 1_000));
}
