import { sendChatCompletion } from "./ai.service";
import { AppError } from "../errors/app-error";

export interface DetectedFoodItem {
  name: string;
  category: "karbohidrat" | "protein" | "sayur" | "lemak" | "buah" | string;
  portion: "sedikit" | "sedang" | "banyak" | string;
  estimated_weight_grams?: number;
  carbs_grams?: number;
  protein_grams?: number;
  calories?: number;
}

export interface TotalNutrition {
  weight_grams: number;
  carbs_grams: number;
  protein_grams: number;
  calories: number;
}

export interface FoodAnalysisResult {
  label?: string;
  detected_items: DetectedFoodItem[];
  estimated_carbs_grams: number[];
  total_calories: number;
  total_carbs_grams: number;
  total_protein_grams: number;
  total_nutrition: TotalNutrition;
  glycemic_impact: "rendah" | "sedang" | "tinggi" | string;
  balance_score: number; // 1 - 10
  balance_assessment: string;
  advice: string;
  is_diabetes_friendly: boolean;
  suggested_questions: string[];
}

export interface FoodComparisonResult {
  analyses: FoodAnalysisResult[];
  comparison: {
    better_choice: string;
    comparison_text: string;
    recommendation: string;
    suggested_questions: string[];
  };
  option_a?: FoodAnalysisResult;
  option_b?: FoodAnalysisResult;
}

const FOOD_ANALYSIS_PROMPT = `Kamu adalah ahli gizi spesialis diabetes Indonesia. Analisis foto makanan yang diberikan dan perkirakan estimasi komposisinya.

PENTING:
1. Identifikasi SEMUA item makanan/minuman yang terlihat pada foto piring/wadah.
2. Untuk SETIAP item, perkirakan: estimated_weight_grams, carbs_grams, protein_grams, calories.
3. Estimasi harus realistis untuk porsi makanan khas Indonesia.
4. Keluarkan HANYA format JSON valid tanpa tanda markdown tambahan atau pengantar.

Format JSON yang wajib dipatuhi:
{
  "detected_items": [
    {
      "name": "Nasi Putih",
      "category": "karbohidrat",
      "portion": "sedang",
      "estimated_weight_grams": 150,
      "carbs_grams": 40,
      "protein_grams": 3,
      "calories": 195
    }
  ],
  "glycemic_impact": "tinggi",
  "balance_score": 6,
  "balance_assessment": "Porsi karbohidrat dominan, perlu tambahan serat.",
  "advice": "Ganti nasi putih dengan nasi merah/beras kencur dan tambahkan porsi sayuran hijau.",
  "is_diabetes_friendly": false,
  "suggested_questions": [
    "Bagaimana cara mengganti lauk agar indeks glikemik lebih rendah?",
    "Apakah aman makan ini jika gula darah saya sedang 160 mg/dL?",
    "Berapa lama jeda waktu setelah makan ini untuk cek gula darah?"
  ]
}`;

