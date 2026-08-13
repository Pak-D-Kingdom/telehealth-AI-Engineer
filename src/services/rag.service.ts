import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { prisma } from "../lib/prisma";

const EMBEDDING_DIMENSIONS = 3_072;

const geminiEmbeddingSchema = z.object({
  embedding: z.object({
    values: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS),
  }),
});

const geminiErrorSchema = z.object({
  error: z.object({
    details: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional(),
  }),
});

interface KnowledgeMatch {
  title: string;
  content: string;
  similarity: number;
}

interface EmbeddingOptions {
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
  title?: string;
}

export async function generateEmbedding(text: string, options: EmbeddingOptions = {}) {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      503,
      "EMBEDDING_NOT_CONFIGURED",
      "Layanan knowledge base belum dikonfigurasi.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);
  const model = encodeURIComponent(env.GEMINI_EMBEDDING_MODEL);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          model: `models/${env.GEMINI_EMBEDDING_MODEL}`,
          content: { parts: [{ text: text.replace(/\s+/g, " ").trim() }] },
          embedContentConfig: {
            outputDimensionality: EMBEDDING_DIMENSIONS,
            ...(options.taskType ? { taskType: options.taskType } : {}),
            ...(options.title ? { title: options.title } : {}),
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorBody = geminiErrorSchema.safeParse(await response.json().catch(() => undefined));
      const providerReason = errorBody.success
        ? errorBody.data.error.details?.find((detail) => detail.reason)?.reason
        : undefined;
      console.error(
        `Gemini embedding API gagal dengan status ${response.status}${providerReason ? ` (${providerReason})` : ""}.`,
      );

      if (response.status === 401) {
        throw new AppError(
          502,
          "GEMINI_AUTH_ERROR",
          "Gemini menolak GEMINI_API_KEY. Periksa status dan binding key di Google AI Studio.",
          providerReason ? { providerReason } : undefined,
        );
      }

      throw new AppError(502, "EMBEDDING_PROVIDER_ERROR", "Gagal membuat embedding.");
    }

    const result = geminiEmbeddingSchema.safeParse(await response.json());
    if (!result.success) {
      throw new AppError(502, "INVALID_EMBEDDING_RESPONSE", "Embedding tidak valid.");
    }

    return result.data.embedding.values;
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
  if (!env.GEMINI_API_KEY) return [];

  try {
    const embedding = await generateEmbedding(query, { taskType: "RETRIEVAL_QUERY" });
    const vector = serializeVector(embedding);
    const matches = await prisma.$queryRaw<KnowledgeMatch[]>`
      SELECT
        "title",
        "content",
        1 - ("embedding" <=> ${vector}::vector) AS "similarity"
      FROM "knowledge_base"
      WHERE 1 - ("embedding" <=> ${vector}::vector) > 0.3
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${limit}
    `;

    return matches.map(({ title, content }) => ({ title, content }));
  } catch (error) {
    console.error("RAG tidak tersedia; percakapan dilanjutkan tanpa konteks.", error);
    return [];
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
