import { z } from "zod";
import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";
import { sendChatCompletion } from "../src/services/ai.service";
import { generateEmbedding } from "../src/services/rag.service";

const modelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) }).passthrough()),
});

async function main() {
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY belum diisi pada .env.");
  }

  const models = await fetchModels("/models");
  console.log(`✓ 9Router terhubung; ${models.length} model tersedia`);
  for (const model of models) console.log(`  - ${model.id}`);

  const embeddingModels = await fetchModels("/models/embedding");
  console.log(`✓ ${embeddingModels.length} model embedding tersedia`);
  for (const model of embeddingModels) console.log(`  - ${model.id}`);

  const chatModels = [...new Set([
    ...(env.AI_CHAT_MODEL ? [env.AI_CHAT_MODEL] : []),
    ...(env.AI_CHAT_FALLBACK_MODELS ?? []),
  ])];
  if (chatModels.length === 0) {
    console.log("! AI_CHAT_MODEL belum diisi; pengujian chat dilewati.");
  } else {
    for (const model of chatModels) {
      if (!models.some((availableModel) => availableModel.id === model)) {
        throw new Error(`Model chat ${model} tidak tersedia pada /models.`);
      }
      const reply = await sendChatCompletion(
        [{ role: "user", content: "Balas hanya dengan kata OK." }],
        "Ikuti instruksi pengguna secara ringkas.",
        { maxTokens: 16, model, temperature: 0 },
      );
      console.log(`✓ Chat model ${model} berhasil: ${reply}`);
    }
  }

  if (!env.AI_EMBEDDING_MODEL) {
    console.log("! AI_EMBEDDING_MODEL belum diisi; pengujian embedding dilewati.");
  } else {
    if (!embeddingModels.some((model) => model.id === env.AI_EMBEDDING_MODEL)) {
      throw new Error(
        `AI_EMBEDDING_MODEL=${env.AI_EMBEDDING_MODEL} tidak tersedia pada /models/embedding.`,
      );
    }
    const embedding = await generateEmbedding("Tes koneksi embedding GlucoCare.");
    console.log(`✓ Embedding berhasil: ${embedding.length} dimensi`);
  }
}

async function fetchModels(path: string) {
  const response = await fetch(`${env.AI_GATEWAY_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}` },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} gagal dengan status ${response.status}.`);
  }
  return modelsResponseSchema.parse(await response.json()).data;
}

main()
  .catch((error) => {
    console.error("Pengujian 9Router gagal.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
