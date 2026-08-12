"use client";

import React from "react";
import Link from "next/link";
import { useDataStore } from "@/lib/data-store";
import { formatRupiah } from "@/lib/formatters";
import { Package, Stethoscope, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const { products, doctors, isLoading, error } = useDataStore();

  const stats = [
    {
      label: "Total Produk & Alat",
      value: products.length,
      icon: Package,
      href: "/admin/produk",
      color: "bg-[#E07A5F]/10 text-[#E07A5F]",
    },
    {
      label: "Total Dokter Spesialis",
      value: doctors.length,
      icon: Stethoscope,
      href: "/admin/dokter",
      color: "bg-[#0D5C46]/10 text-[#0D5C46]",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0D5C46] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[#6B7C72] mt-1">
          Ringkasan data GlucoCare
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="group bg-white rounded-2xl p-6 border border-[#EAE4DC] hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#1A2421]">
                    {isLoading ? "…" : stat.value}
                  </p>
                  <p className="text-xs font-semibold text-[#6B7C72] mt-0.5">{stat.label}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#B0ADA8] group-hover:text-[#0D5C46] group-hover:translate-x-1 transition-all mt-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-white rounded-2xl border border-[#EAE4DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE4DC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0D5C46]">Produk Terbaru</h2>
            <Link href="/admin/produk" className="text-xs font-semibold text-[#E07A5F] hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-[#F2ECE4]">
            {products.slice(0, 3).map((product) => (
              <div key={product.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A2421]">{product.name}</p>
                  <p className="text-xs text-[#6B7C72]">{product.category}</p>
                </div>
                <span className="text-xs font-bold text-[#0D5C46]">
                  {formatRupiah(product.price)}
                </span>
              </div>
            ))}
            {!isLoading && products.length === 0 && (
              <p className="px-6 py-6 text-sm text-[#6B7C72]">Belum ada produk.</p>
            )}
          </div>
        </div>

        {/* Recent Doctors */}
        <div className="bg-white rounded-2xl border border-[#EAE4DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE4DC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0D5C46]">Dokter Spesialis</h2>
            <Link href="/admin/dokter" className="text-xs font-semibold text-[#E07A5F] hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-[#F2ECE4]">
            {doctors.slice(0, 3).map((doctor) => (
              <div key={doctor.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A2421]">{doctor.name}</p>
                  <p className="text-xs text-[#6B7C72]">{doctor.specialty}</p>
                </div>
                <span className="text-xs font-semibold text-[#6B7C72]">{doctor.experience}</span>
              </div>
            ))}
            {!isLoading && doctors.length === 0 && (
              <p className="px-6 py-6 text-sm text-[#6B7C72]">Belum ada dokter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
