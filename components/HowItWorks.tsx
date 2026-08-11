"use client";

import React from "react";
import { MessageSquareCode, Cpu, Sparkles, ArrowRight } from "lucide-react";

interface HowItWorksProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function HowItWorks({ onOpenChat }: HowItWorksProps) {
  const steps = [
    {
      step: "01",
      icon: MessageSquareCode,
      title: "Curhat Keluhan Wajah",
      description: "Buka AI Chatbot dan ceritakan masalah kulit lo saat ini. Sebutkan tipe kulit, jerawat, flek, atau riwayat produk yang pernah dipakai."
    },
    {
      step: "02",
      icon: Cpu,
      title: "Analisis Formulasi AI",
      description: "AI memproses data keluhan lo dan memetakan bahan aktif (seperti Niacinamide, Salicylic Acid, Retinol) yang aman dan paling efektif."
    },
    {
      step: "03",
      icon: Sparkles,
      title: "Dapatkan Rekomendasi",
      description: "Kamu akan mendapatkan urutan skincare (Cleanser, Serum, Moisturizer, Sunscreen) yang personalized tanpa komplikasi."
    }
  ];

  return (
    <section id="cara-kerja" className="py-20 bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2D4A3E] bg-[#E8EFE9] px-3.5 py-1.5 rounded-full inline-block mb-4">
            Alur Mudah
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
            Cara Kerja AI Telehealth MySkin
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5A5A5A]">
            Tiga langkah praktis untuk mengakhiri trial-and-error skincare yang bikin boros dan bikin breakout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-white border border-[#E6E1DA] rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-black text-[#E0DCD5] tracking-tighter">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-[#E8EFE9] text-[#2D4A3E] flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
                    {item.title}
                  </h3>

                  <p className="text-sm text-[#5A5A5A] leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Box */}
        <div className="mt-12 text-center">
          <button
            onClick={() => onOpenChat("Gue mau mulai sesi konsultasi AI skincare sekarang.")}
            className="inline-flex items-center gap-3 bg-[#2D4A3E] hover:bg-[#233A31] text-white px-8 py-4 rounded-full font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <span>Coba Chatbot AI Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
