"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";

interface HeroProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function Hero({ onOpenChat }: HeroProps) {
  const categoryCards = [
    {
      title: "Gula Darah Tinggi",
      bg: "bg-[#EAF5EF]",
      image: "/images/card_sugar.png",
      query: "Saya ingin berkonsultasi tentang keluhan kadar gula darah puasa tinggi dan sering lemas."
    },
    {
      title: "Skrining HbA1c",
      bg: "bg-[#F3EFEA]",
      image: "/images/card_hba1c.png",
      query: "Gimana cara kontrol kadar HbA1c dan sensitivitas insulin secara efektif?"
    },
    {
      title: "Dokter Spesialis Sp.PD",
      bg: "bg-[#F5F2EA]",
      image: "/images/card_doctor.png",
      query: "Saya mau konsul langsung dengan Dokter Spesialis Penyakit Dalam (Sp.PD)."
    },
    {
      title: "Luka & Pola Makan",
      bg: "bg-[#FCEFEF]",
      image: "/images/card_diet_ulcer.png",
      query: "Ada rekomendasi gel perawatan luka diabetes dan saran pola makan low-GI?"
    }
  ];

  return (
    <section className="relative bg-gradient-to-b from-[#0A3020] via-[#0E422C] to-[#124D33] text-white pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Static Subtle Dot Pattern Texture */}
      <DotPattern
        width={24}
        height={24}
        cx={2}
        cy={2}
        cr={1.8}
        glow={false}
        className="[mask-image:radial-gradient(800px_circle_at_center,white,transparent)] opacity-25 text-[#88D39E]"
      />

      {/* Background Text Watermark - Subtle & Elegant */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-5">
        <span className="text-[10vw] sm:text-[11vw] font-black tracking-widest text-white whitespace-nowrap">
          GLUCOCARE
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Centered Top Content with Clean Indonesian Copywriting */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-white/80">
            Edukasi diabetes, pencegahan, dan pencatatan keluhan dalam satu platform terpadu
          </p>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.12]">
            Layanan Medis,{" "}
            <span className="text-[#88D39E] font-medium italic">didesain ulang</span>{" "}
            untuk hidupmu.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-white/80 max-w-2xl mx-auto font-normal leading-relaxed">
            Perawatan gula darah & diabetes online — simpel, langsung, dan dipandu oleh Dokter Spesialis Penyakit Dalam (Sp.PD). Dapatkan edukasi akurat, kenali tanda darurat, dan konsultasi tepat sasaran.
          </p>
        </div>

        {/* 4 Cards Grid Directly on Dark Background */}
        <div className="mt-14 lg:mt-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {categoryCards.map((card, idx) => (
              <div
                key={idx}
                onClick={() => onOpenChat(card.query)}
                className="group relative bg-white text-[#0A3020] rounded-3xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-2xl border border-white/20"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF8F5]">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Title & Arrow Footer */}
                <div className="px-2 pt-3.5 pb-1 flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-[#0A3020] group-hover:text-[#E07A5F] transition-colors leading-snug">
                    {card.title}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#FAF8F5] group-hover:bg-[#0A3020] text-[#0A3020] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
