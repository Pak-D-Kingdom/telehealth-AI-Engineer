import { readdir, readFile } from "node:fs/promises";
import { basename, resolve, relative } from "node:path";
import { prisma } from "../src/lib/prisma";
import { generateEmbedding, upsertKnowledgeDocument } from "../src/services/rag.service";

const knowledgeDirectory = resolve(import.meta.dir, "../data/knowledge-base");

interface DocumentChunk {
  title: string;
  content: string;
  chunkIndex: number;
}

export function chunkMarkdown(content: string, documentTitle: string, maxChunkLength = 500): DocumentChunk[] {
  const sections = content.split(/\n(?=#{1,4}\s)/g);
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const sectionHeadingMatch = trimmed.match(/^#{1,4}\s+(.+)$/m);
    const sectionHeading = sectionHeadingMatch ? sectionHeadingMatch[1].trim() : "";
    const contextualTitle =
      sectionHeading && sectionHeading !== documentTitle
        ? `${documentTitle} - ${sectionHeading}`
        : documentTitle;

    if (trimmed.length <= maxChunkLength) {
      chunks.push({
        title: contextualTitle,
        content: trimmed,
        chunkIndex: chunkIndex++,
      });
    } else {
      const paragraphs = trimmed.split(/\n\n+/);
      let currentBuffer = "";

      for (const p of paragraphs) {
        const cleanP = p.trim();
        if (!cleanP) continue;

        if (cleanP.length > maxChunkLength) {
          // If previous buffer exists, flush it
          if (currentBuffer.trim()) {
            chunks.push({
              title: contextualTitle,
              content: currentBuffer.trim(),
              chunkIndex: chunkIndex++,
            });
            currentBuffer = "";
          }

          // Split long paragraph by sentences
          const sentences = cleanP.split(/(?<=[.!?])\s+/);
          let sentenceBuffer = "";

          for (const s of sentences) {
            if ((sentenceBuffer + " " + s).trim().length > maxChunkLength && sentenceBuffer.length > 0) {
              chunks.push({
                title: contextualTitle,
                content: sentenceBuffer.trim(),
                chunkIndex: chunkIndex++,
              });
              sentenceBuffer = s;
            } else {
              sentenceBuffer = sentenceBuffer ? `${sentenceBuffer} ${s}` : s;
            }
          }

          if (sentenceBuffer.trim()) {
            chunks.push({
              title: contextualTitle,
              content: sentenceBuffer.trim(),
              chunkIndex: chunkIndex++,
            });
          }
        } else if ((currentBuffer + "\n\n" + cleanP).trim().length > maxChunkLength && currentBuffer.length > 0) {
          chunks.push({
            title: contextualTitle,
            content: currentBuffer.trim(),
            chunkIndex: chunkIndex++,
          });
          currentBuffer = cleanP;
        } else {
          currentBuffer = currentBuffer ? `${currentBuffer}\n\n${cleanP}` : cleanP;
        }
      }

      if (currentBuffer.trim()) {
        chunks.push({
          title: contextualTitle,
          content: currentBuffer.trim(),
          chunkIndex: chunkIndex++,
        });
      }
    }
  }

  if (chunks.length === 0 && content.trim()) {
    chunks.push({
      title: documentTitle,
      content: content.trim(),
      chunkIndex: 0,
    });
  }

  return chunks;
}

async function getMarkdownFilesRecursively(dir: string, baseDir = dir): Promise<Array<{ fullPath: string; relativePath: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: Array<{ fullPath: string; relativePath: string }> = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await getMarkdownFilesRecursively(fullPath, baseDir);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") {
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, "/");
      results.push({ fullPath, relativePath });
    }
  }

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function main() {
  const files = await getMarkdownFilesRecursively(knowledgeDirectory);

  if (files.length === 0) {
    throw new Error("Dokumen knowledge base tidak ditemukan.");
  }

  console.log("Memperbarui skema tabel knowledge_base...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "knowledge_base" DROP CONSTRAINT IF EXISTS "knowledge_base_source_key";
    ALTER TABLE "knowledge_base" ADD COLUMN IF NOT EXISTS "chunk_index" INT NOT NULL DEFAULT 0;
    DROP INDEX IF EXISTS "knowledge_base_source_key";
    CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_base_source_chunk_index_key" ON "knowledge_base"("source", "chunk_index");
  `);

  console.log("Membersihkan knowledge base lama...");
  await prisma.$executeRaw`DELETE FROM "knowledge_base"`;

  let totalChunks = 0;

  for (const file of files) {
    const rawContent = (await readFile(file.fullPath, "utf8")).trim();
    const heading = rawContent.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const docTitle =
      heading ?? basename(file.relativePath, ".md").replace(/^\d+-/, "").replaceAll("-", " ").replaceAll("_", " ");

    const chunks = chunkMarkdown(rawContent, docTitle);
    console.log(`\nMemproses file: ${file.relativePath} (${chunks.length} chunk)`);

    for (const chunk of chunks) {
      console.log(`  -> Embedding chunk ${chunk.chunkIndex}: "${chunk.title}"`);
      const embedding = await generateEmbedding(chunk.content, {
        taskType: "RETRIEVAL_DOCUMENT",
        title: chunk.title,
      });

      await upsertKnowledgeDocument({
        title: chunk.title,
        content: chunk.content,
        source: file.relativePath,
        chunkIndex: chunk.chunkIndex,
        embedding,
      });
      totalChunks++;
    }
  }

  console.log(`\nBerhasil menyimpan ${totalChunks} chunk dari ${files.length} dokumen knowledge base.`);
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

