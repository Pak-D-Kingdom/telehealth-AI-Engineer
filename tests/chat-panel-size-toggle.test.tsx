import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatPanelSizeToggle from "../components/ChatPanelSizeToggle";

describe("ChatPanelSizeToggle", () => {
  test("menjelaskan tindakan memperlebar panel", () => {
    const html = renderToStaticMarkup(createElement(ChatPanelSizeToggle, {
      isExpanded: false,
      onToggle: () => undefined,
    }));

    expect(html).toContain('aria-controls="glucocare-chat-panel"');
    expect(html).toContain('aria-label="Perlebar percakapan"');
    expect(html).toContain('aria-pressed="false"');
  });

  test("menjelaskan tindakan mengembalikan ukuran panel", () => {
    const html = renderToStaticMarkup(createElement(ChatPanelSizeToggle, {
      isExpanded: true,
      onToggle: () => undefined,
    }));

    expect(html).toContain('aria-label="Perkecil percakapan"');
    expect(html).toContain('aria-pressed="true"');
  });
});
