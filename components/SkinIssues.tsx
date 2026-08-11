"use client";

import React from "react";
import { Sparkles, MessageCircle, ShieldAlert, Zap, Droplets, Sun } from "lucide-react";

interface SkinIssuesProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function SkinIssues({ onOpenChat }: SkinIssuesProps) {
  const issues = [
    {
      id: "acne",
      icon: ShieldAlert,
      title: "Jerawat & Inflamasi",
      subtitle: "Acne, Papula, Pustula & Redness",
      description: "Jerawat meradang dan berulang yang mengganggu percaya diri lo. Dapatkan kombinasi bahan aktif seperti Salicylic Acid & Centella yang pas.",
      query: "Gue ada masalah jerawat meradang sama acne berulang, tolong rekomendasiin rangkaian skincare yang aman."
    },
    {
      id: "darkspot",
      icon: Sun,
      title: "Flek Hitam & Dark Spot",
      subtitle: "Hiperpigmentasi & Bekas Jerawat (PIH)",
      description: "Noda hitam bekas jerawat yang susah pudar. AI akan mencocokkan dosis Niacinamide, Alpha Arbutin, dan Vitamin C yang efektif.",
      query: "Bekas jerawat gue menghitam dan ada dark spot di pipi, skincare apa yang efektif mencerahkan?"
    },
    {
      id: "barrier",
      icon: Droplets,
      title: "Breakout & Barrier Rusak",
      subtitle: "Irritation, Peeling & Sensitive Skin",
      description: "Muka terasa perih, kemerahan, atau bruntusan parah akibat eksfoliasi berlebih. Fokus pada pemulihan Ceramide & Hyaluronic Acid.",
      query: "Kulit gue perih, bruntusan parah dan kayanya skin barrier rusak, butuh pertolongan pertama."
    },
    {
      id: "sebum",
      icon: Zap,
      title: "Kulit Kusam & Berminyak",
      subtitle: "Excess Sebum & Large Pores",
      description: "Muka kusam dan kilap berlebih di area T-zone. Dapatkan panduan kontrol minyak tanpa bikin kulit terasa kering ditarik.",
      query: "Muka gue kusam dan oily banget di T-zone, gimana cara kontrol sebum yang bener?"
    }
  ];

  return (
    <section id="masalah-kulit" className="py-20 bg-white border-y border-[#E6E1DA]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2D4A3E] bg-[#E8EFE9] px-3.5 py-1.5 rounded-full inline-block mb-4">
            Spesialisasi Keluhan Wajah
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
            Mana Masalah Kulit yang Lagi Lo Alamin?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5A5A5A]">
            Setiap tipe masalah membutuhkan kombinasi bahan aktif yang berbeda. Pilih keluhan lo untuk langsung berdiskusi dengan AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {issues.map((issue) => {
            const Icon = issue.icon;
            return (
              <div
                key={issue.id}
                className="group relative bg-[#FAF8F5] border border-[#E6E1DA] hover:border-[#2D4A3E] rounded-3xl p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#E8EFE9] group-hover:bg-[#2D4A3E] text-[#2D4A3E] group-hover:text-white flex items-center justify-center transition-colors mb-6 shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1A] group-hover:text-[#2D4A3E] transition-colors">
                    {issue.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#2D4A3E] mt-1 mb-3">
                    {issue.subtitle}
                  </p>

                  <p className="text-sm text-[#5A5A5A] leading-relaxed mb-6">
                    {issue.description}
                  </p>
                </div>

                <button
                  onClick={() => onOpenChat(issue.query)}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#2D4A3E] text-[#2D4A3E] hover:text-white border border-[#D0DFD3] hover:border-[#2D4A3E] py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Tanya AI Soal Ini</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