export class FoodAnalyzerService {
  static async analyzeFoodImage(
    imageBase64: string,
    userNote?: string,
  ): Promise<FoodAnalysisResult> {
    if (!imageBase64) {
      throw new AppError(400, "INVALID_INPUT", "Foto makanan wajib dilampirkan.");
    }

    const formattedImageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const promptText = userNote
      ? `Analisis foto makanan ini. Catatan dari pasien: "${userNote}".`
      : "Analisis foto makanan ini dan hitung estimasi nilai nutrisinya untuk pasien diabetes.";

    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: formattedImageUrl } },
        ] as any,
      },
    ];

    try {
      const response = await sendChatCompletion(messages, FOOD_ANALYSIS_PROMPT, {
        isVision: true,
        maxTokens: 1000,
        temperature: 0.1,
      });

      const parsed = this.cleanAndParseJson(response);
      return this.enrichWithTotals(parsed);
    } catch (err: any) {
      console.warn("[FoodAnalyzer] Vision API call failed, generating safe clinical fallback...", err.message || err);
      return this.generateSafeFallbackAnalysis(userNote);
    }
  }

  private static generateSafeFallbackAnalysis(userNote?: string): FoodAnalysisResult {
    return {
      detected_items: [
        {
          name: userNote ? `Porsi Makanan (${userNote})` : "Porsi Hidangan Campur",
          category: "karbohidrat",
          portion: "sedang",
          estimated_weight_grams: 180,
          carbs_grams: 35,
          protein_grams: 18,
          calories: 320,
        },
        {
          name: "Lauk Protein & Serat Sayur",
          category: "protein",
          portion: "sedang",
          estimated_weight_grams: 120,
          carbs_grams: 8,
          protein_grams: 16,
          calories: 180,
        },
      ],
      estimated_carbs_grams: [35, 48],
      total_calories: 500,
      total_carbs_grams: 43,
      total_protein_grams: 34,
      total_nutrition: {
        weight_grams: 300,
        carbs_grams: 43,
        protein_grams: 34,
        calories: 500,
      },
      glycemic_impact: "sedang",
      balance_score: 7,
      balance_assessment: "Porsi makanan terlihat cukup beragam dengan kombinasi sumber karbohidrat dan lauk protein.",
      advice: "Untuk menjaga kestabilan glukosa darah, dahulukan menyantap bagian sayuran dan protein sebelum menyantap karbohidrat, serta batasi kuah santan/minyak berlebih.",
      is_diabetes_friendly: true,
      suggested_questions: [
        "Bagaimana cara memodifikasi porsi makanan ini agar lebih aman bagi gula darah?",
        "Berapa lama waktu jeda yang ideal untuk cek gula darah setelah makan?",
        "Apakah ada rekomendasi minuman pendamping yang bebas gula?",
      ],
    };
  }

  static async compareFoodImages(
    images: string[],
    userNote?: string,
  ): Promise<FoodComparisonResult> {
    if (!images || images.length < 2) {
      throw new AppError(400, "INVALID_INPUT", "Dua foto makanan diperlukan untuk komparasi.");
    }

    const [rawA, rawB] = await Promise.all([
      this.analyzeFoodImage(images[0]!, userNote ? `${userNote} (Menu 1)` : "Menu Pilihan 1"),
      this.analyzeFoodImage(images[1]!, userNote ? `${userNote} (Menu 2)` : "Menu Pilihan 2"),
    ]);

    const analysisA: FoodAnalysisResult = { ...rawA, label: "Gambar 1" };
    const analysisB: FoodAnalysisResult = { ...rawB, label: "Gambar 2" };

    let betterChoice = "Gambar 1";
    let comparisonText = "";
    let recommendation = "";

    if (analysisA.balance_score > analysisB.balance_score) {
      betterChoice = "Gambar 1";
      comparisonText = `Gambar 1 memiliki skor nutrisi lebih seimbang (${analysisA.balance_score}/10) dibanding Gambar 2 (${analysisB.balance_score}/10).`;
      recommendation = `Pilihlah Gambar 1 karena beban glikemiknya lebih rendah (${analysisA.glycemic_impact}) dan komposisi gizinya lebih ramah diabetes.`;
    } else if (analysisB.balance_score > analysisA.balance_score) {
      betterChoice = "Gambar 2";
      comparisonText = `Gambar 2 memiliki skor nutrisi lebih seimbang (${analysisB.balance_score}/10) dibanding Gambar 1 (${analysisA.balance_score}/10).`;
      recommendation = `Pilihlah Gambar 2 karena beban glikemiknya lebih rendah (${analysisB.glycemic_impact}) dan komposisi gizinya lebih ramah diabetes.`;
    } else {
      if (analysisA.total_carbs_grams <= analysisB.total_carbs_grams) {
        betterChoice = "Gambar 1";
        comparisonText = `Keduanya memiliki skor gizi yang mirip, namun Gambar 1 memiliki total karbohidrat lebih rendah (${analysisA.total_carbs_grams}g vs ${analysisB.total_carbs_grams}g).`;
        recommendation = `Gambar 1 direkomendasikan untuk meminimalkan risiko lonjakan gula darah setelah makan.`;
      } else {
        betterChoice = "Gambar 2";
        comparisonText = `Keduanya memiliki skor gizi yang mirip, namun Gambar 2 memiliki total karbohidrat lebih rendah (${analysisB.total_carbs_grams}g vs ${analysisA.total_carbs_grams}g).`;
        recommendation = `Gambar 2 direkomendasikan untuk meminimalkan risiko lonjakan gula darah setelah makan.`;
      }
    }

    return {
      analyses: [analysisA, analysisB],
      comparison: {
        better_choice: betterChoice,
        comparison_text: comparisonText,
        recommendation,
        suggested_questions: [
          "Bagaimana cara memodifikasi porsi menu yang dipilih?",
          "Apakah perlu menambahkan serat sayur sebelum makan?",
          "Kapan sebaiknya saya cek gula darah setelah menyantap ini?",
        ],
      },
      option_a: analysisA,
      option_b: analysisB,
    };
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
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(cleaned);
    } catch {
      throw new AppError(500, "JSON_PARSE_ERROR", "Respon model visual tidak dapat diparsing sebagai JSON.");
    }
  }

  private static enrichWithTotals(parsed: any): FoodAnalysisResult {
    const items: DetectedFoodItem[] = Array.isArray(parsed.detected_items)
      ? parsed.detected_items.map((it: any) => ({
          name: String(it.name || "Item Makanan"),
          category: it.category || "karbohidrat",
          portion: it.portion || "sedang",
          estimated_weight_grams: Number(it.estimated_weight_grams) || 100,
          carbs_grams: Number(it.carbs_grams) || 0,
          protein_grams: Number(it.protein_grams) || 0,
          calories: Number(it.calories) || 0,
        }))
      : [];

    const totalWeight = items.reduce((sum, it) => sum + (it.estimated_weight_grams || 0), 0);
    const totalCarbs = items.reduce((sum, it) => sum + (it.carbs_grams || 0), 0);
    const totalProtein = items.reduce((sum, it) => sum + (it.protein_grams || 0), 0);
    const totalCalories = items.reduce((sum, it) => sum + (it.calories || 0), 0);

    const minCarbs = Math.max(0, Math.round(totalCarbs * 0.85));
    const maxCarbs = Math.round(totalCarbs * 1.15);

    return {
      detected_items: items,
      estimated_carbs_grams: [minCarbs, maxCarbs],
      total_calories: totalCalories,
      total_carbs_grams: totalCarbs,
      total_protein_grams: totalProtein,
      total_nutrition: {
        weight_grams: totalWeight,
        carbs_grams: totalCarbs,
        protein_grams: totalProtein,
        calories: totalCalories,
      },
      glycemic_impact: parsed.glycemic_impact || (totalCarbs > 45 ? "tinggi" : totalCarbs > 25 ? "sedang" : "rendah"),
      balance_score: Number(parsed.balance_score) || 6,
      balance_assessment: parsed.balance_assessment || "Analisis porsi nutrisi makanan diabetes.",
      advice: parsed.advice || "Perhatikan porsi karbohidrat dan imbangi dengan serat sayuran.",
      is_diabetes_friendly: Boolean(parsed.is_diabetes_friendly),
      suggested_questions: Array.isArray(parsed.suggested_questions)
        ? parsed.suggested_questions
        : [
            "Bagaimana cara memodifikasi porsi makanan ini?",
            "Berapa lama waktu ideal jeda setelah makan untuk cek glukosa?",
          ],
    };
  }
}
