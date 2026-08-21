import { sendChatCompletion } from "../ai.service";
import { AppError } from "../../errors/app-error";

export type DiabetesTypeOption = "TIPE_2" | "TIPE_1" | "PRA_DIABETES" | "GESTASIONAL" | "UMUM";
export type DietaryPreferenceOption = "hemat" | "standar" | "bebas_santan" | "vegetarian" | "rendah_garam";

export interface MealPlanInput {
  diabetesType?: DiabetesTypeOption;
  calorieTarget?: number; // e.g. 1500, 1700, 2000
  dietaryPreferences?: DietaryPreferenceOption;
  allergiesOrDislikes?: string;
}

export interface MealItem {
  mealType: "SARAPAN" | "SNACK_PAGI" | "MAKAN_SIANG" | "SNACK_SORE" | "MAKAN_MALAM";
  timeRecommendation: string;
  menuName: string;
  portion: string;
  carbsGrams: number;
  proteinGrams: number;
  calories: number;
  glycemicIndex: "RENDAH" | "SEDANG" | "TINGGI";
  tips: string;
}

export interface DailyPlanSummary {
  totalCalories: number;
  totalCarbsGrams: number;
  totalProteinGrams: number;
  totalFiberGrams: number;
  glycemicImpact: "RENDAH" | "SEDANG" | "TINGGI";
  nutritionAdvice: string;
  eatingSequenceTip: string;
}

export interface ProPlanPreview {
  bannerTitle: string;
  bannerDesc: string;
  ctaText: string;
  features: string[];
}

export interface MealPlanResult {
  dailyPlanSummary: DailyPlanSummary;
  meals: MealItem[];
  proPlanPreview: ProPlanPreview;
  generatedAt: string;
}

const MEAL_PLANNER_SYSTEM_PROMPT = `Kamu adalah Ahli Gizi Klinis Diabetes Indonesia.
TUGAS: Buat rencana makan 1 hari (4 waktu makan) ramah glukosa darah berbasis pangan lokal Indonesia.

KEMBALIKAN HANYA JSON VALID (tanpa markdown tambahan) dengan format:
{
  "dailyPlanSummary": {
    "totalCalories": 1600,
    "totalCarbsGrams": 170,
    "totalProteinGrams": 75,
    "totalFiberGrams": 28,
    "glycemicImpact": "RENDAH",
    "nutritionAdvice": "Strategi nutrisi harian ringkas",
    "eatingSequenceTip": "Santap sayur serat dulu, lalu protein, baru nasi/karbohidrat."
  },
  "meals": [
    {
      "mealType": "SARAPAN",
      "timeRecommendation": "07:00 - 08:00",
      "menuName": "Nasi Merah Telur Rebus & Sayur Bayam",
      "portion": "Nasi merah 1 kepal, 1 telur rebus, 1 mangkuk bayam",
      "carbsGrams": 34,
      "proteinGrams": 16,
      "calories": 310,
      "glycemicIndex": "RENDAH",
      "tips": "Rebus telur tanpa minyak."
    },
    {
      "mealType": "MAKAN_SIANG",
      "timeRecommendation": "12:30 - 13:30",
      "menuName": "Pepes Ikan Kembung & Tumis Buncis Tempe",
      "portion": "Nasi merah 1 kepal, 1 pepes ikan, 2 tempe, tumis buncis",
      "carbsGrams": 46,
      "proteinGrams": 32,
      "calories": 510,
      "glycemicIndex": "RENDAH",
      "tips": "Gunakan bumbu rempah alami tanpa gula pasir."
    },
    {
      "mealType": "SNACK_SORE",
      "timeRecommendation": "16:00",
      "menuName": "Edamame Rebus / Buah Apel",
      "portion": "1 mangkuk kecil edamame rebus (80g)",
      "carbsGrams": 14,
      "proteinGrams": 8,
      "calories": 110,
      "glycemicIndex": "RENDAH",
      "tips": "Serat tinggi penahan lapar sore."
    },
    {
      "mealType": "MAKAN_MALAM",
      "timeRecommendation": "18:30 - 19:30",
      "menuName": "Sup Ayam Jamur Tahu Bening & Nasi Merah",
      "portion": "Sup ayam jamur tahu kuah kaldu bening, 3/4 kepal nasi",
      "carbsGrams": 37,
      "proteinGrams": 20,
      "calories": 385,
      "glycemicIndex": "RENDAH",
      "tips": "Santap 2-3 jam sebelum tidur."
    }
  ]
}`;

