"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  Activity,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCw,
  UserRound,
  ShieldAlert,
  TrendingUp,
  Video,
  XCircle,
} from "lucide-react";
import { ApiError, apiFetcher, apiRequest } from "@/lib/api-client";
import type {
  ApiResponse,
  BookingStatus,
  Clinic,
  ConsultationBooking,
  ConsultationStats,
  ConsultationMode,
  DoctorScheduleSlot,
  ScheduleSlotStatus,
} from "@/lib/api-types";
import { useDataStore } from "@/lib/data-store";
import {
  bookingEventLabel,
  bookingStatusLabel,
  consultationModeLabel,
  formatConsultationDate,
  maskWhatsapp,
  whatsappLink,
} from "@/lib/consultation";
import { formatRupiah } from "@/lib/formatters";

type Tab = "bookings" | "schedules";

interface ScheduleForm {
  doctorId: string;
  mode: ConsultationMode;
  clinicId: string;
  startsAt: string;
  duration: number;
  price: string;
  notes: string;
}

const EMPTY_SCHEDULE: ScheduleForm = {
  doctorId: "",
  mode: "ONLINE",
  clinicId: "",
  startsAt: "",
  duration: 45,
  price: "250000",
  notes: "",
};

export default function AdminBookingPage() {
  const { doctors } = useDataStore();
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | "">("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] =
    useState<ScheduleForm>(EMPTY_SCHEDULE);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: bookingResponse,
    error: bookingError,
    isLoading: bookingsLoading,
    mutate: mutateBookings,
  } = useSWR<ApiResponse<ConsultationBooking[]>, ApiError>(
    "/api/admin/consultations/bookings?limit=100",
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const {
    data: scheduleResponse,
    error: scheduleError,
    isLoading: schedulesLoading,
    mutate: mutateSchedules,
  } = useSWR<ApiResponse<DoctorScheduleSlot[]>, ApiError>(
    "/api/admin/consultations/schedules?limit=100",
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const { data: clinicResponse } = useSWR<ApiResponse<Clinic[]>, ApiError>(
    "/api/admin/consultations/clinics",
    apiFetcher,
    { revalidateOnFocus: false },
  );
  const { data: statsResponse, mutate: mutateStats } = useSWR<
    ApiResponse<ConsultationStats>,
    ApiError
  >("/api/admin/consultations/stats", apiFetcher, { revalidateOnFocus: false });

  const allBookings = bookingResponse?.data ?? [];
  const bookings = bookingStatus
    ? allBookings.filter((booking) => booking.status === bookingStatus)
    : allBookings;
  const schedules = scheduleResponse?.data ?? [];
  const clinics = clinicResponse?.data ?? [];
  const requestError = bookingError?.message ?? scheduleError?.message;
  const stats = statsResponse?.data;

  const summary = {
    pending: allBookings.filter((booking) => booking.status === "PENDING")
      .length,
    confirmed: allBookings.filter((booking) => booking.status === "CONFIRMED")
      .length,
    slots: schedules.filter((slot) => slot.status === "AVAILABLE").length,
  };

  const updateBooking = async (
    booking: ConsultationBooking,
    status: BookingStatus,
  ) => {
    setActionId(booking.id);
    setError(null);
    try {
      await apiRequest<ApiResponse<ConsultationBooking>>(
        `/api/admin/consultations/bookings/${booking.id}`,
        {
          method: "PATCH",
          body: { status },
        },
      );
      await Promise.all([mutateBookings(), mutateSchedules(), mutateStats()]);
    } catch (requestErrorValue) {
      setError(readableError(requestErrorValue));
    } finally {
      setActionId(null);
    }
  };

  const updateSchedule = async (
    slot: DoctorScheduleSlot,
    status: Extract<ScheduleSlotStatus, "AVAILABLE" | "BLOCKED">,
  ) => {
    setActionId(slot.id);
    setError(null);
    try {
      await apiRequest<ApiResponse<DoctorScheduleSlot>>(
        `/api/admin/consultations/schedules/${slot.id}`,
        {
          method: "PATCH",
          body: { status },
        },
      );
      await Promise.all([mutateSchedules(), mutateStats()]);
    } catch (requestErrorValue) {
      setError(readableError(requestErrorValue));
    } finally {
      setActionId(null);
    }
  };

  const createSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    const startsAt = new Date(scheduleForm.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Pilih tanggal dan jam konsultasi.");
      return;
    }

    setActionId("new-schedule");
    setError(null);
    try {
      await apiRequest<ApiResponse<DoctorScheduleSlot>>(
        "/api/admin/consultations/schedules",
        {
          method: "POST",
          body: {
            doctorId: scheduleForm.doctorId,
            mode: scheduleForm.mode,
            clinicId:
              scheduleForm.mode === "OFFLINE" ? scheduleForm.clinicId : null,
            startsAt: startsAt.toISOString(),
            endsAt: new Date(
              startsAt.getTime() + scheduleForm.duration * 60_000,
            ).toISOString(),
            price: Number(scheduleForm.price),
            notes: scheduleForm.notes.trim() || undefined,
          },
        },
      );
      setShowScheduleForm(false);
      setScheduleForm(EMPTY_SCHEDULE);
      await Promise.all([mutateSchedules(), mutateStats()]);
    } catch (requestErrorValue) {
      setError(readableError(requestErrorValue));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0D5C46]">
            Jadwal & Booking
          </h1>
          <p className="mt-1 text-sm text-[#6B7C72]">
            Atur jadwal dokter dan tindak lanjuti permintaan konsultasi pasien.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowScheduleForm(true);
            setError(null);
          }}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A4A38]"
        >
          <Plus className="h-4 w-4" /> Tambah jadwal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Perlu dikonfirmasi"
          value={stats?.pending ?? summary.pending}
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <SummaryCard
          label="Sudah terkonfirmasi"
          value={stats?.confirmed ?? summary.confirmed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
        />
        <SummaryCard
          label="Slot terisi"
          value={`${stats?.slotFillRate ?? 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="blue"
        />
        <SummaryCard
          label="Permintaan hapus data"
          value={stats?.deletionRequests ?? 0}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="red"
        />
      </div>

      {stats && (
        <section
          className="grid gap-4 rounded-2xl border border-[#EAE4DC] bg-white p-4 lg:grid-cols-[1fr_1.4fr]"
          aria-label="Ringkasan operasional"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#5F7067]">
            <span className="rounded-lg bg-[#F3F8F5] px-3 py-2">
              <strong className="text-[#0D5C46]">{stats.totalBookings}</strong>{" "}
              total booking
            </span>
            <span className="rounded-lg bg-[#FFF5F2] px-3 py-2">
              <strong className="text-[#C65E45]">
                {stats.cancellationRate}%
              </strong>{" "}
              dibatalkan
            </span>
            <span className="rounded-lg bg-sky-50 px-3 py-2">
              <strong className="text-sky-700">{stats.availableSlots}</strong>{" "}
              slot tersedia
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7C72]">
              Dokter paling banyak dipilih
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.topDoctors.length > 0 ? (
                stats.topDoctors.map((doctor) => (
                  <span
                    key={doctor.doctorId}
                    className="rounded-full border border-[#DDEBE4] px-3 py-1.5 text-[10px] font-semibold text-[#3A4F46]"
                  >
                    {doctor.name} · {doctor.bookingCount}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#7A8981]">
                  Belum ada data booking.
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {(error || requestError) && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
        >
          {error ?? requestError}
        </p>
      )}

      <div
        className="flex w-fit rounded-xl bg-[#EDE9E3] p-1"
        role="tablist"
        aria-label="Kelola konsultasi"
      >
        <TabButton
          active={tab === "bookings"}
          onClick={() => setTab("bookings")}
        >
          Booking pasien
        </TabButton>
        <TabButton
          active={tab === "schedules"}
          onClick={() => setTab("schedules")}
        >
          Jadwal dokter
        </TabButton>
      </div>

      {tab === "bookings" ? (
        <section aria-label="Daftar booking pasien" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="booking-status"
              className="text-xs font-bold uppercase tracking-wide text-[#6B7C72]"
            >
              Tampilkan
            </label>
            <select
              id="booking-status"
              value={bookingStatus}
              onChange={(event) =>
                setBookingStatus(event.target.value as BookingStatus | "")
              }
              className="form-input w-auto py-2"
            >
              <option value="">Semua status</option>
              <option value="PENDING">Menunggu konfirmasi</option>
              <option value="CONFIRMED">Terkonfirmasi</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
          {bookingsLoading ? (
            <LoadingText text="Memuat booking..." />
          ) : bookings.length === 0 ? (
            <EmptyState text="Belum ada booking pada status ini." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  busy={actionId === booking.id}
                  onUpdate={updateBooking}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Daftar jadwal dokter">
          {schedulesLoading ? (
            <LoadingText text="Memuat jadwal..." />
          ) : schedules.length === 0 ? (
            <EmptyState text="Belum ada jadwal konsultasi mendatang." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {schedules.map((slot) => (
                <ScheduleCard
                  key={slot.id}
                  slot={slot}
                  busy={actionId === slot.id}
                  onUpdate={updateSchedule}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showScheduleForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAE4DC] px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#0D5C46]">
                  Tambah jadwal dokter
                </h2>
                <p className="text-xs text-[#6B7C72]">
                  Waktu pada formulir mengikuti zona perangkat Anda.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup formulir"
                onClick={() => setShowScheduleForm(false)}
                className="cursor-pointer rounded-lg p-2 text-[#6B7C72] hover:bg-[#F4F1ED]"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createSchedule} className="space-y-4 p-6">
              <Field label="Dokter">
                <select
                  required
                  value={scheduleForm.doctorId}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      doctorId: event.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">Pilih dokter</option>
                  {doctors
                    .filter((doctor) => doctor.isActive)
                    .map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenis konsultasi">
                  <select
                    value={scheduleForm.mode}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        mode: event.target.value as ConsultationMode,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Tatap muka</option>
                  </select>
                </Field>
                <Field label="Durasi">
                  <select
                    value={scheduleForm.duration}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        duration: Number(event.target.value),
                      }))
                    }
                    className="form-input"
                  >
                    <option value={30}>30 menit</option>
                    <option value={45}>45 menit</option>
                    <option value={60}>60 menit</option>
                  </select>
                </Field>
              </div>
              {scheduleForm.mode === "OFFLINE" && (
                <Field label="Lokasi praktik">
                  <select
                    required
                    value={scheduleForm.clinicId}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        clinicId: event.target.value,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="">Pilih lokasi</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} — {clinic.city}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal & jam">
                  <input
                    required
                    type="datetime-local"
                    value={scheduleForm.startsAt}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </Field>
                <Field label="Biaya konsultasi">
                  <input
                    required
                    type="number"
                    min={0}
                    step={5000}
                    value={scheduleForm.price}
                    onChange={(event) =>
                      setScheduleForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </Field>
              </div>
              <Field label="Catatan (opsional)">
                <input
                  maxLength={300}
                  value={scheduleForm.notes}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="Contoh: Kontrol pasien lama"
                />
              </Field>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                >
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-[#D9D4CC] py-2.5 text-sm font-bold text-[#4A5D53]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionId === "new-schedule"}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D5C46] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {actionId === "new-schedule" && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}{" "}
                  Simpan jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  busy,
  onUpdate,
}: {
  booking: ConsultationBooking;
  busy: boolean;
  onUpdate: (booking: ConsultationBooking, status: BookingStatus) => void;
}) {
  const message =
    booking.status === "CONFIRMED"
      ? `Halo ${booking.patientName}, booking GlucoCare ${booking.bookingCode} dengan ${booking.doctor.name} telah dikonfirmasi untuk ${formatConsultationDate(booking.slot.startsAt)}.`
      : `Halo ${booking.patientName}, kami dari GlucoCare mengenai booking ${booking.bookingCode} dengan ${booking.doctor.name} pada ${formatConsultationDate(booking.slot.startsAt)}.`;
  const contactLink = whatsappLink(booking.whatsapp, message);
  const summary = booking.preConsultationSummary;
  return (
    <article className="rounded-2xl border border-[#E4DED6] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E07A5F]">
            {booking.bookingCode}
          </p>
          <h2 className="mt-1 font-extrabold text-[#24362E]">
            {booking.patientName}
          </h2>
          <p className="text-xs text-[#6B7C72]">
            WhatsApp {maskWhatsapp(booking.whatsapp)}
          </p>
          {booking.deletionRequestedAt && (
            <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
              Penghapusan data diminta
            </span>
          )}
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <div className="mt-4 space-y-2 rounded-xl bg-[#F7F9F8] p-3 text-xs text-[#4A5D53]">
        <p className="flex gap-2">
          <UserRound className="h-4 w-4 shrink-0" />
          <span>
            <strong>{booking.doctor.name}</strong>
            <br />
            {booking.doctor.specialty}
          </span>
        </p>
        <p className="flex gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          {formatConsultationDate(booking.slot.startsAt)}
        </p>
        <p className="flex gap-2">
          {booking.slot.mode === "ONLINE" ? (
            <Video className="h-4 w-4 shrink-0" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0" />
          )}
          {consultationModeLabel(booking.slot.mode)}
          {booking.slot.clinic ? ` — ${booking.slot.clinic.name}` : ""}
        </p>
        {booking.complaint && (
          <p className="border-t border-[#E1E7E3] pt-2">
            <strong>Keluhan:</strong> {booking.complaint}
          </p>
        )}
      </div>
      {summary && (
        <section
          className={`mt-3 rounded-xl border p-3 text-xs ${summary.emergencyFlag ? "border-red-200 bg-red-50" : "border-[#DDEBE4] bg-[#F6FBF8]"}`}
          aria-label="Ringkasan pra-konsultasi"
        >
          <p className="flex items-center gap-1.5 font-extrabold text-[#0D5C46]">
            <Activity className="h-4 w-4" />
            Ringkasan pra-konsultasi
          </p>
          <dl className="mt-2 space-y-1.5">
            <SummaryDetail label="Tipe diabetes" value={summary.diabetesType} />
            <SummaryDetail
              label="Obat saat ini"
              value={summary.currentMedication}
            />
            <SummaryDetail
              label="Keluhan utama"
              value={summary.primaryComplaint}
            />
            <SummaryDetail
              label="Tanda darurat"
              value={
                summary.emergencyFlag
                  ? "Ya — prioritaskan pemeriksaan"
                  : "Tidak terdeteksi"
              }
            />
          </dl>
          {summary.recentPatientMessages.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-bold text-[#0D5C46]">
                Lihat konteks percakapan
              </summary>
              <ul className="mt-2 space-y-1 text-[#5F7067]">
                {summary.recentPatientMessages.map((message, index) => (
                  <li key={`${booking.id}-message-${index}`}>• {message}</li>
                ))}
              </ul>
            </details>
          )}
          <p className="mt-2 text-[10px] italic text-[#6B7C72]">
            {summary.note}
          </p>
        </section>
      )}
      {booking.events.length > 0 && (
        <details className="mt-3 rounded-xl border border-[#EAE4DC] px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-[#4A5D53]">
            Riwayat perubahan ({booking.events.length})
          </summary>
          <ol className="mt-2 space-y-2">
            {booking.events.map((event) => (
              <li key={event.id} className="text-[10px] text-[#6B7C72]">
                <strong className="text-[#3A4F46]">
                  {bookingEventLabel(event.action)}
                </strong>{" "}
                · {event.actorLabel ?? "GlucoCare"}
                <br />
                {formatConsultationDate(event.createdAt)}
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {contactLink && (
          <a
            href={contactLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE1D8] px-3 py-2 text-xs font-bold text-[#0D5C46] hover:bg-[#F3F8F5]"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Hubungi pasien
          </a>
        )}
        {booking.status === "PENDING" && (
          <ActionButton
            disabled={busy}
            onClick={() => onUpdate(booking, "CONFIRMED")}
            icon={<Check className="h-3.5 w-3.5" />}
            label="Konfirmasi"
          />
        )}
        {booking.status === "CONFIRMED" && (
          <ActionButton
            disabled={busy}
            onClick={() => onUpdate(booking, "COMPLETED")}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Tandai selesai"
          />
        )}
        {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
          <ActionButton
            disabled={busy}
            onClick={() => onUpdate(booking, "CANCELLED")}
            icon={<XCircle className="h-3.5 w-3.5" />}
            label="Batalkan"
            danger
          />
        )}
      </div>
    </article>
  );
}

function ScheduleCard({
  slot,
  busy,
  onUpdate,
}: {
  slot: DoctorScheduleSlot;
  busy: boolean;
  onUpdate: (slot: DoctorScheduleSlot, status: "AVAILABLE" | "BLOCKED") => void;
}) {
  return (
    <article className="rounded-2xl border border-[#E4DED6] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-[#24362E]">
            {slot.doctor?.name ?? "Dokter"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#0D5C46]">
            {formatConsultationDate(slot.startsAt)}
          </p>
        </div>
        <SlotBadge status={slot.status} />
      </div>
      <div className="mt-3 space-y-1 text-xs text-[#6B7C72]">
        <p>
          {consultationModeLabel(slot.mode)}
          {slot.clinic ? ` — ${slot.clinic.name}, ${slot.clinic.city}` : ""}
        </p>
        <p>
          {formatRupiah(slot.price)} ·{" "}
          {Math.round(
            (new Date(slot.endsAt).getTime() -
              new Date(slot.startsAt).getTime()) /
              60_000,
          )}{" "}
          menit
        </p>
        {slot.notes && <p>{slot.notes}</p>}
      </div>
      {slot.status !== "BOOKED" && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onUpdate(
              slot,
              slot.status === "AVAILABLE" ? "BLOCKED" : "AVAILABLE",
            )
          }
          className="mt-4 cursor-pointer rounded-lg border border-[#D7E2DC] px-3 py-2 text-xs font-bold text-[#0D5C46] hover:bg-[#F3F8F5] disabled:opacity-50"
        >
          {slot.status === "AVAILABLE" ? "Tutup slot" : "Buka kembali"}
        </button>
      )}
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "amber" | "green" | "blue" | "red";
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#EAE4DC] bg-white p-4">
      <span className={`rounded-xl p-2.5 ${styles[tone]}`}>{icon}</span>
      <div>
        <p className="text-2xl font-extrabold text-[#24362E]">{value}</p>
        <p className="text-xs text-[#6B7C72]">{label}</p>
      </div>
    </div>
  );
}
function SummaryDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-[#6B7C72]">{label}</dt>
      <dd className="font-semibold text-[#3A4F46]">
        {value || "Belum diinformasikan"}
      </dd>
    </div>
  );
}
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-bold ${active ? "bg-white text-[#0D5C46] shadow-sm" : "text-[#6B7C72]"}`}
    >
      {children}
    </button>
  );
}
function StatusBadge({ status }: { status: BookingStatus }) {
  const style: Record<BookingStatus, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    COMPLETED: "bg-sky-50 text-sky-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${style[status]}`}
    >
      {bookingStatusLabel(status)}
    </span>
  );
}
function SlotBadge({ status }: { status: ScheduleSlotStatus }) {
  const labels = {
    AVAILABLE: "Tersedia",
    BOOKED: "Sudah dipesan",
    BLOCKED: "Ditutup",
  };
  const style = {
    AVAILABLE: "bg-emerald-50 text-emerald-700",
    BOOKED: "bg-amber-50 text-amber-700",
    BLOCKED: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${style[status]}`}
    >
      {labels[status]}
    </span>
  );
}
function ActionButton({
  disabled,
  onClick,
  icon,
  label,
  danger = false,
}: {
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${danger ? "bg-red-500 hover:bg-red-600" : "bg-[#0D5C46] hover:bg-[#0A4A38]"}`}
    >
      {icon}
      {label}
    </button>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold text-[#4A5D53]">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D9D4CC] bg-white px-6 py-12 text-center text-sm text-[#6B7C72]">
      {text}
    </div>
  );
}
function LoadingText({ text }: { text: string }) {
  return (
    <p className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-12 text-sm text-[#6B7C72]">
      <RefreshCw className="h-4 w-4 animate-spin" />
      {text}
    </p>
  );
}
function readableError(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Perubahan belum berhasil disimpan. Silakan coba lagi.";
}
