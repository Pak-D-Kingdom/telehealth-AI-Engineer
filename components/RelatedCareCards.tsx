import Image from "next/image";
import { AlertCircle, Stethoscope } from "lucide-react";
import type { RelatedCareOptions } from "@/lib/api-types";
import { formatRupiah } from "@/lib/formatters";

interface RelatedCareCardsProps {
  options: RelatedCareOptions;
  onSelect?: (prompt: string) => void;
}

export default function RelatedCareCards({ options, onSelect }: RelatedCareCardsProps) {
  return (
    <section className="mt-3 space-y-3 border-t border-[#EAE4DC] pt-3" aria-label={options.reason}>
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0D5C46]">
          {options.reason}
        </p>
        <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-relaxed text-amber-900">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{options.disclaimer}</span>
        </p>
      </div>

      {options.products.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7C72]">
            Produk terkait
          </p>
          {options.products.map((product) => (
            <article key={product.id} className="flex gap-3 rounded-xl border border-[#E8E4DE] bg-white p-2.5 shadow-2xs">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3ECE5]">
                <Image
                  src={product.image || "/images/glucocare_logo.svg"}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-[#0D5C46]">{product.name}</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#E07A5F]">
                  {product.category}
                </p>
                <p className="mt-1 text-[10px] font-bold text-[#3A4F46]">{formatRupiah(product.price)}</p>
                <p className={`mt-1 text-[9px] leading-snug ${product.requiresPrescription ? "font-semibold text-red-600" : "text-[#6B7C72]"}`}>
                  {product.guidance}
                </p>
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(`Jelaskan informasi umum tentang ${product.name}, termasuk keamanan dan apakah memerlukan resep.`)}
                    className="mt-2 cursor-pointer text-[10px] font-bold text-[#0D5C46] underline decoration-[#0D5C46]/30 underline-offset-2"
                  >
                    Tanya produk ini
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {options.doctors.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7C72]">
            Profil dokter terkait
          </p>
          {options.doctors.map((doctor) => (
            <article key={doctor.id} className="flex gap-3 rounded-xl border border-[#DDEBE4] bg-[#F6FBF8] p-2.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#E8F2EC]">
                <Image
                  src={doctor.image || "/images/glucocare_logo.svg"}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#0D5C46]">{doctor.name}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-[#4A5D53]">{doctor.specialty}</p>
                <p className="mt-1 flex items-center gap-1 text-[9px] text-[#6B7C72]">
                  <Stethoscope className="h-3 w-3" /> {doctor.experience}
                </p>
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(`Saya ingin mengetahui langkah untuk konsultasi dengan ${doctor.name}.`)}
                    className="mt-2 cursor-pointer text-[10px] font-bold text-[#0D5C46] underline decoration-[#0D5C46]/30 underline-offset-2"
                  >
                    Tanya tentang dokter ini
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
