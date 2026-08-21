import { prisma } from "../../lib/prisma";
import { sendChatCompletion } from "../ai.service";
import { AppError } from "../../errors/app-error";

export interface CategoryValuation {
  category: string;
  count: number;
  averagePrice: number;
  totalCatalogValue: number;
}

export interface FinancialInsightsResult {
  catalogSummary: {
    totalActiveProducts: number;
    totalCatalogValue: number;
    averageProductPrice: number;
    categoryBreakdown: CategoryValuation[];
  };
  pipelineSummary: {
    totalLeads: number;
    qualifiedLeads: number;
    estimatedPipelineRevenue: number;
    averageLeadPotentialValue: number;
    highIntentLeadsCount: number;
  };
  executiveSummary: {
    overview: string;
    keyOpportunities: string[];
    bundlingRecommendations: string[];
    actionableAdvice: string;
  };
  generatedAt: string;
}

const FINANCE_SYSTEM_PROMPT = `Kamu adalah AI Chief Financial & Revenue Officer untuk GlucoCare Telehealth (Platform Layanan dan Produk Diabetes).
TUGAS:
Menganalisis metrik finansial, katalog produk, dan pipeline konversi pasien dari data nyata, lalu menyusun ringkasan eksekutif bisnis yang tajam, berbasis data, dan aplikatif dalam Bahasa Indonesia.

KELUARKAN HANYA FORMAT JSON VALID:
{
  "overview": "Paragraf ringkasan kesehatan finansial platform dan potensi konversi dari pasien yang sedang berkonsultasi.",
  "keyOpportunities": [
    "Poin peluang revenue 1",
    "Poin peluang revenue 2"
  ],
  "bundlingRecommendations": [
    "Contoh paket bundling produk alat + obat untuk meningkatkan average order value"
  ],
  "actionableAdvice": "Saran aksi konkret prioritas minggu ini untuk tim manajemen/admin."
}`;

// Fallback seed data if DB connection is unavailable
const FALLBACK_PRODUCTS = [
  { id: "p1", name: "GlucoMeter Pro Digital Kit", category: "Alat Medis", price: 189000 },
  { id: "p2", name: "Metformin 500mg Release Control", category: "Obat Regulasional", price: 45000 },
  { id: "p3", name: "Strip Uji Glukosa Darah 50 pcs", category: "Alat Medis", price: 95000 },
  { id: "p4", name: "Paket Steril Perawatan Luka Diabetik", category: "Perawatan Luka", price: 135000 },
  { id: "p5", name: "Glibenclamide 5mg Tablet", category: "Obat Regulasional", price: 28000 },
];

const FALLBACK_LEADS = [
  {
    id: "lead-fallback-1",
    name: "Budi Santoso",
    diabetesType: "Tipe 2",
    primaryComplaint: "Gula darah puasa sering di atas 210 mg/dL dan kaki mulai kesemutan",
    qualificationStatus: "ELIGIBLE",
    currentMedication: "Metformin 500mg",
  },
  {
    id: "lead-fallback-2",
    name: "Siti Rahma",
    diabetesType: "Tipe 2",
    primaryComplaint: "Luka lecet di tumit tidak kunjung sembuh sudah 5 hari",
    qualificationStatus: "ELIGIBLE",
    currentMedication: "Glibenklamid",
  },
  {
    id: "lead-fallback-3",
    name: "Hendra Wijaya",
    diabetesType: "Tipe 1",
    primaryComplaint: "Ingin konsultasi jadwal penyuntikan insulin dan cek strip glukometer",
    qualificationStatus: "NEEDS_REVIEW",
    currentMedication: "Insulin Basal",
  },
];

