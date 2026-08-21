import { prisma } from "../../lib/prisma";
import { sendChatCompletion } from "../ai.service";
import { AppError } from "../../errors/app-error";

export type StockStatus = "CRITICAL_REFILL" | "REORDER_RECOMMENDED" | "HEALTHY";

export interface ProductInventoryItem {
  productId: string;
  productName: string;
  category: string;
  price: number;
  estimatedCurrentStock: number;
  dailyDemandRate: number; // units/day
  runoutDays: number;
  stockStatus: StockStatus;
  recommendedReorderQty: number;
  estimatedReorderCost: number;
  demandSignalReasons: string[];
}

export interface InventoryForecastResult {
  summary: {
    totalProductsTracked: number;
    criticalItemsCount: number;
    reorderRecommendedCount: number;
    healthyItemsCount: number;
    totalEstimatedReorderBudget: number;
    fastestDepletingProduct: string;
  };
  items: ProductInventoryItem[];
  aiExecutiveAdvice: {
    procurementSummary: string;
    priorityActions: string[];
    supplierStrategy: string;
  };
  generatedAt: string;
}

const INVENTORY_SYSTEM_PROMPT = `Kamu adalah AI Pharmacy Inventory & Supply Chain Chief Advisor untuk GlucoCare Telehealth.
TUGAS:
Menganalisis data peramalan stok obat diabetes dan alat medis, memproyeksikan risiko stockout, dan menyusun rekomendasi pengadaan/restock (procurement) dalam Bahasa Indonesia.

KELUARKAN HANYA FORMAT JSON VALID:
{
  "procurementSummary": "Paragraf evaluasi kondisi stok obat dan alat medis saat ini berdasarkan tren keluhan pasien.",
  "priorityActions": [
    "Aksi prioritas 1 (misal: Segera lakukan PO 100 unit strip glukometer)",
    "Aksi prioritas 2"
  ],
  "supplierStrategy": "Saran negosiasi harga bundling ke distributor farmasi atau jadwal pengiriman."
}`;

const FALLBACK_PRODUCTS_INVENTORY = [
  { id: "p1", name: "GlucoMeter Pro Digital Kit", category: "Alat Medis", price: 189000 },
  { id: "p2", name: "Metformin 500mg Release Control", category: "Obat Regulasional", price: 45000 },
  { id: "p3", name: "Strip Uji Glukosa Darah 50 pcs", category: "Alat Medis", price: 95000 },
  { id: "p4", name: "Paket Steril Perawatan Luka Diabetik", category: "Perawatan Luka", price: 135000 },
  { id: "p5", name: "Glibenclamide 5mg Tablet", category: "Obat Regulasional", price: 28000 },
];

const FALLBACK_LEADS_INVENTORY = [
  { primaryComplaint: "Gula darah tinggi sering 220 mg/dL", currentMedication: "Metformin" },
  { primaryComplaint: "Luka lecet bernanah di tumit", currentMedication: "Glibenklamid" },
  { primaryComplaint: "Butuh cek strip glukometer dan suntik insulin", currentMedication: "Insulin" },
  { primaryComplaint: "Konsultasi gula darah puasa", currentMedication: "Metformin" },
];

