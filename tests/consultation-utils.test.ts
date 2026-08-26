import { describe, expect, test } from "bun:test";
import {
  bookingStatusLabel,
  bookingEventLabel,
  consultationModeLabel,
  formatConsultationDate,
  isBookingManagementIntent,
  maskWhatsapp,
  whatsappLink,
} from "../lib/consultation";

describe("consultation helpers", () => {
  test("menampilkan waktu konsultasi dalam zona WIB", () => {
    expect(formatConsultationDate("2026-08-30T03:00:00.000Z")).toContain(
      "10.00 WIB",
    );
  });

  test("mengubah nomor Indonesia menjadi tautan WhatsApp", () => {
    expect(whatsappLink("0812-3456-7890", "Konfirmasi booking")).toBe(
      "https://wa.me/6281234567890?text=Konfirmasi%20booking",
    );
  });

  test("menyediakan label yang mudah dipahami", () => {
    expect(consultationModeLabel("OFFLINE")).toBe("Tatap muka");
    expect(bookingStatusLabel("PENDING")).toBe("Menunggu konfirmasi");
    expect(bookingEventLabel("BOOKING_RESCHEDULED")).toBe("Jadwal diubah");
    expect(maskWhatsapp("+6281234567890")).toBe("6281••••890");
  });

  test("mengenali permintaan pengguna untuk mengelola booking", () => {
    expect(isBookingManagementIntent("cek booking saya")).toBe(true);
    expect(
      isBookingManagementIntent("saya mau batalkan jadwal konsultasi"),
    ).toBe(true);
    expect(isBookingManagementIntent("berapa gula darah normal?")).toBe(false);
  });
});
