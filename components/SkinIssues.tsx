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
      id: "high_sugar",
      title: "Gula Darah Tinggi (Hiperglikemia)",
      subtitle: "Gula Darah Puasa di Atas 126 mg/dL",
      description: "Gejala badan sering lemas, gampang haus, dan kencing terus-menerus di malam hari. Butuh kontrol gula darah teratur.",
      ingredients: "Topik: hasil gula darah & gaya hidup",
      image: "/images/issue_high_sugar.png",
      query: "Saya ingin bertanya tentang gula darah tinggi dan rasa haus yang sering muncul."
    },
    {
      id: "hba1c",
      title: "Memahami HbA1c & Insulin",
      subtitle: "Gambaran Gula Darah 3 Bulan Terakhir",
      description: "HbA1c membantu melihat gambaran rata-rata gula darah selama sekitar 3 bulan dan mendukung pemantauan rutin.",
      ingredients: "Topik: HbA1c & pemantauan berkala",
      image: "/images/issue_hba1c.png",
      query: "Gimana cara mengevaluasi hasil tes HbA1c dan meningkatkan sensitivitas insulin?"
    },
    {
      id: "ulcer",
      title: "Luka Diabetes Sulit Sembuh",
      subtitle: "Perawatan Luka dan Kulit",
      description: "Luka kaki pada penyandang diabetes perlu dinilai tenaga medis, terutama bila merah, bengkak, bernanah, atau disertai demam.",
      ingredients: "Topik: tanda bahaya luka diabetes",
      image: "/images/issue_ulcer.png",
      query: "Luka di kaki saya basah dan lambat sembuh karena diabetes. Apa yang perlu saya lakukan?"
    },
    {
      id: "diet",
      title: "Pola Makan untuk Diabetes",
      subtitle: "Makanan yang Lebih Lambat Menaikkan Gula Darah",
      description: "Panduan makanan sehari-hari untuk membantu mengurangi kenaikan gula darah setelah makan.",
      ingredients: "Topik: pola makan & indeks glikemik",
      image: "/images/issue_diet.png",
      query: "Tolong kasih panduan diet diabetes dan pilihan makanan berindeks glikemik rendah."
    }
  ];

  return (
    <section id="gejala" className="py-24 bg-[#FAF8F5] border-y border-[#E8E4DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Left-Aligned Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 border-b border-[#E8E4DE] pb-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold tracking-widest text-[#E07A5F] uppercase">
              Fokus Penyakit Gula & Diabetes
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0D5C46] tracking-tight leading-tight">
              Pilih Gejala Gula Darah Kamu
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Setiap keluhan perlu dinilai sesuai kondisi pribadi. GlucoAssistant memberi informasi umum dan tidak menentukan obat, dosis, atau diagnosis.
          </p>
        </div>

        {/* 4 Cards Grid */}
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
                <p className="text-[11px] font-semibold text-[#E07A5F] tracking-wider uppercase">
                  {issue.ingredients}
                </p>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#0D5C46] group-hover:text-[#E07A5F] transition-colors leading-snug">
                  {issue.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#4A5D53] leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {/* Clean Underline Text Trigger */}
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-[#0D5C46] group-hover:text-[#E07A5F]">
                <span className="border-b-2 border-[#0D5C46]/20 group-hover:border-[#E07A5F] pb-0.5 transition-colors">
                  Konsul Gejala Ini
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