export class InventoryAgent {
  /**
   * Generates dynamic inventory demand forecasting and EOQ restock recommendations
   */
  static async generateInventoryForecast(): Promise<InventoryForecastResult> {
    // 1. Fetch Products (with resilient fallback)
    let products: Array<{ id: string; name: string; category: string; price: number; specs?: string | null }> = [];
    try {
      products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, price: true, specs: true },
      });
      if (products.length === 0) products = FALLBACK_PRODUCTS_INVENTORY;
    } catch (err) {
      console.warn("[InventoryAgent] DB offline, using fallback products:", err);
      products = FALLBACK_PRODUCTS_INVENTORY;
    }

    // 2. Fetch Leads & Complaint Text
    let leads: Array<{ primaryComplaint: string | null; currentMedication: string | null }> = [];
    try {
      leads = await prisma.chatLead.findMany({
        select: { primaryComplaint: true, currentMedication: true },
      });
      if (leads.length === 0) leads = FALLBACK_LEADS_INVENTORY;
    } catch (err) {
      console.warn("[InventoryAgent] DB offline, using fallback leads:", err);
      leads = FALLBACK_LEADS_INVENTORY;
    }

    const complaintCorpus = leads
      .map((l) => `${l.primaryComplaint || ""} ${l.currentMedication || ""}`.toLowerCase())
      .join(" ");

    // Signal counts
    const glucoseSignals = (complaintCorpus.match(/gula|glukos|puasa|hba1c|tinggi|drop/g) || []).length;
    const woundSignals = (complaintCorpus.match(/luka|nanah|borok|kaki|gangren/g) || []).length;
    const metforminSignals = (complaintCorpus.match(/metformin|tipe 2|minum obat/g) || []).length;
    const glibenSignals = (complaintCorpus.match(/gliben|glimepiride|sulfonil/g) || []).length;
    const insulinSignals = (complaintCorpus.match(/insulin|suntik|tipe 1/g) || []).length;

    // 3. Compute Per-Product Inventory Item
    const items: ProductInventoryItem[] = products.map((p, idx) => {
      const pNameLower = p.name.toLowerCase();
      let demandMultiplier = 1.0;
      const reasons: string[] = [];

      if (pNameLower.includes("strip") || pNameLower.includes("glukometer") || pNameLower.includes("meter")) {
        const boost = Math.min(3.5, 1.0 + glucoseSignals * 0.25);
        demandMultiplier = boost;
        reasons.push(`${glucoseSignals} pasien mengeluhkan fluktuasi gula darah`);
      } else if (pNameLower.includes("luka") || pNameLower.includes("steril")) {
        const boost = Math.min(3.0, 1.0 + woundSignals * 0.35);
        demandMultiplier = boost;
        reasons.push(`${woundSignals} pasien melaporkan keluhan luka/infeksi diabetik`);
      } else if (pNameLower.includes("metformin")) {
        const boost = Math.min(2.5, 1.0 + metforminSignals * 0.2);
        demandMultiplier = boost;
        reasons.push(`${metforminSignals} pasien menggunakan terapi Metformin`);
      } else if (pNameLower.includes("gliben") || pNameLower.includes("glimepiride")) {
        const boost = Math.min(2.2, 1.0 + glibenSignals * 0.2);
        demandMultiplier = boost;
        reasons.push("Permintaan stabil untuk sulfonilurea reguler");
      } else if (pNameLower.includes("insulin")) {
        const boost = Math.min(2.5, 1.0 + insulinSignals * 0.3);
        demandMultiplier = boost;
        reasons.push("Pasien dengan kebutuhan insulin harian");
      } else {
        reasons.push("Tingkat konsumsi normal");
      }

      // Base daily demand rate
      const baseDailyDemand = 1.8 + (idx % 3) * 0.8;
      const dailyDemandRate = Math.round(baseDailyDemand * demandMultiplier * 10) / 10;

      // Extract actual physical stock from product specs metadata (e.g. "Stok: 50 unit | ...")
      let estimatedCurrentStock = Math.max(5, 45 - (idx * 9) + (glucoseSignals > 3 && idx === 0 ? -12 : 0));
      if (p.specs) {
        const stockMatch = p.specs.match(/(?:stok|stock|qty|jumlah)\s*[:=]\s*(\d+)/i);
        if (stockMatch && stockMatch[1]) {
          estimatedCurrentStock = Math.max(0, parseInt(stockMatch[1], 10));
        }
      }

      const runoutDays = estimatedCurrentStock === 0
        ? 0
        : Math.max(1, Math.round(estimatedCurrentStock / (dailyDemandRate || 1)));

      let stockStatus: StockStatus = "HEALTHY";
      if (runoutDays <= 7) {
        stockStatus = "CRITICAL_REFILL";
      } else if (runoutDays <= 14) {
        stockStatus = "REORDER_RECOMMENDED";
      }

      // EOQ Recommended Reorder Qty (Target 30 days buffer)
      const recommendedReorderQty = Math.max(20, Math.ceil(dailyDemandRate * 30));
      const estimatedReorderCost = Math.round(recommendedReorderQty * p.price * 0.85); // 15% wholesale margin

      return {
        productId: p.id,
        productName: p.name,
        category: p.category || "Umum",
        price: p.price,
        estimatedCurrentStock,
        dailyDemandRate,
        runoutDays,
        stockStatus,
        recommendedReorderQty,
        estimatedReorderCost,
        demandSignalReasons: reasons,
      };
    });

    // 4. Summaries
    const criticalItemsCount = items.filter((i) => i.stockStatus === "CRITICAL_REFILL").length;
    const reorderRecommendedCount = items.filter((i) => i.stockStatus === "REORDER_RECOMMENDED").length;
    const healthyItemsCount = items.filter((i) => i.stockStatus === "HEALTHY").length;
    const totalEstimatedReorderBudget = items
      .filter((i) => i.stockStatus !== "HEALTHY")
      .reduce((acc, i) => acc + i.estimatedReorderCost, 0);

    const sortedByRunout = [...items].sort((a, b) => a.runoutDays - b.runoutDays);
    const fastestDepletingProduct = sortedByRunout[0]?.productName || "Strip Uji Glukosa";

    // 5. Narrative LLM Procurement Synthesis
    let aiExecutiveAdvice = {
      procurementSummary: `Terdapat ${criticalItemsCount} produk dalam status KRITIS (< 7 hari sisa stok) dan ${reorderRecommendedCount} produk disarankan restock segera. Produk tercepat habis adalah "${fastestDepletingProduct}".`,
      priorityActions: [
        `Segera terbitkan Purchase Order (PO) untuk "${fastestDepletingProduct}" dengan anggaran estimasi ${totalEstimatedReorderBudget.toLocaleString("id-ID")}.`,
        "Prioritaskan pengiriman obat antidiabetes oral dan strip glukosa sebelum batas stok pengaman terlampaui.",
      ],
      supplierStrategy:
        "Lakukan pemesanan batch bundling alat medis dan strip isi ulang untuk mendapatkan potongan harga grosir minimal 10-15%.",
    };

    try {
      const criticalSummary = items
        .filter((i) => i.stockStatus !== "HEALTHY")
        .map((i) => `${i.productName} (sisa ${i.runoutDays} hari, status: ${i.stockStatus})`)
        .join(", ");

      const promptData = `Data Inventaris Farmasi GlucoCare:
- Total Produk Dilacak: ${items.length}
- Produk Kritis (< 7 hari): ${criticalItemsCount}
- Produk Perlu Restock (7-14 hari): ${reorderRecommendedCount}
- Estimasi Kebutuhan Anggaran PO: Rp ${totalEstimatedReorderBudget.toLocaleString("id-ID")}
- Produk Tercepat Habis: ${fastestDepletingProduct} (${sortedByRunout[0]?.runoutDays || 0} hari tersisa)
- Rincian Produk Kritis: ${criticalSummary || "Tidak ada"}`;

      const aiResponse = await sendChatCompletion(
        [{ role: "user", content: promptData }],
        INVENTORY_SYSTEM_PROMPT,
        { maxTokens: 1000, temperature: 0.2, jsonMode: true },
      );

      if (aiResponse) {
        const parsed = this.cleanAndParseJson(aiResponse);
        if (parsed.procurementSummary && Array.isArray(parsed.priorityActions)) {
          aiExecutiveAdvice = {
            procurementSummary: parsed.procurementSummary,
            priorityActions: parsed.priorityActions,
            supplierStrategy: parsed.supplierStrategy || aiExecutiveAdvice.supplierStrategy,
          };
        }
      }
    } catch (llmErr) {
      console.warn("[InventoryAgent] Fallback procurement advice used:", llmErr);
    }

    return {
      summary: {
        totalProductsTracked: items.length,
        criticalItemsCount,
        reorderRecommendedCount,
        healthyItemsCount,
        totalEstimatedReorderBudget,
        fastestDepletingProduct,
      },
      items,
      aiExecutiveAdvice,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Interactive Q&A for Pharmacy Admin to query the Inventory Advisor Agent
   */
  static async askInventoryAdvisor(query: string): Promise<{ answer: string; relatedMetrics?: any }> {
    if (!query || query.trim().length === 0) {
      throw new AppError(400, "INVALID_QUERY", "Pertanyaan tidak boleh kosong.");
    }

    try {
      const forecast = await this.generateInventoryForecast();
      const context = `Konteks Inventaris Farmasi GlucoCare:
- Total Produk: ${forecast.summary.totalProductsTracked}
- Produk Status Kritis: ${forecast.summary.criticalItemsCount} item
- Produk Perlu Restock: ${forecast.summary.reorderRecommendedCount} item
- Estimasi Anggaran Restock: Rp ${forecast.summary.totalEstimatedReorderBudget.toLocaleString("id-ID")}
- Produk Tercepat Habis: ${forecast.summary.fastestDepletingProduct}
- Daftar Produk: ${forecast.items.map((i) => `${i.productName} (Stok: ${i.estimatedCurrentStock} unit, sisa ${i.runoutDays} hari, status: ${i.stockStatus})`).join("; ")}`;

      const systemPrompt = `Kamu adalah Asisten Pengadaan & Manajemen Gudang Farmasi Cerdas untuk Admin GlucoCare.
Jawab pertanyaan admin mengenai ketersediaan stok obat/alat diabetes, lead time restock, dan strategi pembelian supplier dengan tepat, ramah, dan berbasis data. Bahasa Indonesia.
Sajikan jawaban yang bersih, rapi, profesional, dan nyaman dibaca (hindari penulisan tanda pagar/hastag # berlebihan).`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `${context}\n\nPertanyaan Admin: "${query}"` },
      ];

      const answer = await sendChatCompletion(messages, systemPrompt, {
        maxTokens: 500,
        temperature: 0.3,
      });

      return {
        answer:
          answer ||
          `Berdasarkan analisis terkini, produk "${forecast.summary.fastestDepletingProduct}" memerlukan pemesanan ulang segera dengan estimasi anggaran Rp ${forecast.summary.totalEstimatedReorderBudget.toLocaleString("id-ID")}.`,
        relatedMetrics: {
          criticalCount: forecast.summary.criticalItemsCount,
          totalBudget: forecast.summary.totalEstimatedReorderBudget,
        },
      };
    } catch (error: any) {
      console.error("[InventoryAgent] Error in Inventory Q&A:", error);
      throw new AppError(500, "INVENTORY_QUERY_ERROR", `Gagal memproses pertanyaan inventaris: ${error.message || error}`);
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
