"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0E2319] text-white pt-16 pb-12 border-t border-[#1B3C2C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative w-36 h-10">
              <Image
                src="/images/logo_horizontal.png"
                alt="MySkin Logo"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-sm text-[#B0C4B8] leading-relaxed max-w-sm">
              Platform telehealth & rekomendasi skincare berbasis AI khusus Gen-Z Indonesia. Mengatasi jerawat, dark spot, dan breakout secara presisi.
            </p>
          </div>

          {/* Nav Col 1 */}
          <div>
            <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">
              Layanan
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B0C4B8]">
              <li><a href="#masalah-kulit" className="hover:text-white transition-colors">Analisis Jerawat & Acne</a></li>
              <li><a href="#masalah-kulit" className="hover:text-white transition-colors">Perawatan Flek Hitam</a></li>
              <li><a href="#masalah-kulit" className="hover:text-white transition-colors">Pemulihan Skin Barrier</a></li>
              <li><a href="#masalah-kulit" className="hover:text-white transition-colors">Kontrol Minyak & Pori</a></li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div>
            <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">
              Keamanan & Privasi
            </h4>
            <ul className="space-y-2.5 text-xs text-[#B0C4B8]">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#81C7A2]" />
                <span>Privasi Data Terenkripsi</span>
              </li>
              <li>Sesuai Standar Telehealth</li>
              <li>Rekomendasi Berbasis Riset</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8BA496]">
          <p>© {new Date().getFullYear()} MySkin Telehealth. Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            Dibuat khusus untuk kesehatan kulit Gen-Z Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
