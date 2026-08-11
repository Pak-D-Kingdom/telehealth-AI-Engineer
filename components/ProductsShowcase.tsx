"use client";

import React from "react";
import Image from "next/image";
import { Sparkles, Check, MessageSquare } from "lucide-react";

interface ProductsShowcaseProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function ProductsShowcase({ onOpenChat }: ProductsShowcaseProps) {
  const products = [
    {
      name: "Lumina Botanical Serum",
      category: "Targeted Serum (Jerawat & Dark Spot)",
      image: "/images/serum.png",
      tag: "Formulasi Jerawat & Bekas Noda",
      ingredients: ["Salicylic Acid 2%", "Niacinamide 5%", "Centella Asiatica"],
      description: "Membantu meredakan peradangan jerawat aktif sekaligus memudarkan flek hitam bekas jerawat tanpa iritasi.",
      query: "Tolong jelasin cara pakai Lumina Botanical Serum buat jerawat dan flek hitam."
    },
    {
      name: "Oak & Ash Botanical Moisturizer",
      category: "Barrier Repair Cream",
      image: "/images/cream.png",
      tag: "Pemulihan Skin Barrier",
      ingredients: ["Ceramide Complex", "Hyaluronic Acid", "Rosehip & Jojoba Oil"],
      description: "Mengunci kelembapan mendalam, memperbaiki lapisan kulit yang terkelupas, dan menenangkan rasa perih akibat breakout.",
      query: "Apakah Oak & Ash Hydrating Cream cocok buat kulit sensitif yang lagi breakout?"
    }
  ];

  return (
    <section id="produk" className="py-20 bg-white border-t border-[#E6E1DA]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2D4A3E] bg-[#E8EFE9] px-3.5 py-1.5 rounded-full inline-block mb-4">
            Contoh Formulasi Terkurasi
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
            Produk yang Sering Direkomendasikan AI
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5A5A5A]">
            Berdasarkan ribuan analisis keluhan kulit, berikut adalah tipe formulasi utama yang efektif mengatasi masalah wajah.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {products.map((product, idx) => (
            <div
              key={idx}
              className="bg-[#FAF8F5] border border-[#E6E1DA] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center hover:border-[#2D4A3E] transition-all shadow-sm hover:shadow-md"
            >
              {/* Product Image */}
              <div className="relative w-full sm:w-48 h-56 rounded-2xl overflow-hidden bg-white border border-[#E6E1DA] shrink-0">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                <span className="absolute top-3 left-3 bg-[#2D4A3E] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {product.tag}
                </span>
              </div>

              {/* Product Info */}
              <div className="flex flex-col justify-between h-full w-full">
                <div>
                  <span className="text-xs font-semibold text-[#2D4A3E] block mb-1">
                    {product.category}
                  </span>
                  <h3 className="text-xl font-bold text-[#1A1A1A]">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#5A5A5A] mt-2 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#E6E1DA]">
                    <span className="text-[11px] font-bold text-[#4A4A4A] block mb-2">
                      Kandungan Utama:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          className="bg-white border border-[#D0DFD3] text-[#2D4A3E] text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => onOpenChat(product.query)}
                    className="w-full flex items-center justify-center gap-2 bg-[#2D4A3E] hover:bg-[#233A31] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Konsultasikan Dosis Produk Ini</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
