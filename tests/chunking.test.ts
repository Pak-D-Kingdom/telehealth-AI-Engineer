import { describe, expect, test } from "bun:test";
import { chunkMarkdown } from "../scripts/seed-knowledge";

describe("Semantic Markdown Chunking", () => {
  test("memotong dokumen berdasarkan heading dan mempertahankan judul kontekstual", () => {
    const sampleMarkdown = `
# Panduan Lengkap Diabetes

Diabetes adalah penyakit kronis yang ditandai dengan tingginya kadar gula darah.

## Gejala Utama
Gejala umum meliputi sering buang air kecil, mudah haus, dan penurunan berat badan drastis.

## Pengobatan
Pengobatan dapat mencakup suntik insulin atau konsumsi obat oral seperti Metformin.
    `.trim();

    const chunks = chunkMarkdown(sampleMarkdown, "Panduan Lengkap Diabetes", 200);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks.some((c) => c.title.includes("Gejala Utama"))).toBe(true);
    expect(chunks.some((c) => c.title.includes("Pengobatan"))).toBe(true);
  });

  test("memotong paragraf panjang yang melebihi maxChunkLength", () => {
    const longParagraph = "Ini adalah kalimat pengujian yang panjang. ".repeat(30);
    const content = `# Dokumen Panjang\n\n${longParagraph}`;

    const chunks = chunkMarkdown(content, "Dokumen Panjang", 150);

    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
      expect(chunks[i].content.length).toBeLessThanOrEqual(300);
    }
  });
});
