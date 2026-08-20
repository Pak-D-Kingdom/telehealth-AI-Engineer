"use client";

import React, { useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { ArrowRight, Calendar, CheckCircle2, Filter } from "lucide-react";
import { apiFetcher, type ApiError } from "@/lib/api-client";
import type { ApiResponse, Doctor, DoctorCategory } from "@/lib/api-types";

interface DermatologistsProps {
  onOpenChat: (initialQuery?: string) => void;
}

export default function Dermatologists({ onOpenChat }: DermatologistsProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const {
    data: doctorResponse,
    error: doctorError,
    isLoading: doctorsLoading,
  } = useSWR<ApiResponse<Doctor[]>, ApiError>("/api/doctors?limit=100", apiFetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: categoryResponse,
    error: categoryError,
    isLoading: categoriesLoading,
  } = useSWR<ApiResponse<DoctorCategory[]>, ApiError>(
    "/api/doctor-categories",
    apiFetcher,
    { revalidateOnFocus: false },
  );

  const doctors = doctorResponse?.data ?? [];
  const categories = categoryResponse?.data ?? [];
  const isLoading = doctorsLoading || categoriesLoading;
  const error = doctorError ?? categoryError;
  const filteredDoctors =
    activeFilter === "all"
      ? doctors
      : doctors.filter((doctor) =>
          doctor.categories.some((category) => category.id === activeFilter),
        );

  return (
    <section id="dokter" className="py-24 bg-[#FAF8F5] text-[#132E21] border-t border-[#EAE4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-[#EAE4DC] pb-10">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-extrabold text-[#E07A5F] uppercase tracking-widest">
              Tim Dokter Spesialis
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0D5C46] tracking-tight leading-tight">
              Tim Dokter Spesialis Penyakit Dalam (Sp.PD)
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#4A5D53] max-w-md leading-relaxed">
            Pilih bidang konsultasi untuk menemukan profil dokter yang sesuai.
          </p>
        </div>

        {!isLoading && !error && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-[#0D5C46] uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-[#E07A5F]" />
              <span>Pilih Bidang Konsultasi Dokter:</span>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
              {[{ id: "all", name: "Semua Dokter Spesialis" }, ...categories].map((category) => {
                const isActive = activeFilter === category.id;
                const count =
                  category.id === "all"
                    ? doctors.length
                    : doctors.filter((doctor) =>
                        doctor.categories.some((item) => item.id === category.id),
                      ).length;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveFilter(category.id)}
                    className={`px-5 py-3 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-300 border cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? "bg-[#0D5C46] text-white border-[#0D5C46] shadow-md scale-105"
                        : "bg-white text-[#4A5D53] border-[#E8E4DE] hover:border-[#0D5C46]/40 hover:text-[#0D5C46]"
                    }`}
                  >
                    <span>{category.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-[#E07A5F] text-white" : "bg-[#FAF8F5] text-[#0D5C46]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" aria-label="Memuat dokter">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="rounded-3xl bg-white p-5 space-y-4 animate-pulse">
                <div className="aspect-[4/5] rounded-2xl bg-[#EDE7DF]" />
                <div className="h-5 rounded bg-[#EDE7DF]" />
                <div className="h-4 w-2/3 rounded bg-[#EDE7DF]" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {!isLoading && !error && filteredDoctors.length === 0 && (
          <div className="rounded-2xl border border-[#EAE4DC] bg-white px-5 py-10 text-center text-sm text-[#6B7C72]">
            Belum ada dokter aktif untuk kategori ini.
          </div>
        )}

        {!isLoading && !error && filteredDoctors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 transition-all duration-300">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="group flex flex-col justify-between space-y-6 bg-white p-5 rounded-3xl border border-[#E8E4DE] shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#F3ECE5]">
                    <Image
                      src={doctor.image || "/images/glucocare_logo.svg"}
                      alt={doctor.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <h4 className="text-sm font-extrabold text-[#E07A5F] leading-snug">
                      {doctor.specialty}
                    </h4>
                    <h3 className="text-lg font-bold text-[#0D5C46] tracking-tight leading-snug">
                      {doctor.name}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[11px] font-medium text-[#4A5D53] pt-1 border-t border-[#F0ECE6]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0D5C46]" />
                      <span>{doctor.experience}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0D5C46]" />
                      <span>{doctor.registrationNumber || "Nomor registrasi belum tersedia"}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenChat(`Saya ingin berkonsultasi dengan ${doctor.name}.`)
                  }
                  className="w-full flex items-center justify-between bg-[#0D5C46] hover:bg-[#1A8B6B] text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 group/btn cursor-pointer"
                >
                  <span>Konsultasi Dokter Ini</span>
                  <ArrowRight className="w-4 h-4 text-[#E07A5F] group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
