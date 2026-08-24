"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Copy,
  MapPin,
  RefreshCw,
  Stethoscope,
  Video,
} from "lucide-react";
import { ApiError, apiFetcher, apiRequest } from "@/lib/api-client";
import type {
  ApiResponse,
  ConsultationBooking,
  DoctorScheduleResponse,
  RelatedCareDoctor,
} from "@/lib/api-types";
import { consultationModeLabel, formatConsultationDate, whatsappLink } from "@/lib/consultation";
import { formatRupiah } from "@/lib/formatters";

interface DoctorBookingPanelProps {
  doctor: RelatedCareDoctor;
  onClose: () => void;
}

export default function DoctorBookingPanel({ doctor, onClose }: DoctorBookingPanelProps) {
  const [selectedSlotId, setSelectedSlotId] = useState(doctor.nextAvailability?.slotId ?? "");
  const [patientName, setPatientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [complaint, setComplaint] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<ConsultationBooking | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    data: scheduleResponse,
    error: scheduleError,
    isLoading: loading,
    mutate: refreshSlots,
  } = useSWR<ApiResponse<DoctorScheduleResponse>, ApiError>(
    `/api/doctors/${doctor.slug}/schedule?limit=20`,
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const slots = scheduleResponse?.data.slots ?? [];
  const effectiveSlotId = slots.some((slot) => slot.id === selectedSlotId)
    ? selectedSlotId
    : slots[0]?.id ?? "";

  const selectedSlot = slots.find((slot) => slot.id === effectiveSlotId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Pilih jadwal konsultasi terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiRequest<ApiResponse<ConsultationBooking>>("/api/chat/bookings", {
        method: "POST",
        body: {
          slotId: selectedSlot.id,
          patientName: patientName.trim(),
          whatsapp: whatsapp.trim(),
          complaint: complaint.trim() || undefined,
          consentToBooking: consent,
        },
      });
      setBooking(response.data);
    } catch (requestError) {
      setError(readableError(requestError));
      if (requestError instanceof ApiError && requestError.code === "SCHEDULE_SLOT_UNAVAILABLE") {
        await refreshSlots();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (booking) {
    const confirmationText = bookingSummary(booking);
    const supportNumber = process.env.NEXT_PUBLIC_GLUCOCARE_WHATSAPP?.trim();
    const supportLink = supportNumber ? whatsappLink(supportNumber, confirmationText) : null;

    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-[#F8FBF9]" aria-label="Booking konsultasi berhasil">
        <PanelHeader title="Booking berhasil" onClose={onClose} />
        <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-8 text-center sm:px-8">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-extrabold text-[#0D5C46]">Jadwal Anda sudah dicatat</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5B6B63]">
            Tim GlucoCare akan memeriksa booking dan menghubungi nomor WhatsApp yang Anda masukkan.
          </p>
          <div className="mt-6 w-full max-w-md space-y-3 rounded-2xl border border-[#DDEBE4] bg-white p-5 text-left shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7C72]">Kode booking</p>
            <p className="text-2xl font-extrabold tracking-wide text-[#0D5C46]">{booking.bookingCode}</p>
            <dl className="space-y-2 border-t border-[#EAE4DC] pt-4 text-sm">
              <BookingDetail label="Dokter" value={booking.doctor.name} />
              <BookingDetail label="Waktu" value={formatConsultationDate(booking.slot.startsAt)} />
              <BookingDetail label="Layanan" value={consultationModeLabel(booking.slot.mode)} />
              {booking.slot.clinic && (
                <BookingDetail label="Lokasi" value={`${booking.slot.clinic.name}, ${booking.slot.clinic.city}`} />
              )}
              <BookingDetail label="Status" value="Menunggu konfirmasi" />
            </dl>
          </div>
          <div className="mt-5 flex w-full max-w-md flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(confirmationText);
                setCopied(true);
              }}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#C9DAD1] bg-white px-4 py-3 text-sm font-bold text-[#0D5C46] hover:bg-[#F3F8F5]"
            >
              <Copy className="h-4 w-4" /> {copied ? "Detail tersalin" : "Salin detail"}
            </button>
            {supportLink && (
              <a
                href={supportLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#0D5C46] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A4A38]"
              >
                Hubungi GlucoCare
              </a>
            )}
          </div>
          <button type="button" onClick={onClose} className="mt-4 cursor-pointer text-sm font-bold text-[#0D5C46] hover:underline">
            Kembali ke percakapan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white" aria-label={`Pilih jadwal ${doctor.name}`}>
      <PanelHeader title="Buat janji konsultasi" onClose={onClose} />
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        <div className="rounded-2xl bg-[#F3F8F5] p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#0D5C46]"><Stethoscope className="h-4 w-4" /> {doctor.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#5B6B63]">{doctor.specialty}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <fieldset>
            <legend className="text-sm font-extrabold text-[#24362E]">1. Pilih jadwal</legend>
            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#6B7C72]"><RefreshCw className="h-4 w-4 animate-spin" /> Memuat jadwal...</p>
            ) : slots.length === 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Belum ada jadwal yang tersedia. Silakan pilih dokter lain atau coba lagi nanti.
              </div>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {slots.map((slot) => (
                  <label key={slot.id} className={`cursor-pointer rounded-xl border p-3 transition-colors ${effectiveSlotId === slot.id ? "border-[#0D5C46] bg-[#EDF7F2] ring-1 ring-[#0D5C46]" : "border-[#E2E8E4] hover:border-[#91B5A5]"}`}>
                    <span className="flex items-start gap-2">
                      <input type="radio" name="schedule" value={slot.id} checked={effectiveSlotId === slot.id} onChange={() => setSelectedSlotId(slot.id)} className="mt-1 accent-[#0D5C46]" />
                      <span className="min-w-0 text-xs">
                        <span className="block font-extrabold text-[#24362E]">{formatConsultationDate(slot.startsAt)}</span>
                        <span className="mt-1 flex items-center gap-1 text-[#5B6B63]">
                          {slot.mode === "ONLINE" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {consultationModeLabel(slot.mode)}
                        </span>
                        {slot.clinic && <span className="mt-1 block text-[#6B7C72]">{slot.clinic.name}, {slot.clinic.city}</span>}
                        <span className="mt-1 block font-bold text-[#0D5C46]">{formatRupiah(slot.price)}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-extrabold text-[#24362E]">2. Data untuk konfirmasi</legend>
            <label className="block text-xs font-bold text-[#4A5D53]">Nama pasien
              <input required minLength={2} maxLength={160} value={patientName} onChange={(event) => setPatientName(event.target.value)} autoComplete="name" className="form-input mt-1.5" placeholder="Nama lengkap" />
            </label>
            <label className="block text-xs font-bold text-[#4A5D53]">Nomor WhatsApp aktif
              <input required minLength={9} maxLength={40} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} inputMode="tel" autoComplete="tel" className="form-input mt-1.5" placeholder="Contoh: 0812 3456 7890" />
            </label>
            <label className="block text-xs font-bold text-[#4A5D53]">Keluhan singkat <span className="font-normal text-[#7A8981]">(opsional)</span>
              <textarea maxLength={1000} rows={3} value={complaint} onChange={(event) => setComplaint(event.target.value)} className="form-input mt-1.5 resize-none" placeholder="Ceritakan kebutuhan konsultasi Anda" />
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-[#FFF9F3] p-3 text-[11px] leading-relaxed text-[#4A5550]">
              <input required type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0D5C46]" />
              Saya setuju data kontak dan keluhan digunakan GlucoCare untuk membuat dan menindaklanjuti booking ini.
            </label>
          </fieldset>

          {(error || scheduleError) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error ?? scheduleError?.message}</p>}

          <button type="submit" disabled={submitting || loading || !selectedSlot || !consent} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#0A4A38] disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            {submitting ? "Membuat booking..." : "Konfirmasi booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0D5C46] px-4 py-3 text-white">
      <button type="button" onClick={onClose} aria-label="Kembali ke percakapan" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div>
        <p className="text-sm font-extrabold">{title}</p>
        <p className="text-[10px] text-white/70">Jadwal menggunakan zona waktu WIB</p>
      </div>
    </header>
  );
}

function BookingDetail({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[5rem_1fr] gap-2"><dt className="text-[#7A8981]">{label}</dt><dd className="font-semibold text-[#24362E]">{value}</dd></div>;
}

function bookingSummary(booking: ConsultationBooking) {
  return [
    `Booking GlucoCare ${booking.bookingCode}`,
    `Dokter: ${booking.doctor.name}`,
    `Waktu: ${formatConsultationDate(booking.slot.startsAt)}`,
    `Layanan: ${consultationModeLabel(booking.slot.mode)}`,
    booking.slot.clinic ? `Lokasi: ${booking.slot.clinic.name}, ${booking.slot.clinic.city}` : null,
    "Status: Menunggu konfirmasi",
  ].filter(Boolean).join("\n");
}

function readableError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Booking belum berhasil dibuat. Periksa data Anda, lalu coba lagi.";
}
