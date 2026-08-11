"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

interface HowItWorksProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function HowItWorks({ onOpenChat }: HowItWorksProps) {
  const checklist = [
    "Formulasi pas sesuai kondisi riil muka lo",
    "Stop buang duit buat skincare yang bikin breakout",
    "Bahan aktif teruji (Salicylic, Niacinamide, Ceramide)",
    "Dosis aman khusus biar skin barrier gak perih",
    "Panduan pemakaian harian yang super simpel"
  ];

  return (
    <section id="cara-kerja" className="py-24 bg-[#FBF8F5] text-[#1A2421] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column (Span 5) */}
          <div className="lg:col-span-5 space-y-10">
            {/* Top Left Image Container - Clean Without Outer Background Color */}
            <div className="relative w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-sm border border-[#E8DFC0]/40">
              <Image
                src="/images/cream.png"
                alt="Perawatan Skincare"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Checklist Section - Gen-Z Oriented */}
            <div className="space-y-5 pl-1">
              <h3 className="text-2xl font-bold text-[#132E21] tracking-tight">
                Skincare-an Gak Pake Drama
              </h3>

              <ul className="space-y-3.5">
                {checklist.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#E07A5F] text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-sm font-semibold text-[#4A5550]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column (Span 7) */}
          <div className="lg:col-span-7 space-y-12">
            {/* Top Right Headline - Gen Z Oriented */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold tracking-[0.2em] text-[#E07A5F] uppercase">
                Dermatologi Gen-Z
              </span>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#132E21] tracking-tight leading-[1.15]">
                <span className="text-[#E07A5F]">Glow up</span> tanpa trial-error, jagain skin barrier muka lo.
              </h2>
            </div>

            {/* Middle 2 Vertical Editorial Cards */}
            <div className="grid grid-cols-2 gap-6">
              {/* Card 1: Model Portrait */}
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#EAE3D9] border border-[#E2D9CC] shadow-sm">
                <Image
                  src="/images/issue_acne.png"
                  alt="Model Kulit Sehat"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Card 2: Skincare Product Texture */}
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#EAE3D9] border border-[#E2D9CC] shadow-sm">
                <Image
                  src="/images/serum.png"
                  alt="Bahan Aktif Skincare"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Bottom Story & CTA - Gen Z Oriented */}
            <div className="space-y-6 max-w-xl">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#132E21] tracking-tight leading-snug">
                Stop kemakan racun skincare FYP yang gak cocok di muka
              </h3>

              <p className="text-sm sm:text-base text-[#4A5550] leading-relaxed">
                DermAssistant bakal bedah masalah kulit lo secara detail dan racikin kombinasi bahan aktif yang pas. Gak ada lagi cerita dompet menipis cuma buat coba-coba produk yang malah bikin muka makin perih dan breakout.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => onOpenChat("Gue mau konsul keluhan kulit muka sekarang.")}
                  className="inline-flex items-center justify-center bg-[#E07A5F] hover:bg-[#C9664B] text-white px-9 py-4 rounded-full font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg active:scale-95 uppercase tracking-wider"
                >
                  Konsul DermAssistant Sekarang
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
