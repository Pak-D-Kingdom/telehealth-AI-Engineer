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
    { id: "all", label: "Semua Spesialis" },
    { id: "acne", label: "Jerawat & Inflamasi" },
    { id: "darkspot", label: "Flek Hitam & PIH" },
    { id: "barrier", label: "Skin Barrier & Perih" },
    { id: "sebum", label: "Pori & Sebum Control" }
  ];

  const doctors = [
    {
      id: "doc1",
      name: "dr. Arisandi Putri, Sp.D.V.E",
      specialty: "Spesialis Acne & Hiperpigmentasi",
      experience: "8+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_1.png",
      categoryIds: ["acne", "darkspot"],
      query: "Gue mau konsul langsung soal jerawat meradang & flek hitam sama dr. Arisandi, Sp.D.V.E"
    },
    {
      id: "doc2",
      name: "dr. Rayhan Pratama, Sp.D.V.E",
      specialty: "Spesialis Skin Barrier & Molekuler",
      experience: "10+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_2.png",
      categoryIds: ["barrier", "acne"],
      query: "Gue mau konsul penanganan skin barrier rusak sama dr. Rayhan, Sp.D.V.E"
    },
    {
      id: "doc3",
      name: "dr. Clarissa Wijaya, Sp.D.V.E",
      specialty: "Spesialis Dermatologi Estetika",
      experience: "7+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_3.png",
      categoryIds: ["darkspot", "barrier"],
      query: "Gue mau konsul racikan pencerah bekas jerawat sama dr. Clarissa, Sp.D.V.E"
    },
    {
      id: "doc4",
      name: "dr. Kevin Tanaka, Sp.D.V.E",
      specialty: "Spesialis Pori & Sebum Control",
      experience: "9+ Tahun Pengalaman",
      str: "STR & SIP Kemenkes RI",
      image: "/images/doctor_4.png",
      categoryIds: ["sebum", "acne"],
      query: "Gue mau konsul kontrol minyak berlebih & pori-pori tersumbat sama dr. Kevin, Sp.D.V.E"
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
              Tim Dokter Spesialis Kulit
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#132E21] tracking-tight leading-tight">
              Didampingi Dokter Dermatologi Terverifikasi
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Setiap formulasi dan analisis kondisi kulit diawasi langsung oleh tim dokter spesialis kulit (Sp.D.V.E) terdaftar resmi.
          </p>
        </div>

        {/* Interactive Filter Menu Pills */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-[#132E21] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#E07A5F]" />
            <span>Pilih Masalah Kulit Muka Anda:</span>
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
                      ? "bg-[#132E21] text-white border-[#132E21] shadow-md scale-105"
                      : "bg-white text-[#4A5D53] border-[#E8E4DE] hover:border-[#132E21]/40 hover:text-[#132E21]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-[#E07A5F] text-white" : "bg-[#FAF8F5] text-[#285A41]"
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
                  <h3 className="text-lg font-bold text-[#132E21] tracking-tight leading-snug">
                    {doc.name}
                  </h3>
                </div>

                {/* Experience & Credentials */}
                <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#4A5D53] pt-1 border-t border-[#F0ECE6]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#285A41]" />
                    <span>{doc.experience}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#285A41]" />
                    <span>{doc.str}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenChat(doc.query)}
                  className="w-full flex items-center justify-between bg-[#132E21] hover:bg-[#1E4431] text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 group/btn cursor-pointer"
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
