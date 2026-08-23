"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

interface HowItWorksProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function HowItWorks({ onOpenChat }: HowItWorksProps) {
  const checklist = [
    "Informasi umum hasil gula darah puasa & HbA1c",
    "Pencatatan obat yang sedang digunakan tanpa mengubah terapi",
    "Peringatan 119/IGD untuk tanda kondisi darurat",
    "Panduan pola makan dan gaya hidup dari sumber pilihan",
    "Data kontak hanya diproses setelah persetujuan"
  ];

  return (
    <section id="alur" className="py-24 bg-[#FBF8F5] text-[#1A2421] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-10">
            {/* Top Left Image Container */}
            <div className="relative w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-sm border border-[#E8DFC0]/40">
              <Image
                src="/images/how_glucometer.png"
                alt="Aplikasi Telehealth & Alat Cek Gula Darah Digital"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>

            {/* Checklist Section */}
            <div className="space-y-5 pl-1">
              <h3 className="text-2xl font-bold text-[#0D5C46] tracking-tight">
                Kontrol Diabetes Tanpa Ribet
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

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-12">
            {/* Top Right Headline */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold tracking-[0.2em] text-[#E07A5F] uppercase">
                Pendampingan Diabetes
              </span>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0D5C46] tracking-tight leading-[1.15]">
                <span className="text-[#E07A5F]">Pahami kondisi gula darah</span> bersama asisten virtual dan tim manusia.
              </h2>
            </div>

            {/* Middle 2 Vertical Editorial Cards */}
            <div className="grid grid-cols-2 gap-6">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#EAE3D9] border border-[#E2D9CC] shadow-sm">
                <Image
                  src="/images/how_medication.png"
                  alt="Ilustrasi pencatatan obat diabetes"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-[#EAE3D9] border border-[#E2D9CC] shadow-sm">
                <Image
                  src="/images/how_doctor.png"
                  alt="Konsultasi Dokter Spesialis Penyakit Dalam"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Bottom Story & CTA */}
            <div className="space-y-6 max-w-xl">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0D5C46] tracking-tight leading-snug">
                Asisten virtual yang membantu menyiapkan percakapan dengan tenaga medis
              </h3>

              <p className="text-sm sm:text-base text-[#4A5550] leading-relaxed">
                GlucoAssistant merangkum informasi yang kamu berikan dan menampilkan arahan darurat saat menemukan tanda berisiko. Data tindak lanjut baru disimpan setelah persetujuan dan tetap perlu ditinjau oleh tim manusia.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => onOpenChat("Saya ingin bertanya tentang keluhan gula darah saya.")}
                  className="inline-flex items-center justify-center bg-[#E07A5F] hover:bg-[#C9664B] text-white px-9 py-4 rounded-full font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg active:scale-95 uppercase tracking-wider cursor-pointer"
                >
                  Mulai Tanya GlucoAssistant
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
