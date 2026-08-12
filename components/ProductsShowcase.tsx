"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, ShoppingBag } from "lucide-react";

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
      description: "Kit lengkap cek kadar gula darah puasa & sewaktu dengan hasil serba cepat 5 detik dan memori histori tes.",
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
            Pilihan obat regulasi gula darah terverifikasi, alat cek digital praktis, dan suplemen herbal alami.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {products.map((product, idx) => (
            <div
              key={idx}
              onClick={() => onOpenChat(product.query)}
              className="group bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE4DC] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-5">
                {/* Product Image Box */}
                <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#EAE4DC]/60">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Floating Glassmorphism Price Badge */}
                  <div className="absolute top-3.5 right-3.5 bg-white/90 backdrop-blur-md text-[#0D5C46] font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-[#EAE4DC] shadow-sm">
                    {product.price}
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <div>
                    <span className="inline-block bg-[#E07A5F]/10 text-[#E07A5F] text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md tracking-wider mb-2">
                      {product.category}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#0D5C46] group-hover:text-[#E07A5F] transition-colors leading-snug">
                      {product.name}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#52635A] leading-relaxed">
                    {product.description}
                  </p>

                  {/* Ingredient / Spec Badges */}
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {product.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        className="bg-[#F4EFEA] text-[#2D5A46] text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Trigger Button */}
              <div className="pt-6 mt-6 border-t border-[#F2ECE4] flex items-center justify-between text-xs font-bold text-[#0D5C46] group-hover:text-[#E07A5F]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#E07A5F]" />
                  <span>Tanya AI & Pesan Produk Ini</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#F4EFEA] group-hover:bg-[#E07A5F] group-hover:text-white flex items-center justify-center transition-all">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
