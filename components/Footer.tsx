"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#083C2E] text-white pt-16 pb-12 border-t border-[#0D5C46]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative w-36 h-10">
              <Image
                src="/images/logo_horizontal.png"
                alt="GlucoCare Logo"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-sm text-[#B0C4B8] leading-relaxed max-w-sm">
              Platform edukasi diabetes dengan asisten virtual untuk informasi umum, pencatatan keluhan, tanda darurat, dan persiapan tindak lanjut oleh tim GlucoCare.
            </p>
          </div>

          {/* Nav Col 1 */}
          <div>
            <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">
              Edukasi Diabetes
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B0C4B8]">
              <li><a href="#gejala" className="hover:text-white transition-colors">Gejala Gula Darah Tinggi</a></li>
              <li><a href="#gejala" className="hover:text-white transition-colors">Memahami Hasil HbA1c</a></li>
              <li><a href="#gejala" className="hover:text-white transition-colors">Perawatan Luka Diabetes (Ulkus)</a></li>
              <li><a href="#gejala" className="hover:text-white transition-colors">Panduan Makanan Berindeks Glikemik Rendah</a></li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div>
            <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">
              Batas Layanan
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B0C4B8]">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E07A5F]" />
                <span>Informasi umum, bukan diagnosis</span>
              </li>
              <li>Data digunakan setelah Anda setuju</li>
              <li>Arahan 119/IGD untuk tanda darurat</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8BA496]">
          <p>© {new Date().getFullYear()} GlucoCare. Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            Layanan Spesialis Diabetes & Manajemen Gula Darah
          </p>
        </div>
      </div>
    </footer>
  );
}
