import { describe, expect, test } from "bun:test";
import {
  checkEmergencyFlag,
  isLeadComplete,
  normalizeWhatsappNumber,
} from "../src/services/conversation-state.service";

describe("conversation state", () => {
  test("lead lengkap memerlukan nama, WhatsApp, dan tipe diabetes", () => {
    expect(
      isLeadComplete({
        name: "Budi",
        whatsapp: "+6281234567890",
        diabetesType: "Tipe 2",
      }),
    ).toBe(true);
    expect(isLeadComplete({ name: "Budi", whatsapp: "081234567890" })).toBe(false);
  });

  test("mendeteksi frasa kondisi darurat tanpa menandai percakapan biasa", () => {
    expect(checkEmergencyFlag("Ayah saya tiba-tiba pingsan.")).toBe(true);
    expect(checkEmergencyFlag("Pasien mengalami sesak napas dan kebingungan berat.")).toBe(true);
    expect(checkEmergencyFlag("Gula darah saya 120, apakah perlu dicatat?")).toBe(false);
    expect(checkEmergencyFlag("Gula darah saya 48 mg/dL dan badan gemetar.")).toBe(true);
    expect(checkEmergencyFlag("Gula darah 350 mg/dL disertai muntah dan nyeri perut.")).toBe(true);
    expect(checkEmergencyFlag("Gula darah 350 mg/dL tanpa keluhan lain.")).toBe(false);
    expect(checkEmergencyFlag("Wajah ayah mencong dan bicara pelo.")).toBe(true);
  });

  test("menormalisasi dan memvalidasi nomor WhatsApp Indonesia", () => {
    expect(normalizeWhatsappNumber("0812-3456-7890")).toBe("+6281234567890");
    expect(normalizeWhatsappNumber("+62 812 3456 7890")).toBe("+6281234567890");
    expect(normalizeWhatsappNumber("120 mg/dL")).toBeUndefined();
    expect(isLeadComplete({ name: "Budi", whatsapp: "123", diabetesType: "Tipe 2" })).toBe(false);
  });
});
