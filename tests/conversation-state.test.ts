import { describe, expect, test } from "bun:test";
import {
  checkEmergencyFlag,
  isLeadComplete,
} from "../src/services/conversation-state.service";

describe("conversation state", () => {
  test("lead lengkap memerlukan nama, WhatsApp, dan tipe diabetes", () => {
    expect(
      isLeadComplete({
        name: "Budi",
        whatsapp: "081234567890",
        diabetesType: "Tipe 2",
      }),
    ).toBe(true);
    expect(isLeadComplete({ name: "Budi", whatsapp: "081234567890" })).toBe(false);
  });

  test("mendeteksi frasa kondisi darurat tanpa menandai percakapan biasa", () => {
    expect(checkEmergencyFlag("Ayah saya tiba-tiba pingsan.")).toBe(true);
    expect(checkEmergencyFlag("Pasien mengalami sesak napas dan kebingungan berat.")).toBe(true);
    expect(checkEmergencyFlag("Gula darah saya 120, apakah perlu dicatat?")).toBe(false);
  });
});
