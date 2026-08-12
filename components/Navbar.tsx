"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";

interface NavbarProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function Navbar({ onOpenChat }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check initial position
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-[#0D5C46]/95 backdrop-blur-md border-b border-[#1A8B6B]/80 shadow-lg"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Horizontal Brand Logo */}
        <div className="flex items-center">
          <div className="relative w-36 h-10 sm:w-44 sm:h-12">
            <Image
              src="/images/logo_horizontal.png"
              alt="GlucoCare Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#B0C4B8]">
          <a href="#gejala" className="hover:text-white transition-colors">
            Gejala Gula Darah
          </a>
          <a href="#alur" className="hover:text-white transition-colors">
            Alur Konsultasi
          </a>
          <a href="#obat" className="hover:text-white transition-colors">
            Obat & Alat Cek
          </a>
          <a href="#dokter" className="hover:text-white transition-colors">
            Dokter Spesialis Sp.PD
          </a>
        </nav>

        {/* CTA Button */}
        <button
          onClick={() => onOpenChat("Halo, gue mau konsultasi masalah kadar gula darah.")}
          className="flex items-center gap-2 bg-[#E07A5F] hover:bg-[#C9664B] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Konsul Diabetes</span>
        </button>
      </div>
    </header>
  );
}