const FALLBACK_MEAL_PLAN: MealPlanResult = {
  dailyPlanSummary: {
    totalCalories: 1580,
    totalCarbsGrams: 165,
    totalProteinGrams: 78,
    totalFiberGrams: 27,
    glycemicImpact: "RENDAH",
    nutritionAdvice:
      "Rencana menu difokuskan pada kombinasi serat sayuran hijau, protein tanpa lemak (ikan dan tempe), serta karbohidrat berserat untuk mencegah lonjakan gula darah mendadak.",
    eatingSequenceTip:
      "Makan sayuran/serat lebih dulu, lanjutkan dengan lauk protein, dan terakhir santap nasi merah atau umbi karbohidrat.",
  },
  meals: [
    {
      mealType: "SARAPAN",
      timeRecommendation: "07:00 - 08:00",
      menuName: "Nasi Merah Telur Rebus & Sayur Bening Bayam",
      portion: "Nasi merah 1 kepal (100g), 1 butir telur rebus utuh, 1 mangkuk sayur bayam",
      carbsGrams: 34,
      proteinGrams: 16,
      calories: 310,
      glycemicIndex: "RENDAH",
      tips: "Rebus telur tanpa minyak dan kuah bayam dimasak tanpa penyedap berlebihan.",
    },
    {
      mealType: "MAKAN_SIANG",
      timeRecommendation: "12:30 - 13:30",
      menuName: "Pepes Ikan Kembung, Tempe Bakar Teflon & Tumis Buncis Tahu",
      portion: "Nasi jagung/merah 1 kepal (100g), 1 ekor pepes ikan kembung, 2 potong tempe bakar, 1 piring tumis buncis",
      carbsGrams: 46,
      proteinGrams: 32,
      calories: 510,
      glycemicIndex: "RENDAH",
      tips: "Gunakan rempah segar kunyit, daun kemangi, dan serai untuk rasa gurih alami tanpa gula pasir.",
    },
    {
      mealType: "SNACK_SORE",
      timeRecommendation: "16:00",
      menuName: "Edamame Rebus Hangat / Apel Hijau",
      portion: "1 mangkuk kecil edamame rebus (80g) atau 1 buah apel hijau sedang",
      carbsGrams: 14,
      proteinGrams: 8,
      calories: 110,
      glycemicIndex: "RENDAH",
      tips: "Kaya serat dan protein nabati, sangat baik untuk menahan rasa lapar sebelum makan malam.",
    },
    {
      mealType: "MAKAN_MALAM",
      timeRecommendation: "18:30 - 19:30",
      menuName: "Sup Ayam Jamur Tahu Bening & 3/4 Porsi Nasi Merah",
      portion: "Dada ayam tanpa kulit suwir, jamur kuping, wortel, tahu sutra kuah kaldu rempah bening, 3/4 kepal nasi",
      carbsGrams: 37,
      proteinGrams: 20,
      calories: 385,
      glycemicIndex: "RENDAH",
      tips: "Santap setidaknya 2-3 jam sebelum waktu tidur malam agar proses metabolik berjalan optimal.",
    },
  ],
  proPlanPreview: {
    bannerTitle: "Ingin Meal Plan 7 Hari Lengkap + Daftar Belanja Pasar Mingguan?",
    bannerDesc:
      "Upgrade ke GlucoCare Pro untuk mendapatkan rencana makan otomatis mingguan, resep masak video, pemantau log gula darah terintegrasi, dan konsultasi gizi.",
    ctaText: "Lihat Paket Langganan Pro",
    features: [
      "Meal Plan 7 Hari Otomatis Sesuai Target Gula Darah",
      "Daftar Belanja Pasar Mingguan (Hemat & Terukur)",
      "Koleksi 150+ Resep Diabetes Nusantara Rendah Glikemik",
      "Konsultasi Rutin Bersama Ahli Gizi & Dokter Sp.PD",
    ],
  },
  generatedAt: new Date().toISOString(),
};

