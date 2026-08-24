import type { BookingStatus, ConsultationMode } from "@/lib/api-types";

export function formatConsultationDate(value: string) {
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date(value))
      .replace(" pukul ", ", ") + " WIB"
  );
}

export function consultationModeLabel(mode: ConsultationMode) {
  return mode === "ONLINE" ? "Konsultasi online" : "Tatap muka";
}

export function bookingStatusLabel(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    PENDING: "Menunggu konfirmasi",
    CONFIRMED: "Terkonfirmasi",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };
  return labels[status];
}

export function whatsappLink(number: string, message: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function maskWhatsapp(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 7) return "Nomor disembunyikan";
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}

export function bookingEventLabel(action: string) {
  const labels: Record<string, string> = {
    BOOKING_CREATED: "Booking dibuat",
    BOOKING_RESCHEDULED: "Jadwal diubah",
    BOOKING_CANCELLED: "Booking dibatalkan",
    STATUS_UPDATED: "Status diperbarui",
    DATA_DELETION_REQUESTED: "Penghapusan data diminta",
    DATA_ANONYMIZED: "Data pribadi telah dihapus",
  };
  return labels[action] ?? "Booking diperbarui";
}

export function isBookingManagementIntent(message: string) {
  return /\b(?:cek|lihat|status|ubah|ganti|reschedule|batalkan|batal|cancel|kelola)\b.{0,32}\b(?:booking|jadwal|janji)\b|\b(?:booking|jadwal|janji)\b.{0,32}\b(?:cek|lihat|status|ubah|ganti|batalkan|batal|cancel|kelola)\b/i.test(
    message,
  );
}
