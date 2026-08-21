"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useDataStore } from "@/lib/data-store";
import { apiFetcher, apiRequest } from "@/lib/api-client";
import type {
  AdminChatStats,
  ApiResponse,
  FinancialInsightsData,
  FinanceQueryData,
} from "@/lib/api-types";
import { formatRupiah } from "@/lib/formatters";
import {
  Package,
  Stethoscope,
  ArrowRight,
  MessageSquareText,
  TrendingUp,
  Sparkles,
  Bot,
  Send,
  Lightbulb,
  CheckCircle2,
  Coins,
} from "lucide-react";
import FormattedMarkdown from "@/components/FormattedMarkdown";

export default function AdminDashboard() {
  const { products, doctors, isLoading, error } = useDataStore();
  const { data: chatStatsResponse, isLoading: chatStatsLoading } = useSWR<
    ApiResponse<AdminChatStats>
  >("/api/admin/chat/stats", apiFetcher, { revalidateOnFocus: false });

  // SWR for AI Financial Insights
  const {
    data: financeResponse,
    isLoading: financeLoading,
  } = useSWR<ApiResponse<FinancialInsightsData>>(
    "/api/ai/finance/insights",
    apiFetcher,
    { revalidateOnFocus: false },
  );

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const stats = [
    {
      label: "Total Produk & Alat",
      value: products.length,
      icon: Package,
      href: "/admin/produk",
      color: "bg-[#E07A5F]/10 text-[#E07A5F]",
    },
    {
      label: "Total Dokter Spesialis",
      value: doctors.length,
      icon: Stethoscope,
      href: "/admin/dokter",
      color: "bg-[#0D5C46]/10 text-[#0D5C46]",
    },
    {
      label: "Lead Chatbot Lengkap",
      value: chatStatsResponse?.data.captured ?? 0,
      icon: MessageSquareText,
      href: "/admin/chat",
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Estimasi Pipeline Omset (AI)",
      value: financeResponse?.data.pipelineSummary.estimatedPipelineRevenue
        ? formatRupiah(financeResponse.data.pipelineSummary.estimatedPipelineRevenue)
        : "Rp …",
      icon: TrendingUp,
      href: "/admin/chat",
      color: "bg-emerald-50 text-emerald-700",
    },
  ];

  const handleAskFinanceAdvisor = async (promptText?: string) => {
    const queryToAsk = (promptText || aiQuestion).trim();
    if (!queryToAsk) return;

    setAiQuestion(queryToAsk);
    setIsAsking(true);
    setAiAnswer(null);

    try {
      const res = await apiRequest<ApiResponse<FinanceQueryData>>("/api/ai/finance/query", {
        method: "POST",
        body: { query: queryToAsk },
      });
      setAiAnswer(res.data.answer);
    } catch (err: any) {
      setAiAnswer("Maaf, terjadi kendala saat menghubungi AI Finance Advisor.");
    } finally {
      setIsAsking(false);
    }
  };

  const quickQuestions = [
    "Bagaimana cara memaksimalkan omset strip glukometer?",
    "Strategi bundling produk alat & obat diabetes",
    "Berapa estimasi nilai konversi lead berurgensi tinggi?",
  ];

  const financialData = financeResponse?.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0D5C46] tracking-tight">
          Dashboard Manajemen & AI Intelligence
        </h1>
        <p className="text-sm text-[#6B7C72] mt-1">
          Ringkasan operasional, produk, dokter, dan analisis finansial cerdas GlucoCare
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group bg-white rounded-2xl p-5 border border-[#EAE4DC] hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#1A2421]">
                    {isLoading || (stat.href === "/admin/chat" && chatStatsLoading && !stat.label.includes("AI"))
                      ? "…"
                      : stat.value}
                  </p>
                  <p className="text-xs font-semibold text-[#6B7C72] mt-0.5">{stat.label}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#B0ADA8] group-hover:text-[#0D5C46] group-hover:translate-x-1 transition-all mt-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* AI Finance & Revenue Intelligence Advisor */}
      <div className="bg-gradient-to-br from-[#0D5C46]/5 via-white to-emerald-50/40 rounded-3xl border border-[#0D5C46]/20 p-6 lg:p-8 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0D5C46]/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D5C46] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0D5C46]">
                AI Finance & Revenue Intelligence Agent
              </h2>
              <p className="text-xs text-[#5A6E63]">
                Analisis otomatis potensi pipeline omset, konversi lead pasien, dan rekomendasi bisnis
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#0D5C46]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live AI Insights
          </span>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-[#EAE4DC] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
              <Coins className="w-4 h-4 text-[#E07A5F]" />
              Valuasi Katalog Aktif
            </div>
            <p className="text-xl font-extrabold text-[#1A2421] mt-2">
              {financialData?.catalogSummary.totalCatalogValue
                ? formatRupiah(financialData.catalogSummary.totalCatalogValue)
                : "Rp …"}
            </p>
            <p className="text-[11px] text-[#8A978F] mt-1">
              Dari {financialData?.catalogSummary.totalActiveProducts ?? products.length} produk di katalog
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#EAE4DC] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-[#0D5C46]" />
              Pipeline Omset Lead
            </div>
            <p className="text-xl font-extrabold text-[#0D5C46] mt-2">
              {financialData?.pipelineSummary.estimatedPipelineRevenue
                ? formatRupiah(financialData.pipelineSummary.estimatedPipelineRevenue)
                : "Rp …"}
            </p>
            <p className="text-[11px] text-[#8A978F] mt-1">
              {financialData?.pipelineSummary.highIntentLeadsCount ?? 0} lead berurgensi tinggi
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#EAE4DC] shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              Potensi Per Lead (ALV)
            </div>
            <p className="text-xl font-extrabold text-amber-700 mt-2">
              {financialData?.pipelineSummary.averageLeadPotentialValue
                ? formatRupiah(financialData.pipelineSummary.averageLeadPotentialValue)
                : "Rp …"}
            </p>
            <p className="text-[11px] text-[#8A978F] mt-1">Rata-rata estimasi nilai transaksi per lead</p>
          </div>
        </div>

        {/* AI Narrative Executive Summary */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE4DC] space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D5C46] flex items-center gap-2">
              <Bot className="w-4 h-4" /> Ringkasan Eksekutif Finansial AI
            </h3>
            <div className="mt-2">
              <FormattedMarkdown
                content={
                  financialData?.executiveSummary.overview ||
                  "Memuat analisis komprehensif dari AI Financial Advisor..."
                }
              />
            </div>
          </div>

          {financialData?.executiveSummary.keyOpportunities && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#F2ECE4]">
              <div>
                <h4 className="text-xs font-bold text-[#1A2421] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Peluang Revenue Utama:
                </h4>
                <ul className="space-y-1.5 text-xs text-[#5A6E63]">
                  {financialData.executiveSummary.keyOpportunities.map((opp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#0D5C46] font-bold">•</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#1A2421] mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#E07A5F]" /> Rekomendasi Bundling Produk:
                </h4>
                <ul className="space-y-1.5 text-xs text-[#5A6E63]">
                  {financialData.executiveSummary.bundlingRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#E07A5F] font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Interactive AI Finance Q&A */}
        <div className="bg-[#FAF8F5] rounded-2xl p-5 border border-[#EAE4DC] space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-question" className="text-xs font-bold text-[#0D5C46] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#0D5C46]" /> Tanya AI Penasihat Finansial & Bisnis:
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAskFinanceAdvisor(q)}
                className="cursor-pointer text-[11px] font-semibold bg-white hover:bg-[#0D5C46]/10 text-[#0D5C46] border border-[#0D5C46]/20 px-3 py-1.5 rounded-xl transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskFinanceAdvisor();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="ai-question"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ketik pertanyaan finansial/omset untuk AI Advisor..."
              className="flex-1 bg-white border border-[#EAE4DC] rounded-xl px-4 py-2.5 text-sm text-[#1A2421] outline-none focus:border-[#0D5C46]"
            />
            <button
              type="submit"
              disabled={isAsking || !aiQuestion.trim()}
              className="cursor-pointer bg-[#0D5C46] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#0A4A38] disabled:opacity-50 transition-colors"
            >
              {isAsking ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Tanya
                </>
              )}
            </button>
          </form>

          {aiAnswer && (
            <div className="mt-3 p-4 bg-white rounded-xl border border-[#0D5C46]/20 text-xs leading-relaxed text-[#2A3D35] space-y-1 animate-fadeIn">
              <p className="font-bold text-[#0D5C46] flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Jawaban AI Finance Advisor:
              </p>
              <FormattedMarkdown content={aiAnswer} />
            </div>
          )}
        </div>
      </div>

      {/* Quick Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-white rounded-2xl border border-[#EAE4DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE4DC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0D5C46]">Produk & Alat Medis</h2>
            <Link href="/admin/produk" className="text-xs font-semibold text-[#E07A5F] hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-[#F2ECE4]">
            {products.slice(0, 4).map((product) => (
              <div key={product.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                  <p className="text-xs text-[#6B7C72]">{product.category}</p>
                </div>
                <span className="text-xs font-bold text-[#0D5C46]">
                  {formatRupiah(product.price)}
                </span>
              </div>
            ))}
            {!isLoading && products.length === 0 && (
              <p className="px-6 py-6 text-sm text-[#6B7C72]">Belum ada produk.</p>
            )}
          </div>
        </div>

        {/* Recent Doctors */}
        <div className="bg-white rounded-2xl border border-[#EAE4DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE4DC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0D5C46]">Dokter Spesialis</h2>
            <Link href="/admin/dokter" className="text-xs font-semibold text-[#E07A5F] hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-[#F2ECE4]">
            {doctors.slice(0, 4).map((doctor) => (
              <div key={doctor.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A2421]">{doctor.name}</p>
                  <p className="text-xs text-[#6B7C72]">{doctor.specialty}</p>
                </div>
                <span className="text-xs font-semibold text-[#6B7C72]">{doctor.experience}</span>
              </div>
            ))}
            {!isLoading && doctors.length === 0 && (
              <p className="px-6 py-6 text-sm text-[#6B7C72]">Belum ada dokter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
