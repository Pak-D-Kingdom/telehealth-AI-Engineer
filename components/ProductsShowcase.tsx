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
      name: "Lumina Botanical Serum",
      category: "Serum Jerawat & Flek",
      image: "/images/serum.png",
      ingredients: ["Salicylic Acid 2%", "Niacinamide 5%", "Centella Asiatica"],
      description: "Solusi buat jerawat meradang dan bekas noda hitam membandel. Meredakan kemerahan tanpa bikin kulit ketarik atau perih.",
      query: "Gue mau tanya dosis pemakaian Lumina Botanical Serum buat meredakan jerawat & flek."
    },
    {
      name: "Oak & Ash Botanical Cream",
      category: "Pelembap Skin Barrier",
      image: "/images/cream.png",
      ingredients: ["Ceramide Complex", "Hyaluronic Acid", "Jojoba Oil"],
      description: "Krim pengunci kelembapan ekstra buat memulihkan skin barrier yang rusak, ngelupas, atau perih akibat breakout.",
      query: "Apakah Oak & Ash Botanical Cream cocok buat menenangkan skin barrier perih?"
    }
  ];

  return (
    <section id="produk" className="py-24 bg-[#FBF8F5] text-[#132E21] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 border-b border-[#EAE4DC] pb-10">
          <div className="max-w-xl space-y-3">
            <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-widest">
              Formulasi Pilihan
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#132E21] tracking-tight leading-tight">
              Formulasi yang Sering Dicari
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Racikan bahan aktif favorit untuk masalah jerawat, skin barrier rusak, dan kulit kusam.
          </p>
        </div>

        {/* Frameless Editorial Product Grid (No Card Background) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {products.map((product, idx) => (
            <div
              key={idx}
              onClick={() => onOpenChat(product.query)}
              className="group flex flex-col space-y-6 cursor-pointer"
            >
              {/* Product Image - Frameless Rounded Block */}
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[#F2EBE1] border border-[#E8DFC0]/40">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-wider block">
                    {product.category}
                  </span>
                  <h3 className="text-2xl font-bold text-[#132E21] group-hover:text-[#E07A5F] transition-colors leading-snug">
                    {product.name}
                  </h3>
                </div>

                <p className="text-sm text-[#4A5D53] leading-relaxed">
                  {product.description}
                </p>

                {/* Inline Ingredients */}
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#132E21]">
                  {product.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="bg-white border border-[#E2D9CC] px-3 py-1 rounded-full text-[11px] text-[#285A41]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {/* Action Trigger Link */}
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-[#132E21] group-hover:text-[#E07A5F]">
                  <span className="border-b-2 border-[#132E21]/20 group-hover:border-[#E07A5F] pb-0.5 transition-colors">
                    Tanya Dosis Formulasi Ini
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
