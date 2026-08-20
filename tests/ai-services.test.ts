import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  GlucoseAnalyzer,
  RiskCalculator,
  InteractionChecker,
  ContraindicationChecker,
} from "../src/services/health-tools.service";
import { app } from "../src/app";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("AI Health Tools & Clinical Calculators", () => {
  describe("GlucoseAnalyzer", () => {
    test("menghitung rata-rata, estimasi HbA1c, dan mendeteksi spike glukosa", () => {
      const readings = [
        { value: 120, type: "puasa" },
        { value: 210, type: "setelah_makan" },
        { value: 130, type: "puasa" },
        { value: 195, type: "setelah_makan" },
      ];

      const result = GlucoseAnalyzer.analyze(readings);

      expect(result.count).toBe(4);
      expect(result.average_fasting).toBe(125);
      expect(result.average_postprandial).toBe(202.5);
      expect(result.overall_average).toBe(163.8);
      // HbA1c = (163.8 + 46.7) / 28.7 = 7.33 -> 7.3
      expect(result.estimated_hba1c).toBe(7.3);
      expect(result.patterns).toContain("Spike setelah makan (postprandial tinggi)");
      expect(result.patterns).toContain("Lonjakan besar setelah makan (>60 mg/dL)");
      expect(result.hypoglycemia_events).toBe(0);
      expect(result.assessment).toContain("perlu perbaikan");
    });

    test("mendeteksi episode hipoglikemia", () => {
      const readings = [
        { value: 55, type: "puasa" },
        { value: 140, type: "setelah_makan" },
      ];

      const result = GlucoseAnalyzer.analyze(readings);

      expect(result.hypoglycemia_events).toBe(1);
      expect(result.advice).toContain("Ada episode hipoglikemia");
    });
  });

  describe("RiskCalculator (FINDRISC)", () => {
    test("menghitung skor FINDRISC risiko tinggi", () => {
      const input = {
        age: 58, // 3 pts
        bmi: 32, // 3 pts
        waist_cm: 105, // male > 102 -> 4 pts
        gender: "male",
        eat_vegetables_daily: false, // 1 pt
        physical_activity: false, // 2 pts
        hypertension_medication: true, // 2 pts
        high_blood_glucose_history: true, // 5 pts
        family_history: "immediate" as const, // 5 pts
      };

      const result = RiskCalculator.calculateFindrisc(input);

      // Total = 3 + 3 + 4 + 1 + 2 + 2 + 5 + 5 = 25 pts
      expect(result.score).toBe(25);
      expect(result.category).toBe("Sangat Tinggi");
      expect(result.breakdown.length).toBe(8);
      expect(result.suggested_questions.length).toBeGreaterThan(0);
    });

    test("menghitung skor FINDRISC risiko rendah", () => {
      const input = {
        age: 28, // 0 pts
        bmi: 21, // 0 pts
        waist_cm: 78, // male < 94 -> 0 pts
        gender: "male",
        eat_vegetables_daily: true, // 0 pts
        physical_activity: true, // 0 pts
        hypertension_medication: false, // 0 pts
        high_blood_glucose_history: false, // 0 pts
        family_history: "none" as const, // 0 pts
      };

      const result = RiskCalculator.calculateFindrisc(input);

      expect(result.score).toBe(0);
      expect(result.category).toBe("Rendah");
    });
  });

  describe("InteractionChecker", () => {
    test("mendeteksi interaksi berbahaya antara Metformin dan Alkohol", () => {
      const result = InteractionChecker.check(["Metformin 500mg", "Alkohol"]);

      expect(result.has_interaction).toBe(true);
      expect(result.interactions.length).toBe(1);
      expect(result.interactions[0]?.severity).toBe("tinggi");
      expect(result.interactions[0]?.description).toContain("asidosis laktat");
    });

    test("mendeteksi interaksi sedang antara Glibenclamide dan Ibuprofen (NSAID)", () => {
      const result = InteractionChecker.check(["Glibenclamide", "Ibuprofen 400mg"]);

      expect(result.has_interaction).toBe(true);
      expect(result.interactions[0]?.severity).toBe("sedang");
      expect(result.interactions[0]?.description).toContain("hipoglikemia");
    });

    test("tidak menemukan interaksi jika obat aman", () => {
      const result = InteractionChecker.check(["Paracetamol", "Vitamin C"]);

      expect(result.has_interaction).toBe(false);
      expect(result.interactions.length).toBe(0);
    });
  });

  describe("ContraindicationChecker", () => {
    test("mendeteksi kontraindikasi Metformin pada pasien gangguan ginjal berat dan kehamilan", () => {
      const result = ContraindicationChecker.check(["Metformin"], {
        egfr_di_bawah_30: true,
        sedang_hamil: true,
      });

      expect(result.contraindicated.length).toBe(1);
      expect(result.contraindicated[0]?.medication).toBe("Metformin");
      expect(result.contraindicated[0]?.reasons).toContain("Kehamilan (kontraindikasi terapi oral)");
      expect(result.contraindicated[0]?.reasons).toContain(
        "Gangguan fungsi ginjal berat (eGFR < 30 mL/min)",
      );
    });

    test("memberikan warning lansia untuk sulfonilurea", () => {
      const result = ContraindicationChecker.check(["Glimepiride"], {
        usia: 72,
      });

      expect(result.contraindicated.length).toBe(0);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]?.warnings[0]).toContain("[Lansia]");
    });
  });

  describe("AI API Routes Integration", () => {
    test("POST /api/ai/glucose/trends mengembalikan hasil analisis glukosa", async () => {
      const response = await fetch(`${baseUrl}/api/ai/glucose/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readings: [
            { value: 110, type: "puasa" },
            { value: 150, type: "setelah_makan" },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const json: any = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.overall_average).toBe(130);
    });

    test("POST /api/ai/risk/findrisc mengembalikan perhitungan skor risiko", async () => {
      const response = await fetch(`${baseUrl}/api/ai/risk/findrisc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: 50,
          bmi: 27,
          waist_cm: 90,
          gender: "male",
        }),
      });

      expect(response.status).toBe(200);
      const json: any = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.score).toBeDefined();
    });

    test("POST /api/ai/medications/interactions memeriksa interaksi obat", async () => {
      const response = await fetch(`${baseUrl}/api/ai/medications/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: ["Metformin", "Alkohol"],
        }),
      });

      expect(response.status).toBe(200);
      const json: any = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.has_interaction).toBe(true);
    });

    test("POST /api/ai/medications/contraindications mendeteksi kontraindikasi", async () => {
      const response = await fetch(`${baseUrl}/api/ai/medications/contraindications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_medications: ["Metformin", "Glibenclamide"],
          patient_conditions: { sedang_hamil: true },
        }),
      });

      expect(response.status).toBe(200);
      const json: any = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.contraindicated.length).toBeGreaterThan(0);
    });
  });
});
