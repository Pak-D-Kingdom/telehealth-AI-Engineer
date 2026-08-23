import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";

const EMBEDDING_DIMENSIONS = 3_072;

const embeddingResponseSchema = z.object({
  data: z.array(z.object({
    embedding: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS),
  })).min(1),
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

interface KnowledgeMatch {
  title: string;
  content: string;
  source: string;
  similarity: number;
}

export type RetrievalStatus = "SUCCESS" | "NOT_CONFIGURED" | "ERROR";

export interface RetrievalMetrics {
  status: RetrievalStatus;
  latencyMs: number;
  matchCount: number;
  topSimilarity?: number;
}

export interface RetrievalResult {
  references: KnowledgeMatch[];
  metrics: RetrievalMetrics;
}

export async function generateEmbedding(text: string) {
  if (!env.AI_GATEWAY_API_KEY || !env.AI_EMBEDDING_MODEL) {
    throw new AppError(
      503,
      "EMBEDDING_NOT_CONFIGURED",
      "Layanan knowledge base belum dikonfigurasi.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.AI_GATEWAY_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_EMBEDDING_MODEL,
        input: text.replace(/\s+/g, " ").trim(),
        dimensions: EMBEDDING_DIMENSIONS,
        encoding_format: "float",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const providerError = parseGatewayError(await response.json().catch(() => undefined));
      console.error(
        `9Router embedding API gagal dengan status ${response.status}` +
        `${providerError.code ? ` (${providerError.code})` : ""}` +
        `${providerError.message ? `: ${providerError.message}` : "."}`,
      );

      if (response.status === 401 || response.status === 403) {
        throw new AppError(
          502,
          "EMBEDDING_GATEWAY_AUTH_ERROR",
          "9Router menolak API key untuk layanan embedding.",
          providerError,
        );
      }

      throw new AppError(
        502,
        "EMBEDDING_PROVIDER_ERROR",
        providerError.message ?? "Gagal membuat embedding.",
        providerError,
      );
    }

    const result = embeddingResponseSchema.safeParse(await response.json());
    if (!result.success) {
      throw new AppError(502, "INVALID_EMBEDDING_RESPONSE", "Embedding tidak valid.");
    }

    return result.data.data[0]!.embedding;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "EMBEDDING_TIMEOUT", "Layanan embedding terlalu lama merespons.");
    }
    throw new AppError(502, "EMBEDDING_PROVIDER_ERROR", "Gagal membuat embedding.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function retrieveRelevantContext(query: string, limit = 3) {
  const result = await retrieveRelevantContextWithMetrics(query, limit);
  return result.references;
}

export async function retrieveRelevantContextWithMetrics(
  query: string,
  limit = 3,
): Promise<RetrievalResult> {
  const startedAt = Date.now();
  if (!env.AI_GATEWAY_API_KEY || !env.AI_EMBEDDING_MODEL) {
    return {
      references: [],
      metrics: {
        status: "NOT_CONFIGURED",
        latencyMs: Date.now() - startedAt,
        matchCount: 0,
      },
    };
  }

  try {
    const embedding = await generateEmbedding(query);
    const vector = serializeVector(embedding);
    const matches = await prisma.$queryRaw<KnowledgeMatch[]>`
      SELECT
        "title",
        "content",
        "source",
        1 - ("embedding" <=> ${vector}::vector) AS "similarity"
      FROM "knowledge_base"
      WHERE 1 - ("embedding" <=> ${vector}::vector) > 0.3
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${limit}
    `;

    return {
      references: matches,
      metrics: {
        status: "SUCCESS",
        latencyMs: Date.now() - startedAt,
        matchCount: matches.length,
        ...(matches[0] ? { topSimilarity: matches[0].similarity } : {}),
      },
    };
  } catch (error) {
    console.error("RAG tidak tersedia; percakapan dilanjutkan tanpa konteks.", error);
    return {
      references: [],
      metrics: {
        status: "ERROR",
        latencyMs: Date.now() - startedAt,
        matchCount: 0,
      },
    };
  }
}

export async function upsertKnowledgeDocument(input: {
  title: string;
  content: string;
  source: string;
  embedding: number[];
}) {
  const vector = serializeVector(input.embedding);
  await prisma.$executeRaw`
    INSERT INTO "knowledge_base" (
      "id", "title", "content", "embedding", "source", "created_at", "updated_at"
    )
    VALUES (
      gen_random_uuid(), ${input.title}, ${input.content}, ${vector}::vector,
      ${input.source}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("source") DO UPDATE SET
      "title" = EXCLUDED."title",
      "content" = EXCLUDED."content",
      "embedding" = EXCLUDED."embedding",
      "updated_at" = CURRENT_TIMESTAMP
  `;
}

function serializeVector(values: number[]) {
  if (values.length !== EMBEDDING_DIMENSIONS || values.some((value) => !Number.isFinite(value))) {
    throw new AppError(422, "INVALID_EMBEDDING", "Dimensi embedding tidak valid.");
  }
  return `[${values.join(",")}]`;
}

function parseGatewayError(value: unknown) {
  const result = gatewayErrorSchema.safeParse(value);
  if (!result.success) return {};
  if (typeof result.data.error === "string") {
    return { message: result.data.error };
  }
  return {
    code: result.data.error.code ?? result.data.error.type,
    message: result.data.error.message,
  };
}
