import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatFeedbackControls from "../components/ChatFeedbackControls";

describe("ChatFeedbackControls", () => {
  test("menawarkan pilihan feedback untuk jawaban baru", () => {
    const html = renderToStaticMarkup(createElement(ChatFeedbackControls, {
      onSubmit: async () => undefined,
    }));

    expect(html).toContain("Jawaban ini membantu?");
    expect(html).toContain("Jawaban membantu");
    expect(html).toContain("Jawaban tidak membantu");
  });

  test("menampilkan konfirmasi untuk feedback yang sudah tersimpan", () => {
    const html = renderToStaticMarkup(createElement(ChatFeedbackControls, {
      value: {
        rating: "NOT_HELPFUL",
        reason: "UNCLEAR",
        updatedAt: "2026-08-24T00:00:00.000Z",
      },
      onSubmit: async () => undefined,
    }));

    expect(html).toContain("Terima kasih atas penilaian Anda");
    expect(html).not.toContain("Jawaban ini membantu?");
  });
});
