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

const embeddingResponseSchema = z.object({
  data: z.array(z.object({
    embedding: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS),
  })).min(1),
});

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

interface EmbeddingOptions {
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
  title?: string;
}

export async function generateEmbedding(text: string, options: EmbeddingOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  // 1. Try Gemini Embedding if key present
  if (env.GEMINI_API_KEY) {
    try {
      const model = encodeURIComponent(env.GEMINI_EMBEDDING_MODEL);
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

      if (response.ok) {
        const result = geminiEmbeddingSchema.safeParse(await response.json());
        if (result.success) {
          clearTimeout(timeout);
          return result.data.embedding.values;
        }
      }
    } catch (err) {
      console.warn("[RAG] Gemini embedding failed, attempting gateway fallback...", err);
    }
  }

  // 2. Gateway fallback
  if (env.AI_GATEWAY_API_KEY && env.AI_EMBEDDING_MODEL) {
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

      if (response.ok) {
        const result = embeddingResponseSchema.safeParse(await response.json());
        if (result.success) {
          clearTimeout(timeout);
          return result.data.data[0]!.embedding;
        }
      }
    } catch (err) {
      console.warn("[RAG] Gateway embedding failed:", err);
    }
  }

  clearTimeout(timeout);
  throw new AppError(503, "EMBEDDING_NOT_CONFIGURED", "Layanan knowledge base belum dikonfigurasi.");
}

export async function retrieveRelevantContext(query: string, limit = 4) {
  const result = await retrieveRelevantContextWithMetrics(query, limit);
  return result.references;
}

export async function retrieveRelevantContextWithMetrics(
  query: string,
  limit = 4,
): Promise<RetrievalResult> {
  const startedAt = Date.now();
  if (!env.GEMINI_API_KEY && (!env.AI_GATEWAY_API_KEY || !env.AI_EMBEDDING_MODEL)) {
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
    const embedding = await generateEmbedding(query, { taskType: "RETRIEVAL_QUERY" });
    const vector = serializeVector(embedding);
    const sanitizedQuery = query.replace(/[^\w\s\u00C0-\u017F-]/g, " ").trim();

    const matches = await prisma.$queryRaw<KnowledgeMatch[]>`
      WITH vector_search AS (
        SELECT
          "id",
          "title",
          "content",
          "source",
          1 - ("embedding" <=> ${vector}::vector) AS "similarity",
          ROW_NUMBER() OVER (ORDER BY "embedding" <=> ${vector}::vector) AS "rank"
        FROM "knowledge_base"
        WHERE 1 - ("embedding" <=> ${vector}::vector) > 0.25
        LIMIT 20
      ),
      text_search AS (
        SELECT
          "id",
          "title",
          "content",
          "source",
          ts_rank(to_tsvector('simple', "title" || ' ' || "content"), plainto_tsquery('simple', ${sanitizedQuery})) AS "rank_score",
          ROW_NUMBER() OVER (
            ORDER BY ts_rank(to_tsvector('simple', "title" || ' ' || "content"), plainto_tsquery('simple', ${sanitizedQuery})) DESC
          ) AS "rank"
        FROM "knowledge_base"
        WHERE to_tsvector('simple', "title" || ' ' || "content") @@ plainto_tsquery('simple', ${sanitizedQuery})
        LIMIT 20
      ),
      combined AS (
        SELECT
          COALESCE(v."id", t."id") AS "id",
          COALESCE(v."title", t."title") AS "title",
          COALESCE(v."content", t."content") AS "content",
          COALESCE(v."source", t."source") AS "source",
          COALESCE(1.0 / (60 + v."rank"), 0.0) + COALESCE(1.0 / (60 + t."rank"), 0.0) AS "similarity"
        FROM vector_search v
        FULL OUTER JOIN text_search t ON v."id" = t."id"
      )
      SELECT "title", "content", "source", "similarity"
      FROM combined
      ORDER BY "similarity" DESC
      LIMIT ${limit}
    `;

    return {
      references: matches.map(({ title, content, source, similarity }) => ({
        title,
        content,
        source,
        similarity,
      })),
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
  chunkIndex?: number;
  embedding: number[];
}) {
  const chunkIndex = input.chunkIndex ?? 0;
  const vector = serializeVector(input.embedding);
  await prisma.$executeRaw`
    INSERT INTO "knowledge_base" (
      "id", "title", "content", "embedding", "source", "chunk_index", "created_at", "updated_at"
    )
    VALUES (
      gen_random_uuid(), ${input.title}, ${input.content}, ${vector}::vector,
      ${input.source}, ${chunkIndex}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("source", "chunk_index") DO UPDATE SET
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
