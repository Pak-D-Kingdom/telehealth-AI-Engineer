import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import type { ChatCompletionMessage } from "../types/chat";

interface CompletionOptions {
  jsonMode?: boolean;
  maxTokens?: number;
  model?: string;
  onMetrics?: (metrics: AIRequestMetrics) => void;
  onModelSelected?: (model: string) => void;
  temperature?: number;
}

export interface AIRequestMetrics {
  model: string;
  gatewayAttempts: number;
  fallbackUsed: boolean;
  gatewayLatencyMs: number;
}

export type AIProviderState = "READY" | "RATE_LIMITED" | "UNAVAILABLE" | "NOT_CONFIGURED";

export interface AIModelStatus {
  model: string;
  status: AIProviderState;
  retryAfterSeconds?: number;
}

export interface AIProviderStatus extends AIModelStatus {
  provider: "9router";
  models?: AIModelStatus[];
}

interface ModelHealth {
  rateLimitedUntil: number;
  unavailableUntil: number;
}

const PROVIDER_UNAVAILABLE_COOLDOWN_MS = 60_000;
const PROVIDER_AUTH_COOLDOWN_MS = 5 * 60_000;
const MAX_ATTEMPTS_PER_MODEL = 2;
const modelHealth = new Map<string, ModelHealth>();

const chatCompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().min(1) }),
  })).min(1),
});

const chatStreamChunkSchema = z.object({
  choices: z.array(z.object({
    delta: z.object({ content: z.string().nullable().optional() }),
  })),
});

const gatewayErrorSchema = z.object({
  error: z.union([
    z.string(),
    z.object({
      code: z.string().optional(),
      type: z.string().optional(),
      message: z.string().optional(),
    }).passthrough(),
  ]),
}).passthrough();

export function getAIProviderStatus(model?: string): AIProviderStatus {
  if (model) return { provider: "9router", ...getAIModelStatus(model) };

  const configuredModels = getConfiguredChatModels();
  if (!env.AI_GATEWAY_API_KEY || configuredModels.length === 0) {
    return {
      provider: "9router",
      model: configuredModels[0] ?? "",
      status: "NOT_CONFIGURED",
      models: configuredModels.map((configuredModel) => ({
        model: configuredModel,
        status: "NOT_CONFIGURED",
      })),
    };
  }

  const models = configuredModels.map(getAIModelStatus);
  const ready = models.find((item) => item.status === "READY");
  if (ready) return { provider: "9router", ...ready, models };

  const rateLimited = models.find((item) => item.status === "RATE_LIMITED");
  if (rateLimited) return { provider: "9router", ...rateLimited, models };

  return { provider: "9router", ...models[0]!, models };
}

export async function sendChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  const { response } = await fetchCompletionWithFallback(messages, systemPrompt, options, false);
  const result = chatCompletionSchema.safeParse(await response.json().catch(() => undefined));

  if (!result.success) {
    throw new AppError(
      502,
      "INVALID_AI_RESPONSE",
      "Jawaban GlucoAssistant belum dapat diproses. Silakan coba lagi.",
    );
  }

  return result.data.choices[0]!.message.content.trim();
}

export async function* streamChatCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions = {},
) {
  const { response } = await fetchCompletionWithFallback(messages, systemPrompt, options, true);

  if (!response.body) {
    throw new AppError(
      502,
      "INVALID_AI_RESPONSE",
      "Jawaban GlucoAssistant belum dapat diterima. Silakan coba lagi.",
    );
  }

  for await (const data of readServerSentEvents(response.body)) {
    if (data === "[DONE]") return;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(data);
    } catch {
      throw new AppError(
        502,
        "INVALID_AI_RESPONSE",
        "Jawaban GlucoAssistant belum dapat diproses. Silakan coba lagi.",
      );
    }

    const chunk = chatStreamChunkSchema.safeParse(parsedJson);
    if (!chunk.success) {
      throw new AppError(
        502,
        "INVALID_AI_RESPONSE",
        "Jawaban GlucoAssistant belum dapat diproses. Silakan coba lagi.",
      );
    }

    const content = chunk.data.choices[0]?.delta.content;
    if (content) yield content;
  }
}

