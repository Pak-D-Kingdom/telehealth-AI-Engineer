"use client";

import React from "react";
import Image from "next/image";
import useSWR from "swr";
import { ArrowRight } from "lucide-react";
import { apiFetcher, type ApiError } from "@/lib/api-client";
import type { ApiResponse, Product } from "@/lib/api-types";
import { formatRupiah } from "@/lib/formatters";

interface ProductsShowcaseProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function ProductsShowcase({ onOpenChat }: ProductsShowcaseProps) {
  const { data, error, isLoading } = useSWR<ApiResponse<Product[]>, ApiError>(
    "/api/products?limit=100",
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const products = data?.data ?? [];

  return (
    <section id="obat" className="py-24 bg-[#FBF8F5] text-[#132E21] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Katalog produk yang dikelola langsung melalui dashboard GlucoCare.
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16" aria-label="Memuat produk">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="space-y-5 animate-pulse">
                <div className="aspect-[4/3] rounded-3xl bg-[#EDE7DF]" />
                <div className="h-6 w-2/3 rounded bg-[#EDE7DF]" />
                <div className="h-4 w-full rounded bg-[#EDE7DF]" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-[#EAE4DC] bg-white px-5 py-10 text-center text-sm text-[#6B7C72]">
            Belum ada produk aktif yang tersedia.
          </div>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
            {products.map((product) => (
              <button
                type="button"
                key={product.id}
                id={`product-${product.slug}`}
                onClick={() =>
                  onOpenChat(`Saya ingin berkonsultasi mengenai ${product.name}.`)
                }
                className="group flex scroll-mt-24 flex-col space-y-5 cursor-pointer text-left"
              >
                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[#F2EBE1] border border-[#E8DFC0]/40">
                  <Image
                    src={product.image || "/images/glucocare_logo.svg"}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4 bg-[#0D5C46] text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-sm">
                    {formatRupiah(product.price)}
                  </div>
                </div>

                <div className="space-y-2 pl-1">
                  <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-wider">
                    {product.category}
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#0D5C46] group-hover:text-[#E07A5F] transition-colors leading-snug">
                    {product.name}
                  </h3>
                  {product.specs && (
                    <p className="text-xs font-semibold text-[#6B7C72]">{product.specs}</p>
                  )}
                  {product.description && (
                    <p className="text-sm text-[#4A5D53] leading-relaxed pt-1">
                      {product.description}
                    </p>
                  )}
                  <div className="pt-3 flex items-center gap-2 text-xs font-bold text-[#0D5C46] group-hover:text-[#E07A5F]">
                    <span className="border-b-2 border-[#0D5C46]/20 group-hover:border-[#E07A5F] pb-0.5 transition-colors">
                      Tanya Konsultasi / Pesan Produk Ini
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
