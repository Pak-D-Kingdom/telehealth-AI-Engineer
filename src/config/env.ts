import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  CHAT_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  GROQ_API_KEY: z.string().trim().min(1).optional().or(z.literal("")),
  OPENROUTER_API_KEY: z.string().trim().min(1).optional().or(z.literal("")),
  GROQ_CHAT_MODEL: z.string().trim().min(1).default("llama-3.3-70b-versatile"),
  GROQ_EXTRACTION_MODEL: z.string().trim().min(1).default("llama-3.1-8b-instant"),
  GEMINI_API_KEY: z.string().trim().min(1).optional().or(z.literal("")),
  GEMINI_EMBEDDING_MODEL: z.string().trim().min(1).default("gemini-embedding-001"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Konfigurasi environment tidak valid:", parsed.error.flatten().fieldErrors);
  throw new Error("Konfigurasi environment tidak valid.");
}

export const env = parsed.data;
