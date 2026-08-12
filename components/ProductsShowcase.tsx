"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface ProductsShowcaseProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function ProductsShowcase({ onOpenChat }: ProductsShowcaseProps) {
  const products = [
    {
      name: "GlucoMeter Pro Digital Kit",
      category: "Alat Cek Gula Darah Digital",
      price: "Rp 189.000",
      image: "/images/glucometer.png",
      ingredients: ["Kit Digital", "50 Strip Cek", "50 Jarum Lancet", "Garansi 1 Tahun"],
      description: "Kit lengkap cek kadar gula darah puasa & sewaktu dengan hasil presisi instan 5 detik dan memori histori tes.",
      query: "Gue mau pesan GlucoMeter Pro Digital Kit buat cek gula darah rutin di rumah."
    },
    {
      name: "Metformin 500mg Release Control",
      category: "Obat Regulasional Gula Darah",
      price: "Rp 45.000",
      image: "/images/metformin.png",
      ingredients: ["Metformin HCL 500mg", "Controlled Release Tablet"],
      description: "Obat utama pengontrol kadar gula darah puasa dan penurun resistensi insulin di bawah pengawasan medis.",
      query: "Apakah Metformin 500mg aman untuk pengontrolan gula darah awal?"
    },
    {
      name: "GlucoShield Cinnamon & Chromium Complex",
      category: "Suplemen Sensitivitas Insulin",
      price: "Rp 119.000",
      image: "/images/cinnamon_herbal.png",
      ingredients: ["Ekstrak Kayu Manis", "Chromium Picolinate", "Alpha Lipoic Acid"],
      description: "Suplemen herbal alami peningkat sensitivitas insulin dan pencegah lonjakan gula darah pasca makan.",
      query: "Gue mau konsul dosis suplemen herbal kayu manis GlucoShield."
    },
    {
      name: "GlucoDerm Diabetic Ulcer Care Gel",
      category: "Gel Perawatan Luka Diabetes",
      price: "Rp 139.000",
      image: "/images/ulcer_gel.png",
      ingredients: ["Hydrogel Medis", "Centella Extract", "Zinc Oxide"],
      description: "Gel khusus penutup dan penyembuh luka basah diabetes (ulkus) agar kulit cepat beregenerasi dan tidak infeksi.",
      query: "Bagaimana cara pakai GlucoDerm Ulcer Care Gel untuk luka di kaki?"
    }
  ];

  return (
    <section id="obat" className="py-24 bg-[#FBF8F5] text-[#132E21] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 border-b border-[#EAE4DC] pb-10">
          <div className="max-w-xl space-y-3">
            <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-widest">
              Obat & Alat Kesehatan
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0D5C46] tracking-tight leading-tight">
              Obat & Alat Monitor Gula Darah
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Pilihan obat regulasi gula darah terverifikasi, alat cek digital presisi, dan suplemen herbal alami.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {products.map((product, idx) => (
            <div
              key={idx}
              onClick={() => onOpenChat(product.query)}
              className="group flex flex-col space-y-6 cursor-pointer"
            >
              {/* Product Image */}
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[#F2EBE1] border border-[#E8DFC0]/40">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4 bg-[#0D5C46] text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-md">
                  {product.price}
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-wider block">
                    {product.category}
                  </span>
                  <h3 className="text-2xl font-bold text-[#0D5C46] group-hover:text-[#E07A5F] transition-colors leading-snug">
                    {product.name}
                  </h3>
                </div>

                <p className="text-sm text-[#4A5D53] leading-relaxed">
                  {product.description}
                </p>

                {/* Inline Ingredients */}
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#132E21]">
                  {product.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="bg-white border border-[#E2D9CC] px-3 py-1 rounded-full text-[11px] text-[#0D5C46]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {/* Action Trigger Link */}
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-[#0D5C46] group-hover:text-[#E07A5F]">
                  <span className="border-b-2 border-[#0D5C46]/20 group-hover:border-[#E07A5F] pb-0.5 transition-colors">
                    Tanya Konsultasi / Pesan Produk Ini
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
