"use client";

import React, { useState } from "react";
import {
  Utensils,
  Sparkles,
  Clock,
  Flame,
  Wheat,
  ShieldCheck,
  CheckCircle2,
  Crown,
  Leaf,
  Soup,
  RefreshCw,
  Info,
  Apple,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import type {
  ApiResponse,
  MealPlanData,
  MealPlanInput,
  DiabetesTypeOption,
  DietaryPreferenceOption,
} from "@/lib/api-types";

export default function MealPlannerWidget() {
  const [diabetesType, setDiabetesType] = useState<DiabetesTypeOption>("TIPE_2");
  const [calorieTarget, setCalorieTarget] = useState<number>(1600);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferenceOption>("hemat");
  const [allergies, setAllergies] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const input: MealPlanInput = {
      diabetesType,
      calorieTarget,
      dietaryPreferences,
      allergiesOrDislikes: allergies.trim() || undefined,
    };

    try {
      const res = await apiRequest<ApiResponse<MealPlanData>>(
        "/api/ai/meal-plan/generate",
        {
          method: "POST",
          body: input,
        },
      );
      if (res?.data) {
        setMealPlan(res.data);
      } else {
        setError("Gagal memuat rencana makan AI.");
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kendala saat menghubungi AI Meal Planner.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="ai-meal-planner" className="w-full py-12 bg-gradient-to-b from-[#FAF8F5] to-white border-y border-[#EAE4DC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Fitur AI Gratis (Public Tool)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0D5C46] tracking-tight">
            AI Diabetes Daily Meal & Carb Planner
          </h2>
          <p className="text-sm text-[#5A6E63] leading-relaxed">
            Rancang menu makan 1 hari ramah gula darah menggunakan bahan pangan lokal Nusantara yang terjangkau, lezat, dan aman dari lonjakan glukosa mendadak.
          </p>
        </div>

        {/* Form Controls Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE4DC] shadow-sm space-y-6">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Diabetes Type */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3A4F46]">
                  1. Kondisi / Tipe Diabetes:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "TIPE_2", label: "Tipe 2 (Dewasa)" },
                    { id: "PRA_DIABETES", label: "Pra-Diabetes" },
                    { id: "TIPE_1", label: "Tipe 1 (Insulin)" },
                    { id: "GESTASIONAL", label: "Gestasional" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDiabetesType(item.id as DiabetesTypeOption)}
                      className={`cursor-pointer px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                        diabetesType === item.id
                          ? "bg-[#0D5C46] text-white border-[#0D5C46] shadow-xs"
                          : "bg-[#FAF8F5] text-[#3A4F46] border-[#EAE4DC] hover:border-[#0D5C46]/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Calorie Target */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3A4F46]">
                  2. Target Kalori Harian:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1500, label: "1500 kkal", desc: "Defisit / Turun BB" },
                    { val: 1700, label: "1700 kkal", desc: "Standar Seimbang" },
                    { val: 2000, label: "2000 kkal", desc: "Aktif Fisik" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setCalorieTarget(item.val)}
                      className={`cursor-pointer p-2.5 rounded-xl text-left transition-all border ${
                        calorieTarget === item.val
                          ? "bg-[#0D5C46] text-white border-[#0D5C46] shadow-xs"
                          : "bg-[#FAF8F5] text-[#3A4F46] border-[#EAE4DC] hover:border-[#0D5C46]/50"
                      }`}
                    >
                      <div className="text-xs font-extrabold">{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${calorieTarget === item.val ? "text-white/80" : "text-gray-500"}`}>
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Dietary Preference */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3A4F46]">
                  3. Preferensi Masakan:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "hemat", label: "🛒 Hemat Pasar Lokal" },
                    { id: "bebas_santan", label: "🥥 Bebas Santan/Minyak" },
                    { id: "standar", label: "🍲 Standar Nusantara" },
                    { id: "vegetarian", label: "🌱 Vegetarian Sehat" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDietaryPreferences(item.id as DietaryPreferenceOption)}
                      className={`cursor-pointer px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                        dietaryPreferences === item.id
                          ? "bg-[#0D5C46] text-white border-[#0D5C46] shadow-xs"
                          : "bg-[#FAF8F5] text-[#3A4F46] border-[#EAE4DC] hover:border-[#0D5C46]/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Allergies & Generate CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#F2ECE4]">
              <div className="w-full sm:max-w-md">
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Pantangan / Alergi (Opsional, cth: Udang, Kacang Tanah)..."
                  className="w-full rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1A2421] placeholder-gray-400 focus:border-[#0D5C46] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-[#0D5C46] hover:bg-[#0A4A38] disabled:bg-gray-300 text-white px-6 py-3 text-sm font-bold shadow-md transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Menyusun Rencana Gizi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buat Rencana Menu Harian AI (Gratis)</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Meal Plan Output Card */}
        {mealPlan && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Nutrition Overview & Food Sequencing Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 4 Macro KPI Cards */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#EAE4DC] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0D5C46] uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Target Makronutrisi Harian:
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Beban Glikemik: {mealPlan.dailyPlanSummary.glycemicImpact}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE4DC] text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Total Kalori</span>
                    <p className="text-xl font-black text-[#0D5C46] mt-0.5">
                      {mealPlan.dailyPlanSummary.totalCalories}
                      <span className="text-[10px] font-normal text-gray-400 ml-1">kkal</span>
                    </p>
                  </div>

                  <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE4DC] text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Karbohidrat</span>
                    <p className="text-xl font-black text-amber-700 mt-0.5">
                      {mealPlan.dailyPlanSummary.totalCarbsGrams}
                      <span className="text-[10px] font-normal text-gray-400 ml-1">gram</span>
                    </p>
                  </div>

                  <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE4DC] text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Protein</span>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">
                      {mealPlan.dailyPlanSummary.totalProteinGrams}
                      <span className="text-[10px] font-normal text-gray-400 ml-1">gram</span>
                    </p>
                  </div>

                  <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE4DC] text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Serat Pangan</span>
                    <p className="text-xl font-black text-blue-700 mt-0.5">
                      {mealPlan.dailyPlanSummary.totalFiberGrams}
                      <span className="text-[10px] font-normal text-gray-400 ml-1">gram</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#4A5D53] leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  💡 <strong>Catatan Gizi Klinis:</strong> {mealPlan.dailyPlanSummary.nutritionAdvice}
                </p>
              </div>

              {/* Food Sequencing Rule Card */}
              <div className="bg-gradient-to-br from-[#0D5C46] to-[#083E2F] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Utensils className="w-4 h-4" />
                    Urutan Makan Ideal (Food Sequencing):
                  </div>
                  <p className="text-xs text-white/90 mt-2 leading-relaxed">
                    {mealPlan.dailyPlanSummary.eatingSequenceTip}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[10px]">1</span>
                    <span>Dahulukan Sayur & Serat (Bayam/Buncis)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-200">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[10px]">2</span>
                    <span>Lauk Protein (Tempe, Tahu, Telur, Ikan)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-200">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-[10px]">3</span>
                    <span>Terakhir Karbohidrat (Nasi Merah/Jagung)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meals Timeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mealPlan.meals.map((meal, idx) => {
                const badgeColor =
                  meal.mealType === "SARAPAN"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : meal.mealType === "MAKAN_SIANG"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : meal.mealType === "SNACK_SORE" || meal.mealType === "SNACK_PAGI"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-purple-50 text-purple-800 border-purple-200";

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-5 border border-[#EAE4DC] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#0D5C46]/40 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeColor}`}>
                          {meal.mealType.replace("_", " ")}
                        </span>
                        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {meal.timeRecommendation}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[#1A2421] leading-snug">
                        {meal.menuName}
                      </h4>

                      <p className="text-xs text-[#5A6E63] leading-relaxed">
                        <strong className="text-gray-700">Porsi:</strong> {meal.portion}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[#F2ECE4]">
                      {/* Macro Pills */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0D5C46] bg-emerald-50 px-2 py-0.5 rounded-md">
                          {meal.calories} kkal
                        </span>
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Karbo: {meal.carbsGrams}g
                        </span>
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          Prot: {meal.proteinGrams}g
                        </span>
                      </div>

                      {meal.tips && (
                        <p className="text-[11px] text-gray-500 italic leading-normal">
                          💬 {meal.tips}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Freemium Pro Subscription Funnel Banner */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5 text-yellow-200" />
                  Rencana Langganan GlucoCare Pro
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  {mealPlan.proPlanPreview.bannerTitle}
                </h3>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  {mealPlan.proPlanPreview.bannerDesc}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                  {mealPlan.proPlanPreview.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-yellow-200 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <a
                  href="#chat-assistant"
                  className="cursor-pointer inline-flex items-center justify-center w-full md:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-yellow-50 text-amber-900 font-extrabold text-xs sm:text-sm shadow-md transition-all gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>{mealPlan.proPlanPreview.ctaText}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
