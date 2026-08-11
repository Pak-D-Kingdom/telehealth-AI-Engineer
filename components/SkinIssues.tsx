"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface SkinIssuesProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function SkinIssues({ onOpenChat }: SkinIssuesProps) {
  const issues = [
    {
      id: "acne",
      title: "Jerawat & Inflamasi",
      subtitle: "Acne, Papula, Pustula & Redness",
      description: "Jerawat meradang dan berulang yang bikin nggak pede. Butuh penanganan menenangkan yang nggak bikin kulit makin kering.",
      ingredients: "Salicylic Acid 2% + Centella Asiatica",
      image: "/images/issue_acne.png",
      query: "Gue ada masalah jerawat meradang sama acne berulang, tolong rekomendasiin rangkaian skincare yang aman."
    },
    {
      id: "darkspot",
      title: "Flek Hitam & Dark Spot",
      subtitle: "Hiperpigmentasi & Bekas Jerawat (PIH)",
      description: "Noda hitam bekas jerawat yang membandel. DermAssistant akan mencocokkan dosis pencerah yang aman dan bertahap.",
      ingredients: "Niacinamide 10% + Alpha Arbutin",
      image: "/images/issue_darkspot.png",
      query: "Bekas jerawat gue menghitam dan ada dark spot di pipi, skincare apa yang efektif mencerahkan?"
    },
    {
      id: "barrier",
      title: "Breakout & Barrier Rusak",
      subtitle: "Irritation, Peeling & Sensitive Skin",
      description: "Muka terasa perih atau bruntusan parah akibat eksfoliasi berlebih. Fokus utama ke pemulihan kelembapan skin barrier.",
      ingredients: "Ceramide Complex + Panthenol",
      image: "/images/issue_barrier.png",
      query: "Kulit gue perih, bruntusan parah dan kayanya skin barrier rusak, butuh pertolongan pertama."
    },
    {
      id: "sebum",
      title: "Kulit Kusam & Berminyak",
      subtitle: "Excess Sebum & Large Pores",
      description: "Muka kusam dan kilap berlebih di area T-zone. Dapatkan panduan penyeimbang minyak tanpa bikin kulit terasa ditarik.",
      ingredients: "Tea Tree Extract + Zinc PCA",
      image: "/images/issue_sebum.png",
      query: "Muka gue kusam dan oily banget di T-zone, gimana cara kontrol sebum yang bener?"
    }
  ];

  return (
    <section id="masalah-kulit" className="py-24 bg-[#FAF8F5] border-y border-[#E8E4DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Left-Aligned Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 border-b border-[#E8E4DE] pb-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold tracking-widest text-[#285A41] uppercase">
              Spesialisasi Kulit Wajah
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#132E21] tracking-tight leading-tight">
              Pilih Kondisi Kulit Muka Lo
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Tiap keluhan butuh persentase bahan aktif beda. Klik masalah lo buat dapet racikan formulasi dari DermAssistant.
          </p>
        </div>

        {/* 4 Cards Grid - Editorial Minimalist Style (No floating badges / pills) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => onOpenChat(issue.query)}
              className="group flex flex-col justify-between cursor-pointer space-y-5"
            >
              <div className="space-y-4">
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#EAE6DF] border border-[#E0DACF]">
                  <Image
                    src={issue.image}
                    alt={issue.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Ingredient Subtitle Text */}
                <p className="text-[11px] font-semibold text-[#285A41] tracking-wider uppercase">
                  {issue.ingredients}
                </p>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#132E21] group-hover:text-[#285A41] transition-colors leading-snug">
                  {issue.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#5C6E64] leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {/* Clean Underline Text Trigger (No pill buttons) */}
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-[#132E21] group-hover:text-[#285A41]">
                <span className="border-b-2 border-[#132E21]/20 group-hover:border-[#285A41] pb-0.5 transition-colors">
                  Konsul Keluhan Ini
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
