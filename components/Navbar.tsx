"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";

interface NavbarProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function Navbar({ onOpenChat }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (targetId: string) => {
    setIsMobileMenuOpen(false);
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
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

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#B0C4B8]">
          <a
            href="#gejala"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("gejala");
            }}
            className="hover:text-white transition-colors"
          >
            Gejala Gula Darah
          </a>
          <a
            href="#alur"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("alur");
            }}
            className="hover:text-white transition-colors"
          >
            Alur Konsultasi
          </a>
          <a
            href="#obat"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("obat");
            }}
            className="hover:text-white transition-colors"
          >
            Obat & Alat Cek
          </a>
          <a
            href="#dokter"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("dokter");
            }}
            className="hover:text-white transition-colors"
          >
            Dokter Spesialis Sp.PD
          </a>
        </nav>

        {/* Right CTA Button & Hamburger Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenChat("Halo, saya ingin bertanya tentang masalah gula darah.");
            }}
            className="hidden sm:flex items-center gap-2 bg-[#E07A5F] hover:bg-[#C9664B] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Konsul Diabetes AI</span>
          </button>

          {/* Aesthetic Frameless Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-[#E07A5F] focus:outline-none transition-colors cursor-pointer group"
            aria-label="Toggle Navigation Menu"
          >
            <div className="w-6 h-4 flex flex-col justify-between items-end relative">
              <span
                className={`h-[2px] bg-current rounded-full transition-all duration-300 origin-center ${
                  isMobileMenuOpen ? "w-6 translate-y-[7px] rotate-45" : "w-6 group-hover:w-5"
                }`}
              />
              <span
                className={`h-[2px] bg-current rounded-full transition-all duration-300 ${
                  isMobileMenuOpen ? "opacity-0 w-0" : "w-4 group-hover:w-6"
                }`}
              />
              <span
                className={`h-[2px] bg-current rounded-full transition-all duration-300 origin-center ${
                  isMobileMenuOpen ? "w-6 -translate-y-[7px] -rotate-45" : "w-6 group-hover:w-4"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0D5C46] border-b border-[#1A8B6B]/80 px-4 pt-2 pb-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-3 pt-2">
            <a
              href="#gejala"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("gejala");
              }}
              className="text-sm font-bold uppercase tracking-wider text-[#E2EBE6] hover:text-white py-2 border-b border-white/10"
            >
              Gejala Gula Darah
            </a>
            <a
              href="#alur"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("alur");
              }}
              className="text-sm font-bold uppercase tracking-wider text-[#E2EBE6] hover:text-white py-2 border-b border-white/10"
            >
              Alur Konsultasi
            </a>
            <a
              href="#obat"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("obat");
              }}
              className="text-sm font-bold uppercase tracking-wider text-[#E2EBE6] hover:text-white py-2 border-b border-white/10"
            >
              Obat & Alat Cek
            </a>
            <a
              href="#dokter"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("dokter");
              }}
              className="text-sm font-bold uppercase tracking-wider text-[#E2EBE6] hover:text-white py-2 border-b border-white/10"
            >
              Dokter Spesialis Sp.PD
            </a>
          </nav>

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenChat("Halo, saya ingin bertanya tentang masalah gula darah.");
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#E07A5F] hover:bg-[#C9664B] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer mt-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Konsul Diabetes AI</span>
          </button>
        </div>
      )}
    </header>
  );
}
