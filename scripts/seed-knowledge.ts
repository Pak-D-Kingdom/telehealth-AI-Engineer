import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { generateEmbedding, upsertKnowledgeDocument } from "../src/services/rag.service";

const knowledgeDirectory = resolve(import.meta.dir, "../data/knowledge-base");

async function main() {
  const files = (await readdir(knowledgeDirectory)).filter((file) => file.endsWith(".md")).sort();

  if (files.length === 0) {
    throw new Error("Dokumen knowledge base tidak ditemukan.");
  }

  for (const file of files) {
    const content = (await readFile(resolve(knowledgeDirectory, file), "utf8")).trim();
    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const title = heading ?? basename(file, ".md").replace(/^\d+-/, "").replaceAll("-", " ");

    console.log(`Membuat embedding: ${file}`);
    const embedding = await generateEmbedding(content, {
      taskType: "RETRIEVAL_DOCUMENT",
      title,
    });
    await upsertKnowledgeDocument({ title, content, source: file, embedding });
  }

  console.log(`${files.length} dokumen knowledge base berhasil disimpan.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
