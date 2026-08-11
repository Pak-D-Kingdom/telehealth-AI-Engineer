"use client";

import React from "react";
import { Award, Truck, Stethoscope, CircleDollarSign } from "lucide-react";

export default function TrustBar() {
  const items = [
    {
      icon: Award,
      text: "Garansi Formulasi MySkin"
    },
    {
      icon: Truck,
      text: "Bebas Ongkir & Pengiriman Cepat"
    },
    {
      icon: Stethoscope,
      text: "Pendampingan Dokter & Derm Care"
    },
    {
      icon: CircleDollarSign,
      text: "Tanpa Biaya Tersembunyi"
    }
  ];

  return (
    <section className="bg-white border-y border-[#E8E4DE]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="py-7 px-6 sm:px-8 flex items-center gap-4 border-b sm:border-b-0 sm:border-r border-[#E8E4DE] last:border-r-0 last:border-b-0"
              >
                <div className="shrink-0 text-[#132E21]">
                  <Icon className="w-7 h-7 stroke-[1.5]" />
                </div>
                <span className="font-bold text-sm text-[#132E21] leading-snug">
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
