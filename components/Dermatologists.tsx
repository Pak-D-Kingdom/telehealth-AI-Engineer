"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, Calendar, CheckCircle2, Filter } from "lucide-react";

interface DermatologistsProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function Dermatologists({ onOpenChat }: DermatologistsProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const categories = [
    { id: "all", label: "Semua Dokter Spesialis" },
    { id: "diabetes2", label: "Diabetes Tipe 2 & Gula Tinggi" },
    { id: "ulkus", label: "Luka Diabetes (Ulkus)" },
    { id: "insulin", label: "Sensitivitas Insulin" },
    { id: "gestational", label: "Gestational Diabetes" }
  ];

  const doctors = [
    {
      id: "doc1",
      name: "dr. Hendra Wijaya, Sp.PD-KEMD",
      specialty: "Spesialis Endokrinologi & Diabetes Tipe 2",
      experience: "12+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_1.png",
      categoryIds: ["diabetes2", "insulin"],
      query: "Gue mau konsul langsung penanganan gula darah tinggi & diabetes tipe 2 sama dr. Hendra, Sp.PD-KEMD"
    },
    {
      id: "doc2",
      name: "dr. Siti Rahma, Sp.PD",
      specialty: "Spesialis Kontrol Gula Darah & Nutrisi",
      experience: "10+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_2.png",
      categoryIds: ["diabetes2", "gestational"],
      query: "Gue mau konsul rincian nutrisi & kontrol gula darah harian sama dr. Siti Rahma, Sp.PD"
    },
    {
      id: "doc3",
      name: "dr. Andreas Pratama, Sp.PD-KEMD",
      specialty: "Spesialis Luka Diabetes (Ulkus Kakak)",
      experience: "14+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_3.png",
      categoryIds: ["ulkus", "diabetes2"],
      query: "Gue mau konsul perawatan luka basah diabetes (ulkus) sama dr. Andreas, Sp.PD-KEMD"
    },
    {
      id: "doc4",
      name: "dr. Maya Indriani, Sp.PD",
      specialty: "Spesialis Gestational Diabetes & HbA1c",
      experience: "9+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_4.png",
      categoryIds: ["gestational", "insulin"],
      query: "Gue mau konsul skrining HbA1c & gestational diabetes sama dr. Maya Indriani, Sp.PD"
    }
  ];

  const filteredDoctors = activeFilter === "all"
    ? doctors
    : doctors.filter(doc => doc.categoryIds.includes(activeFilter));

  return (
    <section id="dokter" className="py-24 bg-[#FAF8F5] text-[#132E21] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-[#EAE4DC] pb-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-widest">
              Tim Dokter Spesialis Terdaftar
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0D5C46] tracking-tight leading-tight">
              Tim Dokter Spesialis Penyakit Dalam (Sp.PD)
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Setiap rekomendasi obat dan konsultasi diabetes diawasi langsung oleh Dokter Spesialis Penyakit Dalam & Endokrinologi terdaftar resmi.
          </p>
        </div>

        {/* Interactive Filter Menu Pills */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-[#0D5C46] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#E07A5F]" />
            <span>Pilih Bidang Konsultasi Dokter:</span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => {
              const isActive = activeFilter === cat.id;
              const count = cat.id === "all" ? doctors.length : doctors.filter(d => d.categoryIds.includes(cat.id)).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`px-5 py-3 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-300 border cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-[#0D5C46] text-white border-[#0D5C46] shadow-md scale-105"
                      : "bg-white text-[#4A5D53] border-[#E8E4DE] hover:border-[#0D5C46]/40 hover:text-[#0D5C46]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-[#E07A5F] text-white" : "bg-[#FAF8F5] text-[#0D5C46]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Doctor Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 transition-all duration-300">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="group flex flex-col justify-between space-y-6 bg-white p-5 rounded-3xl border border-[#E8E4DE] shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in zoom-in-95"
            >
              <div className="space-y-4">
                {/* Doctor Photo Frame */}
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#F3ECE5]">
                  <Image
                    src={doc.image}
                    alt={doc.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                {/* Info & Prominent Specialization */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-sm font-extrabold text-[#E07A5F] leading-snug">
                    {doc.specialty}
                  </h4>
                  <h3 className="text-lg font-bold text-[#0D5C46] tracking-tight leading-snug">
                    {doc.name}
                  </h3>
                </div>

                {/* Experience & Credentials */}
                <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#4A5D53] pt-1 border-t border-[#F0ECE6]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0D5C46]" />
                    <span>{doc.experience}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0D5C46]" />
                    <span>{doc.str}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenChat(doc.query)}
                  className="w-full flex items-center justify-between bg-[#0D5C46] hover:bg-[#1A8B6B] text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 group/btn cursor-pointer"
                >
                  <span>Konsultasi Dokter Ini</span>
                  <ArrowRight className="w-4 h-4 text-[#E07A5F] group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
