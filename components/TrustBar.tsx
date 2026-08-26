"use client";

import React from "react";
import { PackageCheck, Stethoscope, Zap, CircleDollarSign } from "lucide-react";

export default function TrustBar() {
  const items = [
    {
      icon: PackageCheck,
      text: "OBAT & ALAT KIRIM KE RUMAH"
    },
    {
      icon: Stethoscope,
      text: "DOKTER SPESIALIS SP.PD RESMI"
    },
    {
      icon: Zap,
      text: "100% KONSULTASI ONLINE"
    },
    {
      icon: CircleDollarSign,
      text: "HARGA TRANSPARAN & TERJANGKAU"
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
                className="py-6 px-6 sm:px-8 flex items-center gap-3.5 border-b sm:border-b-0 sm:border-r border-[#E8E4DE] last:border-r-0 last:border-b-0"
              >
                <div className="shrink-0 text-[#0A3020]">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
                <span className="font-extrabold text-xs tracking-wider text-[#0A3020] uppercase">
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
