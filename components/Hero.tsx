"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";

interface HeroProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function Hero({ onOpenChat }: HeroProps) {
  const categoryCards = [
    {
      title: "Jerawat & Acne",
      image: "/images/card_acne.png",
      query: "Kulit gue lagi jerawatan dan meradang, rekomendasi skincare apa yang cocok?"
    },
    {
      title: "Flek Hitam & Dark Spot",
      image: "/images/card_darkspot.png",
      query: "Gimana cara menyamarkan flek hitam dan bekas jerawat di wajah secara cepat?"
    },
    {
      title: "Breakout & Barrier",
      image: "/images/card_barrier.png",
      query: "Muka gue lagi breakout parah dan perih, gimana cara benerin skin barrier?"
    },
    {
      title: "Kulit Kusam & Sebum",
      image: "/images/card_kusam.png",
      query: "Kulit muka gue kusam dan gampang berminyak, butuh saran produk yang pas."
    }
  ];

  return (
    <section className="relative bg-[#132E21] text-white pt-28 pb-24 lg:pt-36 lg:pb-36 overflow-hidden">
      {/* Background Dot Pattern from Magic UI (Static Subtle Texture) */}
      <DotPattern
        width={24}
        height={24}
        cx={2}
        cy={2}
        cr={1.8}
        glow={false}
        className="[mask-image:radial-gradient(800px_circle_at_center,white,transparent)] opacity-35 text-[#81C7A2]"
      />

      {/* Background Giant Text Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-10">
        <span className="text-[18vw] font-black tracking-tighter text-white whitespace-nowrap">
          MYSKIN
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Centered Header Content */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#A3D9C0]">
            Dipakai <span className="font-bold text-white">50,000+</span> Gen-Z Indonesia
          </p>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15]">
            Perawatan Kulit,{" "}
            <span className="text-[#81C7A2] font-semibold italic">dirancang ulang</span>{" "}
            khusus buat lo.
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-[#C2D6CB] max-w-2xl mx-auto font-normal leading-relaxed">
            Curhatin masalah jerawat, dark spot, atau breakout ke DermAssistant.
            Dapet racikan formulasi yang pas buat kondisi kulit lo tanpa perlu antre di klinik.
          </p>
        </div>

        {/* Floating 4 Categories Cards Overlay */}
        <div className="mt-16 lg:mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryCards.map((card, idx) => (
              <div
                key={idx}
                onClick={() => onOpenChat(card.query)}
                className="group relative bg-white text-[#1A1A1A] rounded-3xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-2xl border border-white/20"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF8F5]">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Card Title & Arrow Footer */}
                <div className="px-3 pt-4 pb-2 flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base text-[#132E21] group-hover:text-[#285A41] transition-colors">
                    {card.title}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#FAF8F5] group-hover:bg-[#132E21] text-[#132E21] group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
