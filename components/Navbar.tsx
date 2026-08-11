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
          ? "bg-[#132E21]/95 backdrop-blur-md border-b border-[#1E4431]/80 shadow-lg"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Horizontal Brand Logo */}
        <div className="flex items-center">
          <div className="relative w-36 h-10 sm:w-40 sm:h-12">
            <Image
              src="/images/logo_horizontal.png"
              alt="MySkin Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#C2D6CB]">
          <a href="#masalah-kulit" className="hover:text-white transition-colors">
            Masalah Kulit
          </a>
          <a href="#cara-kerja" className="hover:text-white transition-colors">
            Cara Kerja
          </a>
          <a href="#produk" className="hover:text-white transition-colors">
            Rekomendasi Formulasi
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onOpenChat("Halo, gue mau konsultasi masalah kulit muka gue.")}
            className="flex items-center gap-2 bg-[#81C7A2] hover:bg-[#6EB892] text-[#132E21] px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Konsul Derm</span>
          </button>
        </div>
      </div>
    </header>
  );
}
