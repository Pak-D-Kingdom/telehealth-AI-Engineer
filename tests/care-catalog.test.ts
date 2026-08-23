import { describe, expect, test } from "bun:test";
import {
  buildCareSuggestions,
  shouldShowRelatedCare,
} from "../src/services/care-catalog.service";

describe("related care catalog intent", () => {
  test("mendeteksi permintaan produk atau dokter dalam domain diabetes", () => {
    expect(shouldShowRelatedCare("Rekomendasikan obat untuk diabetes tipe 2 saya.")).toBe(true);
    expect(shouldShowRelatedCare("Obat apa yang cocok untuk luka diabetes?")).toBe(true);
    expect(shouldShowRelatedCare("Saya butuh dokter untuk membahas HbA1c.")).toBe(true);
    expect(shouldShowRelatedCare("Apakah Metformin aman dan perlu resep?")).toBe(true);
  });

  test("tidak memicu katalog untuk riwayat obat atau kondisi di luar domain", () => {
    expect(shouldShowRelatedCare("Saya sedang minum Metformin 500 mg.")).toBe(false);
    expect(shouldShowRelatedCare("Rekomendasikan obat sakit kepala.")).toBe(false);
    expect(shouldShowRelatedCare("Apa itu HbA1c?")).toBe(false);
    expect(shouldShowRelatedCare("Olahraga apa yang aman untuk penderita diabetes?")).toBe(false);
  });

  test("memicu review terapi untuk keputusan obat tetapi bukan kata aman yang umum", () => {
    expect(shouldShowRelatedCare("Bolehkah saya berhenti insulin mulai hari ini?")).toBe(true);
    expect(shouldShowRelatedCare("Suplemen apa yang aman untuk diabetes?")).toBe(true);
  });

  test("mewarisi domain diabetes dari konteks tetapi intent harus ada di pesan terbaru", () => {
    const context = "Saya sedang membahas diabetes tipe 2.";

    expect(shouldShowRelatedCare("Ada rekomendasi obat ga ya?", context)).toBe(true);
    expect(shouldShowRelatedCare("Ada recommend obat ga ya?", context)).toBe(true);
    expect(shouldShowRelatedCare("Ada rekom obat ga ya?", context)).toBe(true);
    expect(shouldShowRelatedCare("Terima kasih.", `${context}\nRekomendasikan obat.`)).toBe(false);
  });

  test("memberikan pilihan klarifikasi tipe diabetes ketika konteks belum lengkap", () => {
    const suggestions = buildCareSuggestions("Saya ingin rekomendasi obat diabetes.");

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      "Diabetes tipe 2",
      "Diabetes tipe 1",
      "Belum tahu tipenya",
    ]);
    expect(suggestions.every((suggestion) => /rekomendasi|konsultasi/i.test(suggestion.message)))
      .toBe(true);
  });

  test("memberikan langkah produk dan dokter setelah tipe diabetes diketahui", () => {
    const suggestions = buildCareSuggestions("Saya memiliki diabetes tipe 2.", "diabetes tipe 2");

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      "Produk tanpa resep",
      "Konsultasi dokter",
      "Bahas keamanan obat",
    ]);
  });
});
