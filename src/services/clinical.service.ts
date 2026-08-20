import { sendChatCompletion } from "./ai.service";
import { ContraindicationChecker, PatientConditions } from "./health-tools.service";
import { AppError } from "../errors/app-error";

export interface PatientIntakeData {
  nama?: string;
  usia?: number;
  gender?: string;
  bmi?: number;
  tinggi_cm?: number;
  berat_kg?: number;
  tekanan_darah?: string;
  keluhan_utama?: string;
  durasi_keluhan?: string;
  gejala?: string[];
  gula_darah_terkini?: number;
  tipe_diabetes?: "tipe1" | "tipe2" | "gestasional" | string;
  obat_saat_ini?: string[];
  alergi?: string;
  riwayat_penyakit?: string[];
  sedang_hamil?: boolean;
  gangguan_ginjal?: boolean;
  gagal_jantung?: boolean;
}

export interface SoapSummary {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ClinicalSummaryResult {
  soap: SoapSummary;
  clinical_notes: string;
  urgency: "routine" | "urgent" | "emergency";
  referral_needed: string[];
  follow_up_schedule: string;
}

export interface MedicationPrescription {
  medicine_name: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  rationale: string;
  monitoring: string;
}

export interface PrescriptionDraftResult {
  diagnosis: string;
  treatment_goals: string[];
  medications: MedicationPrescription[];
  contraindication_audit: any;
  non_pharmacological: string[];
  referrals: string[];
  follow_up_schedule: string;
  doctor_validation_notes: string;
}

const CLINICAL_SUMMARY_PROMPT = `Kamu adalah AI Clinical Assistant untuk dokter spesialis penyakit dalam dan endokrinologi.

TUGAS:
Menyusun ringkasan klinis format SOAP (Subjective, Objective, Assessment, Plan) berdasarkan data intake pasien diabetes.

ATURAN:
1. Gunakan data yang diberikan secara akurat tanpa membuat data palsu.
2. Pada Assessment, berikan analisis klinis dan working diagnosis.
3. Pada Plan, berikan rekomendasi tindakan dan monitoring.
4. Tentukan tingkat urgensi: "routine", "urgent", atau "emergency".
5. Keluarkan HANYA format JSON valid tanpa pengantar atau markdown block.

FORMAT JSON:
{
  "soap": {
    "subjective": "Keluhan utama dan riwayat penyakit pasien secara naratif",
    "objective": "Data terukur seperti BMI, TD, hasil gula darah",
    "assessment": "Analisis klinis komprehensif dan status kontrol diabetes",
    "plan": "Rencana tindakan, modifikasi gaya hidup, dan edukasi"
  },
  "clinical_notes": "Catatan penting untuk dokter penanggung jawab",
  "urgency": "routine",
  "referral_needed": ["Spesialis Mata/Retina jika ada keluhan penglihatan"],
  "follow_up_schedule": "Kontrol ulang 2-4 minggu ke depan"
}`;

const PRESCRIPTION_DRAFTER_PROMPT = `Kamu adalah AI Clinical Assistant yang membantu dokter menyusun DRAF resep untuk pasien diabetes melitus sesuai panduan PERKENI/ADA.

PENTING:
- Ini adalah DRAF rekomendasi awal untuk dokter penanggung jawab, bukan instruksi final.
- Jangan merekomendasikan obat yang bertentangan dengan kontraindikasi pasien.
- Jika pasien hamil, HANYA insulin yang direkomendasikan.
- Jika pasien DM Tipe 1, INSULIN mutlak wajib.

Keluarkan HANYA format JSON valid:
{
  "diagnosis": "Diabetes Melitus Tipe 2 tidak terkontrol",
  "treatment_goals": ["Mencapai HbA1c < 7%", "Menghindari episode hipoglikemia"],
  "medications": [
    {
      "medicine_name": "Metformin",
      "dosage": "500 mg",
      "frequency": "2 kali sehari",
      "timing": "Bersama atau segera setelah makan",
      "duration": "30 hari",
      "rationale": "Lini pertama untuk meningkatkan sensitivitas insulin",
      "monitoring": "Pantau keluhan saluran cerna dan fungsi ginjal berkala"
    }
  ],
  "non_pharmacological": [
    "Diet diabetes 1700 kkal dengan 3 jadwal makan utama dan 2 camilan berserat",
    "Aktivitas fisik aerobik 150 menit per minggu"
  ],
  "referrals": [],
  "follow_up_schedule": "Pemeriksaan gula darah puasa dan 2 jam PP dalam 1 bulan",
  "doctor_validation_notes": "Mohon verifikasi fungsi ginjal sebelum meresepkan Metformin dosis penuh."
}`;

export class ClinicalService {
  static async generateClinicalSummary(intake: PatientIntakeData): Promise<ClinicalSummaryResult> {
    const promptInput = `Data Pasien:
- Nama: ${intake.nama || "Pasien"}
- Usia: ${intake.usia || "-"} tahun, Gender: ${intake.gender || "-"}
- BMI: ${intake.bmi || "-"}, TD: ${intake.tekanan_darah || "-"}
- Keluhan: ${intake.keluhan_utama || "-"} (Durasi: ${intake.durasi_keluhan || "-"})
- Gejala: ${(intake.gejala || []).join(", ") || "-"}
- Gula Darah Terkini: ${intake.gula_darah_terkini ? `${intake.gula_darah_terkini} mg/dL` : "-"}
- Obat Saat Ini: ${(intake.obat_saat_ini || []).join(", ") || "-"}
- Riwayat Penyakit: ${(intake.riwayat_penyakit || []).join(", ") || "-"}
- Alergi: ${intake.alergi || "Tidak ada"}
- Kondisi Khusus: Hamil: ${intake.sedang_hamil ? "Ya" : "Tidak"}, Ginjal: ${intake.gangguan_ginjal ? "Ya" : "Tidak"}`;

    const messages = [{ role: "user" as const, content: promptInput }];

    try {
      const response = await sendChatCompletion(messages, CLINICAL_SUMMARY_PROMPT, {
        maxTokens: 1000,
        temperature: 0.1,
      });

      return this.cleanAndParseJson(response);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, "CLINICAL_SUMMARY_FAILED", `Gagal menyusun ringkasan klinis: ${err.message || err}`);
    }
  }