export class FinanceAgent {
  /**
   * Generates comprehensive financial and revenue pipeline insights
   */
  static async generateFinancialInsights(): Promise<FinancialInsightsResult> {
    // 1. Fetch active products (with resilient fallback)
    let products: Array<{ id: string; name: string; category: string; price: number }> = [];
    try {
      products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, price: true },
      });
      if (products.length === 0) {
        products = FALLBACK_PRODUCTS;
      }
    } catch (dbErr) {
      console.warn("[FinanceAgent] Database offline/error, menggunakan fallback catalog:", dbErr);
      products = FALLBACK_PRODUCTS;
    }

    // 2. Fetch leads (with resilient fallback)
    let leads: Array<{
      id: string;
      name: string | null;
      diabetesType: string | null;
      primaryComplaint: string | null;
      qualificationStatus: string | null;
      currentMedication: string | null;
    }> = [];

    try {
      leads = await prisma.chatLead.findMany({
        select: {
          id: true,
          name: true,
          diabetesType: true,
          primaryComplaint: true,
          qualificationStatus: true,
          currentMedication: true,
        },
      });
      if (leads.length === 0) {
        leads = FALLBACK_LEADS;
      }
    } catch (dbErr) {
      console.warn("[FinanceAgent] Database offline/error, menggunakan fallback leads:", dbErr);
      leads = FALLBACK_LEADS;
    }

    // 3. Compute Product Catalog Metrics
    const totalActiveProducts = products.length;
    const totalCatalogValue = products.reduce((acc, p) => acc + p.price, 0);
    const averageProductPrice =
      totalActiveProducts > 0 ? Math.round(totalCatalogValue / totalActiveProducts) : 0;

    const categoryMap = new Map<string, { count: number; sum: number }>();
    for (const p of products) {
      const cat = p.category || "Umum";
      const current = categoryMap.get(cat) || { count: 0, sum: 0 };
      categoryMap.set(cat, {
        count: current.count + 1,
        sum: current.sum + p.price,
      });
    }

    const categoryBreakdown: CategoryValuation[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        averagePrice: Math.round(data.sum / data.count),
        totalCatalogValue: data.sum,
      }),
    );

    // 4. Compute Lead Pipeline Metrics
    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(
      (l) => l.qualificationStatus === "ELIGIBLE" || (l.name && l.primaryComplaint),
    ).length;

    const highIntentLeads = leads.filter((l) => {
      const text = `${l.primaryComplaint || ""} ${l.currentMedication || ""}`.toLowerCase();
      return (
        text.includes("gula") ||
        text.includes("luka") ||
        text.includes("insulin") ||
        text.includes("metformin") ||
        text.includes("drop") ||
        text.includes("tinggi") ||
        text.includes("kesemutan")
      );
    });
    const highIntentLeadsCount = highIntentLeads.length;

    const baselineCareBasket = averageProductPrice > 0 ? averageProductPrice * 2.5 : 250000;
    const estimatedPipelineRevenue = Math.round(
      qualifiedLeads * 0.35 * baselineCareBasket + highIntentLeadsCount * 0.5 * baselineCareBasket,
    );
    const averageLeadPotentialValue =
      totalLeads > 0 ? Math.round(estimatedPipelineRevenue / totalLeads) : 0;

    // 5. Executive Summary
    let executiveSummary = {
      overview: `Platform memiliki ${totalActiveProducts} produk aktif dengan estimasi nilai katalog Rp ${totalCatalogValue.toLocaleString("id-ID")}. Terdapat ${totalLeads} total prospek pasien (${highIntentLeadsCount} berurgensi tinggi) dengan potensi omset pipeline sekitar Rp ${estimatedPipelineRevenue.toLocaleString("id-ID")}.`,
      keyOpportunities: [
        `Konversi ${highIntentLeadsCount} pasien berurgensi tinggi ke paket monitoring glukosa lengkap.`,
        "Peningkatan Average Order Value (AOV) melalui bundling glukometer kit dan strip refill rutin.",
      ],
      bundlingRecommendations: [
        "Paket Skrining & Terapi Awal: Glukometer Pro Kit + Konsultasi Dokter Spesialis Penyakit Dalam.",
        "Paket Rawat Rutin: Suplai Metformin 30 hari + 50 Strip Glukosa dengan hemat 10%.",
      ],
      actionableAdvice:
        "Segera hubungi lead dengan status ELIGIBLE dan skor tinggi via WhatsApp untuk penawaran paket perawatan awal sebelum 24 jam.",
    };

    try {
      const categorySummary = categoryBreakdown.map((c) => `${c.category}: ${c.count} item`).join(", ");
      const promptData = `Data Finansial GlucoCare:
- Total Produk Aktif: ${totalActiveProducts}
- Total Nilai Katalog: Rp ${totalCatalogValue.toLocaleString("id-ID")}
- Rata-rata Harga Produk: Rp ${averageProductPrice.toLocaleString("id-ID")}
- Breakdown Kategori: ${categorySummary || "Umum"}
- Total Lead Pasien: ${totalLeads} (${qualifiedLeads} terverifikasi, ${highIntentLeadsCount} high intent)
- Estimasi Nilai Pipeline: Rp ${estimatedPipelineRevenue.toLocaleString("id-ID")}`;

      const aiResponse = await sendChatCompletion(
        [{ role: "user", content: promptData }],
        FINANCE_SYSTEM_PROMPT,
        { maxTokens: 1000, temperature: 0.2, jsonMode: true },
      );

      if (aiResponse) {
        const parsed = this.cleanAndParseJson(aiResponse);
        if (parsed.overview && Array.isArray(parsed.keyOpportunities)) {
          executiveSummary = {
            overview: parsed.overview,
            keyOpportunities: parsed.keyOpportunities,
            bundlingRecommendations: Array.isArray(parsed.bundlingRecommendations)
              ? parsed.bundlingRecommendations
              : executiveSummary.bundlingRecommendations,
            actionableAdvice: parsed.actionableAdvice || executiveSummary.actionableAdvice,
          };
        }
      }
    } catch (llmErr) {
      console.warn("[FinanceAgent] Menggunakan resilient financial fallback:", llmErr);
    }

    return {
      catalogSummary: {
        totalActiveProducts,
        totalCatalogValue,
        averageProductPrice,
        categoryBreakdown,
      },
      pipelineSummary: {
        totalLeads,
        qualifiedLeads,
        estimatedPipelineRevenue,
        averageLeadPotentialValue,
        highIntentLeadsCount,
      },
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Interactive Q&A for Admin to query the Finance Advisor Agent
   */
  static async askFinanceAdvisor(query: string): Promise<{ answer: string; relatedMetrics?: any }> {
    if (!query || query.trim().length === 0) {
      throw new AppError(400, "INVALID_QUERY", "Pertanyaan tidak boleh kosong.");
    }

    try {
      const insights = await this.generateFinancialInsights();
      const context = `Konteks Data Finansial Platform GlucoCare Terkini:
- Total Produk Aktif: ${insights.catalogSummary.totalActiveProducts} produk
- Valuasi Katalog: Rp ${insights.catalogSummary.totalCatalogValue.toLocaleString("id-ID")}
- Rata-rata Harga: Rp ${insights.catalogSummary.averageProductPrice.toLocaleString("id-ID")}
- Kategori Produk: ${insights.catalogSummary.categoryBreakdown.map((c) => `${c.category} (${c.count} item, avg Rp ${c.averagePrice})`).join("; ")}
- Total Lead Pasien: ${insights.pipelineSummary.totalLeads} lead (${insights.pipelineSummary.highIntentLeadsCount} prioritas tinggi)
- Estimasi Omset Pipeline: Rp ${insights.pipelineSummary.estimatedPipelineRevenue.toLocaleString("id-ID")}
- Nilai Rata-rata Per Lead: Rp ${insights.pipelineSummary.averageLeadPotentialValue.toLocaleString("id-ID")}`;

      const systemPrompt = `Kamu adalah Asisten Finansial & Bisnis Virtual untuk Admin GlucoCare.
Jawab pertanyaan manajemen/admin dengan akurat, ramah, profesional, dan gunakan angka konkret dari konteks data yang disediakan. 
Berikan saran taktis untuk memaksimalkan omset dan konversi pasien diabetes secara etis. Bahasa Indonesia.
Sajikan jawaban yang bersih, rapi, profesional, dan nyaman dibaca (hindari penulisan tanda pagar/hastag # berlebihan).`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `${context}\n\nPertanyaan Admin: "${query}"` },
      ];

      const answer = await sendChatCompletion(messages, systemPrompt, {
        maxTokens: 600,
        temperature: 0.3,
      });

      return {
        answer: answer || `Berdasarkan data saat ini, platform memiliki potensi pipeline sebesar Rp ${insights.pipelineSummary.estimatedPipelineRevenue.toLocaleString("id-ID")} dari ${insights.pipelineSummary.totalLeads} prospek pasien. Disarankan memfokuskan penawaran paket bundling glukometer dan obat rutin.`,
        relatedMetrics: {
          totalPipelineRevenue: insights.pipelineSummary.estimatedPipelineRevenue,
          totalLeads: insights.pipelineSummary.totalLeads,
        },
      };
    } catch (error: any) {
      console.error("[FinanceAgent] Error in Q&A:", error);
      throw new AppError(500, "FINANCE_QUERY_ERROR", `Gagal memproses pertanyaan finansial: ${error.message || error}`);
    }
  }

  private static cleanAndParseJson(raw: string): any {
    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }
      const match = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : cleaned);
    } catch {
      return {};
    }
  }
}
