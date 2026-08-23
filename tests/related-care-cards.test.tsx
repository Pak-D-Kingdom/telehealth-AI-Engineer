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
        }],
      },
    }));

    expect(html).toContain("Bukan rekomendasi obat personal");
    expect(html).toContain("Metformin Demo");
    expect(html).toContain("Hanya dengan resep");
    expect(html).toContain("dr. Dokter Demo");
  });
});
