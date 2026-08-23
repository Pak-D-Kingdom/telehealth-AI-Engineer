import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownMessage from "../components/MarkdownMessage";

describe("MarkdownMessage", () => {
  test("merender emphasis, list, link, dan tabel sebagai HTML semantik", () => {
    const markdown = [
      "Terima kasih, **informasi penting**.",
      "",
      "- Poin pertama",
      "- Poin kedua",
      "",
      "[Sumber](https://example.com)",
      "",
      "| Pemeriksaan | Nilai |",
      "| --- | --- |",
      "| HbA1c | 7% |",
    ].join("\n");
    const html = renderToStaticMarkup(createElement(MarkdownMessage, null, markdown));

    expect(html).toContain("<strong");
    expect(html).toContain("<ul");
    expect(html).toContain("<a");
    expect(html).toContain("<table");
    expect(html).not.toContain("**informasi penting**");
  });

  test("mengabaikan raw HTML dari respons model", () => {
    const html = renderToStaticMarkup(createElement(
      MarkdownMessage,
      null,
      "Aman <script>alert('xss')</script> <img src=x onerror=alert(1)>",
    ));

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
  });
});