export class MealPlannerAgent {
  /**
   * Generates a personalized diabetes-friendly daily meal plan based on user inputs
   */
  static async generateMealPlan(input: MealPlanInput): Promise<MealPlanResult> {
    const diabetesType = input.diabetesType || "TIPE_2";
    const calorieTarget = input.calorieTarget || 1600;
    const dietaryPreferences = input.dietaryPreferences || "hemat";
    const allergies = input.allergiesOrDislikes ? input.allergiesOrDislikes.trim() : "Tidak ada";

    const promptData = `Rancang rencana makan 1 hari (Sarapan, Makan Siang, Snack Sore, Makan Malam) untuk:
- Tipe Diabetes: ${diabetesType}
- Target Kalori: ${calorieTarget} kkal
- Preferensi: ${dietaryPreferences}
- Pantangan: ${allergies}

Balas HANYA JSON valid.`;

    try {
      const response = await sendChatCompletion(
        [{ role: "user", content: promptData }],
        MEAL_PLANNER_SYSTEM_PROMPT,
        {
          model: process.env.GROQ_EXTRACTION_MODEL || "llama-3.1-8b-instant",
          maxTokens: 1400,
          temperature: 0.2,
        },
      );

      if (response) {
        const parsed = this.cleanAndParseJson(response);
        if (parsed.dailyPlanSummary && Array.isArray(parsed.meals) && parsed.meals.length >= 3) {
          return {
            dailyPlanSummary: {
              totalCalories: Number(parsed.dailyPlanSummary.totalCalories) || calorieTarget,
              totalCarbsGrams: Number(parsed.dailyPlanSummary.totalCarbsGrams) || 170,
              totalProteinGrams: Number(parsed.dailyPlanSummary.totalProteinGrams) || 75,
              totalFiberGrams: Number(parsed.dailyPlanSummary.totalFiberGrams) || 25,
              glycemicImpact: parsed.dailyPlanSummary.glycemicImpact || "RENDAH",
              nutritionAdvice:
                parsed.dailyPlanSummary.nutritionAdvice || FALLBACK_MEAL_PLAN.dailyPlanSummary.nutritionAdvice,
              eatingSequenceTip:
                parsed.dailyPlanSummary.eatingSequenceTip || FALLBACK_MEAL_PLAN.dailyPlanSummary.eatingSequenceTip,
            },
            meals: parsed.meals.map((m: any, idx: number) => ({
              mealType: m.mealType || FALLBACK_MEAL_PLAN.meals[idx]?.mealType || "SARAPAN",
              timeRecommendation: m.timeRecommendation || FALLBACK_MEAL_PLAN.meals[idx]?.timeRecommendation || "07:00",
              menuName: m.menuName || "Menu Ramah Gula Darah",
              portion: m.portion || "Porsi sedang",
              carbsGrams: Number(m.carbsGrams) || 30,
              proteinGrams: Number(m.proteinGrams) || 15,
              calories: Number(m.calories) || 300,
              glycemicIndex: m.glycemicIndex || "RENDAH",
              tips: m.tips || "Masak dengan sedikit minyak dan rempah alami.",
            })),
            proPlanPreview: FALLBACK_MEAL_PLAN.proPlanPreview,
            generatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn("[MealPlannerAgent] Error generating AI meal plan, using fallback:", err);
    }

    return {
      ...FALLBACK_MEAL_PLAN,
      generatedAt: new Date().toISOString(),
    };
  }

  private static cleanAndParseJson(raw: string): any {
    try {
      const trimmed = raw.trim();
      const jsonStart = trimmed.indexOf("{");
      const jsonEnd = trimmed.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
      }
      return JSON.parse(trimmed);
    } catch {
      throw new AppError(500, "JSON_PARSE_FAILED", "Gagal memproses data rencana makan AI.");
    }
  }
}