  static async generatePrescriptionDraft(intake: PatientIntakeData): Promise<PrescriptionDraftResult> {
    const conditions: PatientConditions = {
      usia: intake.usia,
      bmi: intake.bmi,
      sedang_hamil: intake.sedang_hamil,
      tipe_diabetes: intake.tipe_diabetes,
      gangguan_ginjal: intake.gangguan_ginjal,
      gagal_jantung: intake.gagal_jantung,
      alergi: intake.alergi,
    };

    const promptInput = `Data Intake Klinis:
- Usia: ${intake.usia || "-"} tahun
- Tipe Diabetes: ${intake.tipe_diabetes || "tipe2"}
- BMI: ${intake.bmi || "-"}
- Gula Darah Terkini: ${intake.gula_darah_terkini ? `${intake.gula_darah_terkini} mg/dL` : "-"}
- Keluhan: ${intake.keluhan_utama || "-"}
- Sedang Hamil: ${intake.sedang_hamil ? "YA" : "TIDAK"}
- Gangguan Ginjal: ${intake.gangguan_ginjal ? "YA" : "TIDAK"}
- Obat Saat Ini: ${(intake.obat_saat_ini || []).join(", ") || "Belum ada"}`;

    const messages = [{ role: "user" as const, content: promptInput }];

    try {
      const response = await sendChatCompletion(messages, PRESCRIPTION_DRAFTER_PROMPT, {
        maxTokens: 1200,
        temperature: 0.1,
      });

      const parsed = this.cleanAndParseJson(response);
      const proposedMeds = Array.isArray(parsed.medications)
        ? parsed.medications.map((m: any) => m.medicine_name)
        : [];

      // Validasi audit kontraindikasi secara otomatis
      const audit = ContraindicationChecker.check(proposedMeds, conditions);

      return {
        diagnosis: parsed.diagnosis || "Diabetes Melitus",
        treatment_goals: parsed.treatment_goals || ["Kontrol glikemik"],
        medications: Array.isArray(parsed.medications) ? parsed.medications : [],
        contraindication_audit: audit,
        non_pharmacological: parsed.non_pharmacological || [],
        referrals: parsed.referrals || [],
        follow_up_schedule: parsed.follow_up_schedule || "Kontrol rutin 1 bulan",
        doctor_validation_notes: parsed.doctor_validation_notes || "Resep memerlukan telaah dan tanda tangan dokter.",
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, "PRESCRIPTION_DRAFT_FAILED", `Gagal menyusun draf resep: ${err.message || err}`);
    }
  }

  private static cleanAndParseJson(raw: string): any {
    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(cleaned);
    } catch {
      throw new AppError(500, "JSON_PARSE_ERROR", "Respon LLM tidak dapat diparsing sebagai JSON.");
    }
  }
}
