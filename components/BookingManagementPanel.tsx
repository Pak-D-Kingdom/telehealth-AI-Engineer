"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CalendarSearch,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api-client";
import type {
  ApiResponse,
  ConsultationBooking,
  DoctorScheduleResponse,
  DoctorScheduleSlot,
} from "@/lib/api-types";
import {
  bookingEventLabel,
  bookingStatusLabel,
  consultationModeLabel,
  formatConsultationDate,
  maskWhatsapp,
} from "@/lib/consultation";
import { formatRupiah } from "@/lib/formatters";

interface BookingManagementPanelProps {
  onClose: () => void;
}

export default function BookingManagementPanel({
  onClose,
}: BookingManagementPanelProps) {
  const [bookingCode, setBookingCode] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [booking, setBooking] = useState<ConsultationBooking | null>(null);
  const [slots, setSlots] = useState<DoctorScheduleSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking("lookup");
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<ApiResponse<ConsultationBooking>>(
        "/api/chat/bookings/lookup",
        { method: "POST", body: { bookingCode, whatsapp } },
      );
      setBooking(response.data);
      setBookingCode(response.data.bookingCode);
      setShowReschedule(false);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setWorking(null);
    }
  };

  const openReschedule = async () => {
    if (!booking) return;
    setWorking("slots");
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<ApiResponse<DoctorScheduleResponse>>(
        `/api/doctors/${booking.doctor.slug}/schedule?limit=20`,
      );
      const available = response.data.slots.filter(
        (slot) => slot.id !== booking.slotId,
      );
      setSlots(available);
      setSelectedSlotId(available[0]?.id ?? "");
      setShowReschedule(true);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setWorking(null);
    }
  };

  const reschedule = async () => {
    if (!booking || !selectedSlotId) return;
    setWorking("reschedule");
    setError(null);
    try {
      const response = await apiRequest<ApiResponse<ConsultationBooking>>(
        `/api/chat/bookings/${booking.bookingCode}/reschedule`,
        {
          method: "PATCH",
          body: { whatsapp, slotId: selectedSlotId, consentToBooking: true },
        },
      );
      setBooking(response.data);
      setShowReschedule(false);
      setNotice(
        "Jadwal berhasil diubah dan kembali menunggu konfirmasi tim GlucoCare.",
      );
    } catch (requestError) {
      setError(readableError(requestError));
      if (
        requestError instanceof ApiError &&
        requestError.code === "SCHEDULE_SLOT_UNAVAILABLE"
      ) {
        await openReschedule();
      }
    } finally {
      setWorking(null);
    }
  };

  const cancel = async () => {
    if (!booking) return;
    setWorking("cancel");
    setError(null);
    try {
      const response = await apiRequest<ApiResponse<ConsultationBooking>>(
        `/api/chat/bookings/${booking.bookingCode}/cancel`,
        { method: "PATCH", body: { whatsapp } },
      );
      setBooking(response.data);
      setConfirmingCancel(false);
      setShowReschedule(false);
      setNotice(
        "Booking berhasil dibatalkan. Slot konsultasi telah dibuka kembali.",
      );
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setWorking(null);
    }
  };

  const requestDeletion = async () => {
    if (!booking) return;
    setWorking("deletion");
    setError(null);
    try {
      const response = await apiRequest<ApiResponse<ConsultationBooking>>(
        `/api/chat/bookings/${booking.bookingCode}/deletion-request`,
        { method: "POST", body: { whatsapp } },
      );
      setBooking(response.data);
      setConfirmingDeletion(false);
      setNotice(
        "Permintaan penghapusan data sudah dicatat. Data akan dianonimkan setelah layanan selesai atau dibatalkan.",
      );
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setWorking(null);
    }
  };

  const resetLookup = () => {
    setBooking(null);
    setBookingCode("");
    setWhatsapp("");
    setSlots([]);
    setShowReschedule(false);
    setError(null);
    setNotice(null);
  };

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-[#F8FBF9]"
      aria-label="Kelola booking konsultasi"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0D5C46] px-4 py-3 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Kembali ke percakapan"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-extrabold">Kelola booking</p>
          <p className="text-[10px] text-white/70">
            Cek status, ubah jadwal, atau batalkan
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        {!booking ? (
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl bg-[#EDF7F2] p-4 text-center">
              <CalendarSearch className="mx-auto h-9 w-9 text-[#0D5C46]" />
              <h2 className="mt-2 text-lg font-extrabold text-[#0D5C46]">
                Temukan booking Anda
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#5B6B63]">
                Gunakan kode booking dan nomor WhatsApp yang dipakai saat
                membuat janji.
              </p>
            </div>
            <form onSubmit={lookup} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-[#4A5D53]">
                Kode booking
                <input
                  required
                  maxLength={32}
                  value={bookingCode}
                  onChange={(event) =>
                    setBookingCode(event.target.value.toUpperCase())
                  }
                  className="form-input mt-1.5 uppercase"
                  placeholder="GC-20260824-ABC123"
                  autoComplete="off"
                />
              </label>
              <label className="block text-xs font-bold text-[#4A5D53]">
                Nomor WhatsApp
                <input
                  required
                  minLength={9}
                  maxLength={40}
                  inputMode="tel"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="form-input mt-1.5"
                  placeholder="Contoh: 0812 3456 7890"
                />
              </label>
              {error && <Alert text={error} />}
              <button
                type="submit"
                disabled={working === "lookup"}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#0A4A38] disabled:opacity-50"
              >
                {working === "lookup" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {working === "lookup" ? "Memeriksa booking..." : "Cek booking"}
              </button>
            </form>
            <p className="mt-4 rounded-xl bg-white px-3 py-2 text-[10px] leading-relaxed text-[#6B7C72]">
              Data hanya ditampilkan jika kode booking dan nomor WhatsApp cocok.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-xl space-y-4">
            <div className="rounded-2xl border border-[#DDEBE4] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#E07A5F]">
                    {booking.bookingCode}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#24362E]">
                    {booking.patientName}
                  </h2>
                  <p className="text-xs text-[#7A8981]">
                    WhatsApp {maskWhatsapp(booking.whatsapp)}
                  </p>
                </div>
                <span className="rounded-full bg-[#EDF7F2] px-2.5 py-1 text-[10px] font-bold text-[#0D5C46]">
                  {bookingStatusLabel(booking.status)}
                </span>
              </div>
              <dl className="mt-4 space-y-2 border-t border-[#EAE4DC] pt-4 text-xs">
                <Detail label="Dokter" value={booking.doctor.name} />
                <Detail
                  label="Waktu"
                  value={formatConsultationDate(booking.slot.startsAt)}
                />
                <Detail
                  label="Layanan"
                  value={consultationModeLabel(booking.slot.mode)}
                />
                {booking.slot.clinic && (
                  <Detail
                    label="Lokasi"
                    value={`${booking.slot.clinic.name}, ${booking.slot.clinic.city}`}
                  />
                )}
                <Detail
                  label="Biaya"
                  value={formatRupiah(booking.slot.price)}
                />
              </dl>
            </div>

            {notice && (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                {notice}
              </p>
            )}
            {error && <Alert text={error} />}

            {(booking.status === "PENDING" || booking.status === "CONFIRMED") &&
              !showReschedule && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={working === "slots"}
                    onClick={() => void openReschedule()}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-3 text-xs font-bold text-white hover:bg-[#0A4A38] disabled:opacity-50"
                  >
                    <CalendarClock className="h-4 w-4" />
                    {working === "slots" ? "Memuat jadwal..." : "Ubah jadwal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Batalkan booking
                  </button>
                </div>
              )}

            {showReschedule && (
              <section
                className="rounded-2xl border border-[#DDEBE4] bg-white p-4"
                aria-label="Pilih jadwal pengganti"
              >
                <h3 className="text-sm font-extrabold text-[#24362E]">
                  Pilih jadwal pengganti
                </h3>
                {slots.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    Belum ada jadwal pengganti untuk dokter ini.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {slots.map((slot) => (
                      <SlotOption
                        key={slot.id}
                        slot={slot}
                        selected={slot.id === selectedSlotId}
                        onSelect={() => setSelectedSlotId(slot.id)}
                      />
                    ))}
                  </div>
                )}
                <label className="mt-3 flex items-start gap-2 rounded-xl bg-[#FFF9F3] p-3 text-[10px] leading-relaxed text-[#5B625E]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0D5C46]" />
                  Dengan melanjutkan, saya menyetujui perubahan jadwal dan
                  pemrosesan data booking.
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReschedule(false)}
                    className="flex-1 cursor-pointer rounded-xl border border-[#D9D4CC] px-3 py-2.5 text-xs font-bold text-[#4A5D53]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlotId || working === "reschedule"}
                    onClick={() => void reschedule()}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {working === "reschedule" && (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Simpan jadwal
                  </button>
                </div>
              </section>
            )}

            {confirmingCancel && (
              <ConfirmBox
                title="Batalkan booking ini?"
                description="Jadwal akan dilepas agar dapat dipilih pasien lain."
                actionLabel="Ya, batalkan"
                busy={working === "cancel"}
                onCancel={() => setConfirmingCancel(false)}
                onConfirm={() => void cancel()}
                danger
              />
            )}
            {confirmingDeletion && (
              <ConfirmBox
                title="Minta penghapusan data?"
                description="Data akan dianonimkan setelah konsultasi selesai atau booking dibatalkan."
                actionLabel="Kirim permintaan"
                busy={working === "deletion"}
                onCancel={() => setConfirmingDeletion(false)}
                onConfirm={() => void requestDeletion()}
                danger
              />
            )}

            <section
              className="rounded-2xl border border-[#E4DED6] bg-white p-4"
              aria-label="Riwayat booking"
            >
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#24362E]">
                <Clock3 className="h-4 w-4" />
                Riwayat booking
              </h3>
              <ol className="mt-3 space-y-3">
                {booking.events.map((event) => (
                  <li
                    key={event.id}
                    className="grid grid-cols-[0.6rem_1fr] gap-2 text-xs"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#0D5C46]" />
                    <span>
                      <strong className="block text-[#3A4F46]">
                        {bookingEventLabel(event.action)}
                      </strong>
                      <span className="text-[10px] text-[#7A8981]">
                        {formatShortDate(event.createdAt)} ·{" "}
                        {event.actorLabel ?? "GlucoCare"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {!booking.deletionRequestedAt ? (
              <button
                type="button"
                onClick={() => setConfirmingDeletion(true)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-[#7A8981] hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Minta penghapusan data pribadi
              </button>
            ) : (
              <p className="text-center text-[10px] font-semibold text-[#7A8981]">
                Permintaan penghapusan data telah dicatat.
              </p>
            )}
            <button
              type="button"
              onClick={resetLookup}
              className="w-full cursor-pointer text-center text-xs font-bold text-[#0D5C46] hover:underline"
            >
              Cek kode booking lain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotOption({
  slot,
  selected,
  onSelect,
}: {
  slot: DoctorScheduleSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border p-3 text-xs ${selected ? "border-[#0D5C46] bg-[#EDF7F2] ring-1 ring-[#0D5C46]" : "border-[#E2E8E4]"}`}
    >
      <span className="flex gap-2">
        <input
          type="radio"
          name="replacement-slot"
          checked={selected}
          onChange={onSelect}
          className="mt-0.5 accent-[#0D5C46]"
        />
        <span>
          <strong className="block text-[#24362E]">
            {formatConsultationDate(slot.startsAt)}
          </strong>
          <span className="mt-1 flex items-center gap-1 text-[#5B6B63]">
            {slot.mode === "ONLINE" ? (
              <Video className="h-3 w-3" />
            ) : (
              <MapPin className="h-3 w-3" />
            )}
            {consultationModeLabel(slot.mode)}
          </span>
          <span className="mt-1 block font-bold text-[#0D5C46]">
            {formatRupiah(slot.price)}
          </span>
        </span>
      </span>
    </label>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      <dt className="text-[#7A8981]">{label}</dt>
      <dd className="font-semibold text-[#24362E]">{value}</dd>
    </div>
  );
}
function Alert({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
    >
      {text}
    </p>
  );
}
function ConfirmBox({
  title,
  description,
  actionLabel,
  busy,
  onCancel,
  onConfirm,
  danger,
}: {
  title: string;
  description: string;
  actionLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <h3 className="text-sm font-extrabold text-red-800">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-red-700">{description}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#4A5D53]"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${danger ? "bg-red-600" : "bg-[#0D5C46]"}`}
        >
          {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
function formatShortDate(value: string) {
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value)) + " WIB"
  );
}
function readableError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Booking belum dapat diproses. Periksa data Anda, lalu coba lagi.";
}
