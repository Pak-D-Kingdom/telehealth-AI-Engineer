import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RelatedCareCards from "../components/RelatedCareCards";

describe("RelatedCareCards", () => {
  test("menampilkan disclaimer, produk resep, dan profil dokter", () => {
    const html = renderToStaticMarkup(createElement(RelatedCareCards, {
      options: {
        reason: "Pilihan katalog terkait topik diabetes",
        disclaimer: "Bukan rekomendasi obat personal.",
        products: [{
          id: "00000000-0000-4000-8000-000000000001",
          slug: "metformin-demo",
          name: "Metformin Demo",
          category: "Obat resep",
          price: 45_000,
          image: null,
          guidance: "Hanya dengan resep dan penilaian tenaga medis.",
          requiresPrescription: true,
        }],
        doctors: [{
          id: "00000000-0000-4000-8000-000000000002",
          slug: "dokter-demo",
          name: "dr. Dokter Demo, Sp.PD",
          specialty: "Diabetes Tipe 2",
          experience: "10 Tahun",
          image: null,
          nextAvailability: {
            slotId: "00000000-0000-4000-8000-000000000004",
            mode: "ONLINE",
            startsAt: "2026-08-30T03:00:00.000Z",
            endsAt: "2026-08-30T03:45:00.000Z",
            price: 250_000,
            clinic: null,
          },
        }],
        suggestedReplies: [{
          id: "type-2",
          label: "Diabetes tipe 2",
          message: "Saya memiliki diabetes tipe 2.",
        }],
      },
      onSelect: () => undefined,
      onViewProduct: () => undefined,
      onBuyProduct: () => undefined,
      onViewDoctor: () => undefined,
      onBookDoctor: () => undefined,
      showSuggestions: true,
    }));

    expect(html).toContain("Bukan rekomendasi obat personal");
    expect(html).toContain("Metformin Demo");
    expect(html).toContain("Hanya dengan resep");
    expect(html).toContain("dr. Dokter Demo");
    expect(html).toContain("Lihat produk");
    expect(html).toContain("Konsultasi resep");
    expect(html).not.toContain("Beli produk");
    expect(html).toContain("Lihat profil");
    expect(html).toContain("Pilih jadwal");
    expect(html).toContain("Tersedia");
    expect(html).toContain("Diabetes tipe 2");
  });

  test("menawarkan pembelian hanya untuk produk tanpa resep", () => {
    const html = renderToStaticMarkup(createElement(RelatedCareCards, {
      options: {
        reason: "Produk terkait pemantauan gula darah",
        disclaimer: "Pastikan produk sesuai dengan alat yang digunakan.",
        products: [{
          id: "00000000-0000-4000-8000-000000000003",
          slug: "strip-demo",
          name: "Strip Tes Demo",
          category: "Alat kesehatan",
          price: 50_000,
          image: null,
          guidance: "Periksa kompatibilitas produk.",
          requiresPrescription: false,
        }],
        doctors: [],
        suggestedReplies: [],
      },
      onBuyProduct: () => undefined,
    }));

    expect(html).toContain("Beli produk");
  });
});
