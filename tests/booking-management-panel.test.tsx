import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BookingManagementPanel from "../components/BookingManagementPanel";

describe("BookingManagementPanel", () => {
  test("meminta kode booking dan WhatsApp dengan penjelasan privasi", () => {
    const html = renderToStaticMarkup(
      createElement(BookingManagementPanel, {
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("Kelola booking");
    expect(html).toContain("Kode booking");
    expect(html).toContain("Nomor WhatsApp");
    expect(html).toContain(
      "Data hanya ditampilkan jika kode booking dan nomor WhatsApp cocok",
    );
  });
});
