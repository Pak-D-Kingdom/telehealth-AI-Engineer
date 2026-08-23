import Image from "next/image";
import {
  AlertCircle,
  ArrowUpRight,
  MessageCircle,
  ShoppingCart,
  Stethoscope,
} from "lucide-react";
import type {
  RelatedCareDoctor,
  RelatedCareOptions,
  RelatedCareProduct,
} from "@/lib/api-types";
import { formatRupiah } from "@/lib/formatters";

interface RelatedCareCardsProps {
  options: RelatedCareOptions;
  onSelect?: (prompt: string) => void;
  onViewProduct?: (product: RelatedCareProduct) => void;
  onBuyProduct?: (product: RelatedCareProduct) => void;
  onViewDoctor?: (doctor: RelatedCareDoctor) => void;
  disabled?: boolean;
  showSuggestions?: boolean;
}

export default function RelatedCareCards({
  options,
  onSelect,
  onViewProduct,
  onBuyProduct,
  onViewDoctor,
  disabled = false,
  showSuggestions = false,
}: RelatedCareCardsProps) {
  const suggestions = options.suggestedReplies ?? [];

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
            <article key={product.id} className="flex gap-3 rounded-xl border border-[#E8E4DE] bg-white p-3 shadow-2xs">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3ECE5]">
                <Image
                  src={product.image || "/images/glucocare_logo.svg"}
                  alt={product.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-extrabold leading-snug text-[#0D5C46]">{product.name}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E07A5F]">
                  {product.category}
                </p>
                <p className="mt-1 text-xs font-bold text-[#3A4F46]">{formatRupiah(product.price)}</p>
                <p className={`mt-1 text-[10px] leading-snug ${product.requiresPrescription ? "font-semibold text-red-600" : "text-[#6B7C72]"}`}>
                  {product.guidance}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {onViewProduct && (
                    <ActionButton
                      label="Lihat produk"
                      icon={<ArrowUpRight className="h-3 w-3" />}
                      onClick={() => onViewProduct(product)}
                      disabled={disabled}
                    />
                  )}
                  {!product.requiresPrescription && onBuyProduct && (
                    <ActionButton
                      label="Beli produk"
                      icon={<ShoppingCart className="h-3 w-3" />}
                      onClick={() => onBuyProduct(product)}
                      disabled={disabled}
                      primary
                    />
                  )}
                  {onSelect && (
                    <ActionButton
                      label={product.requiresPrescription ? "Konsultasi resep" : "Tanya keamanan"}
                      icon={<MessageCircle className="h-3 w-3" />}
                      onClick={() => onSelect(
                        product.requiresPrescription
                          ? `Saya ingin konsultasi dokter tentang keamanan dan resep ${product.name}.`
                          : `Saya ingin rekomendasi informasi keamanan umum untuk produk ${product.name} dan hal yang perlu ditanyakan kepada tenaga medis.`,
                      )}
                      disabled={disabled}
                      primary={product.requiresPrescription}
                    />
                  )}
                </div>
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
                  alt={doctor.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#0D5C46]">{doctor.name}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-[#4A5D53]">{doctor.specialty}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7C72]">
                  <Stethoscope className="h-3 w-3" /> {doctor.experience}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {onViewDoctor && (
                    <ActionButton
                      label="Lihat profil"
                      icon={<ArrowUpRight className="h-3 w-3" />}
                      onClick={() => onViewDoctor(doctor)}
                      disabled={disabled}
                    />
                  )}
                  {onSelect && (
                    <ActionButton
                      label="Mulai konsultasi"
                      icon={<MessageCircle className="h-3 w-3" />}
                      onClick={() => onSelect(`Saya ingin memulai konsultasi dengan ${doctor.name}.`)}
                      disabled={disabled}
                      primary
                    />
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showSuggestions && onSelect && suggestions.length > 0 && (
        <div className="rounded-xl bg-[#F3F8F5] p-3" role="group" aria-label="Pilihan jawaban cepat">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#4A5D53]">
            Agar pilihannya lebih sesuai
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(suggestion.message)}
                className="cursor-pointer rounded-full border border-[#0D5C46]/20 bg-white px-3 py-1.5 text-[10px] font-bold text-[#0D5C46] transition-colors hover:border-[#0D5C46] hover:bg-[#0D5C46] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D5C46] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D5C46] disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? "bg-[#0D5C46] text-white hover:bg-[#0A4A38]"
          : "border border-[#DDE7E1] bg-white text-[#0D5C46] hover:border-[#0D5C46]/40 hover:bg-[#F3F8F5]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