async function fetchCompletionWithFallback(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  options: CompletionOptions,
  stream: boolean,
) {
  const models = resolveCandidateModels(options.model);
  const requestStartedAt = Date.now();
  let gatewayAttempts = 0;
  let lastError: AppError | undefined;

  for (const [modelIndex, model] of models.entries()) {
    try {
      assertProviderAvailable(model);
    } catch (error) {
      lastError = normalizeProviderError(error, model);
      logGatewayRequest(model, stream, 0, "skipped", undefined, lastError.code);
      continue;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      gatewayAttempts += 1;
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetchCompletion(
          messages,
          systemPrompt,
          model,
          options,
          stream,
          controller.signal,
        );

        if (response.ok) {
          markModelReady(model);
          options.onModelSelected?.(model);
          options.onMetrics?.({
            model,
            gatewayAttempts,
            fallbackUsed: modelIndex > 0,
            gatewayLatencyMs: Date.now() - requestStartedAt,
          });
          logGatewayRequest(model, stream, attempt, "success", response.status, undefined, startedAt);
          return { response, model };
        }

        lastError = await createProviderError(response, model);
        logGatewayRequest(
          model,
          stream,
          attempt,
          "failed",
          response.status,
          lastError.code,
          startedAt,
        );

        if (lastError.code === "AI_GATEWAY_AUTH_ERROR") throw lastError;
        if (!shouldRetrySameModel(response.status, attempt)) break;
      } catch (error) {
        lastError = normalizeProviderError(error, model);
        logGatewayRequest(
          model,
          stream,
          attempt,
          "failed",
          undefined,
          lastError.code,
          startedAt,
        );

        if (lastError.code === "AI_GATEWAY_AUTH_ERROR") throw lastError;
        if (!shouldRetryNetworkError(lastError, attempt)) break;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw lastError ?? new AppError(
    503,
    "CHATBOT_NOT_CONFIGURED",
    "GlucoAssistant belum siap digunakan. Hubungi pengelola layanan.",
  );
}

async function fetchCompletion(
  messages: ChatCompletionMessage[],
  systemPrompt: string,
  model: string,
  options: CompletionOptions,
  stream: boolean,
  signal: AbortSignal,
) {
  return fetch(`${env.AI_GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.2,
      stream,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    signal,
  });
}

async function createProviderError(response: Response, model: string) {
  const errorBody = gatewayErrorSchema.safeParse(await response.json().catch(() => undefined));
  const providerCode = errorBody.success && typeof errorBody.data.error === "object"
    ? (errorBody.data.error.code ?? errorBody.data.error.type)
    : undefined;

  if (response.status === 429) {
    const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after")) ?? 60;
    getModelHealth(model).rateLimitedUntil = Date.now() + retryAfterSeconds * 1_000;
    return new AppError(
      503,
      "AI_RATE_LIMITED",
      "Banyak pengguna sedang memakai GlucoAssistant. Silakan tunggu sebentar lalu coba lagi.",
      { retryAfterSeconds },
    );
  }

  if (response.status === 401 || response.status === 403) {
    getModelHealth(model).unavailableUntil = Date.now() + PROVIDER_AUTH_COOLDOWN_MS;
    return new AppError(
      503,
      "AI_GATEWAY_AUTH_ERROR",
      "GlucoAssistant sedang tidak tersedia karena pengaturan layanan perlu diperbaiki.",
      { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_AUTH_COOLDOWN_MS) },
    );
  }

  markModelUnavailable(model);
  return new AppError(
    502,
    "AI_GATEWAY_ERROR",
    "GlucoAssistant sedang tidak dapat menjawab. Silakan coba lagi beberapa saat.",
    {
      retryAfterSeconds: toRetryAfterSeconds(PROVIDER_UNAVAILABLE_COOLDOWN_MS),
      ...(providerCode ? { providerCode } : {}),
    },
  );
}

function assertProviderAvailable(model: string) {
  const status = getAIModelStatus(model);

  if (status.status === "NOT_CONFIGURED") {
    throw new AppError(503, "CHATBOT_NOT_CONFIGURED", "GlucoAssistant belum siap digunakan. Hubungi pengelola layanan.");
  }
  if (status.status === "RATE_LIMITED") {
    throw new AppError(
      503,
      "AI_RATE_LIMITED",
      "Banyak pengguna sedang memakai GlucoAssistant. Silakan tunggu sebentar lalu coba lagi.",
      { retryAfterSeconds: status.retryAfterSeconds },
    );
  }
  if (status.status === "UNAVAILABLE") {
    throw new AppError(
      503,
      "AI_GATEWAY_UNAVAILABLE",
      "GlucoAssistant sedang tidak dapat menjawab. Silakan coba lagi beberapa saat.",
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
      "GlucoAssistant membutuhkan waktu terlalu lama untuk menjawab. Silakan coba lagi.",
      { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_UNAVAILABLE_COOLDOWN_MS) },
    );
  }

  return new AppError(
    502,
    "AI_GATEWAY_ERROR",
    "GlucoAssistant sedang tidak dapat menjawab. Silakan coba lagi beberapa saat.",
    { retryAfterSeconds: toRetryAfterSeconds(PROVIDER_UNAVAILABLE_COOLDOWN_MS) },
  );
}

function resolveCandidateModels(override?: string) {
  const models = override ? [override] : getConfiguredChatModels();
  if (models.length === 0) {
    throw new AppError(503, "CHATBOT_NOT_CONFIGURED", "GlucoAssistant belum siap digunakan. Hubungi pengelola layanan.");
  }
  return models;
}

function getConfiguredChatModels() {
  return [...new Set([
    ...(env.AI_CHAT_MODEL ? [env.AI_CHAT_MODEL] : []),
    ...(env.AI_CHAT_FALLBACK_MODELS ?? []),
  ])];
}

function getAIModelStatus(model: string): AIModelStatus {
  if (!env.AI_GATEWAY_API_KEY || !model) return { model, status: "NOT_CONFIGURED" };

  const now = Date.now();
  const health = getModelHealth(model);
  if (health.rateLimitedUntil > now) {
    return {
      model,
      status: "RATE_LIMITED",
      retryAfterSeconds: toRetryAfterSeconds(health.rateLimitedUntil - now),
    };
  }
  if (health.unavailableUntil > now) {
    return {
      model,
      status: "UNAVAILABLE",
      retryAfterSeconds: toRetryAfterSeconds(health.unavailableUntil - now),
    };
  }
  return { model, status: "READY" };
}

function shouldRetrySameModel(status: number, attempt: number) {
  return attempt < MAX_ATTEMPTS_PER_MODEL && (status === 408 || status >= 500);
}

function shouldRetryNetworkError(error: AppError, attempt: number) {
  return attempt < MAX_ATTEMPTS_PER_MODEL && error.code === "AI_GATEWAY_ERROR";
}

function logGatewayRequest(
  model: string,
  stream: boolean,
  attempt: number,
  outcome: "success" | "failed" | "skipped",
  status?: number,
  code?: string,
  startedAt?: number,
) {
  console.info(JSON.stringify({
    event: "ai_gateway_request",
    provider: "9router",
    operation: stream ? "chat_stream" : "chat_completion",
    model,
    attempt,
    outcome,
    ...(status ? { status } : {}),
    ...(code ? { code } : {}),
    ...(startedAt ? { latencyMs: Date.now() - startedAt } : {}),
  }));
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
