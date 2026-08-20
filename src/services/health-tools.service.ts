export interface GlucoseReading {
  value: number;
  type?: "puasa" | "setelah_makan" | "sewaktu" | "tidur" | string;
  timestamp?: string | Date;
}

export interface GlucoseAnalysisResult {
  count: number;
  average_fasting: number | null;
  average_postprandial: number | null;
  overall_average: number;
  estimated_hba1c: number;
  patterns: string[];
  hypoglycemia_events: number;
  hyperglycemia_events: number;
  variability: number;
  assessment: string;
  advice: string;
  suggested_questions: string[];
}

export class GlucoseAnalyzer {
  static readonly FASTING_NORMAL = 100;
  static readonly FASTING_TARGET = 130;
  static readonly POSTPRANDIAL_TARGET = 180;
  static readonly HYPO_THRESHOLD = 70;

  static analyze(readings: GlucoseReading[]): GlucoseAnalysisResult {
    if (!readings || readings.length === 0) {
      throw new Error("Tidak ada data pembacaan gula darah.");
    }

    const fasting = readings.filter((r) => r.type === "puasa").map((r) => r.value);
    const post = readings.filter((r) => r.type === "setelah_makan").map((r) => r.value);
    const allVals = readings.map((r) => r.value);

    const avgFasting = fasting.length
      ? Math.round((fasting.reduce((a, b) => a + b, 0) / fasting.length) * 10) / 10
      : null;
    const avgPost = post.length
      ? Math.round((post.reduce((a, b) => a + b, 0) / post.length) * 10) / 10
      : null;
    const overall = Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10;

    // Formula Nathan et al. (2008): eAG = 28.7 * HbA1c - 46.7  =>  HbA1c = (eAG + 46.7) / 28.7
    const estimatedHba1c = Math.round(((overall + 46.7) / 28.7) * 10) / 10;

    const patterns: string[] = [];
    if (avgFasting && avgFasting > this.FASTING_TARGET) {
      patterns.push("Gula darah puasa cenderung tinggi");
    }
    if (avgPost && avgPost > this.POSTPRANDIAL_TARGET) {
      patterns.push("Spike setelah makan (postprandial tinggi)");
    }
    if (avgFasting && avgPost && avgPost - avgFasting > 60) {
      patterns.push("Lonjakan besar setelah makan (>60 mg/dL)");
    }
    if (avgFasting && avgFasting > 130 && avgPost && avgPost < 160) {
      patterns.push("Kemungkinan dawn phenomenon (puasa tinggi, siang normal)");
    }

    const hypoEvents = allVals.filter((v) => v < this.HYPO_THRESHOLD);
    const hyperEvents = allVals.filter((v) => v > 180);
    const variability = Math.max(...allVals) - Math.min(...allVals);

    if (variability > 100) {
      patterns.push("Variabilitas tinggi (gula darah naik-turun drastis)");
    }

    const assessment = this.buildAssessment(avgFasting, avgPost, estimatedHba1c, patterns);
    const advice = this.buildAdvice(patterns, hypoEvents.length > 0);

    return {
      count: allVals.length,
      average_fasting: avgFasting,
      average_postprandial: avgPost,
      overall_average: overall,
      estimated_hba1c: estimatedHba1c,
      patterns,
      hypoglycemia_events: hypoEvents.length,
      hyperglycemia_events: hyperEvents.length,
      variability,
      assessment,
      advice,
      suggested_questions: [
        "Bagaimana cara menurunkan estimasi HbA1c saya?",
        "Makanan apa saja yang tidak memicu spike gula darah?",
        "Kapan waktu terbaik mengecek gula darah mandiri?",
      ],
    };
  }

  private static buildAssessment(
    avgFasting: number | null,
    avgPost: number | null,
    hba1c: number,
    patterns: string[],
  ): string {
    const parts: string[] = [];
    if (avgFasting !== null) {
      const status = avgFasting <= this.FASTING_TARGET ? "terkontrol" : "di atas target";
      parts.push(`Rata-rata puasa ${avgFasting} mg/dL (${status}).`);
    }
    if (avgPost !== null) {
      const status = avgPost <= this.POSTPRANDIAL_TARGET ? "terkontrol" : "di atas target";
      parts.push(`Rata-rata setelah makan ${avgPost} mg/dL (${status}).`);
    }
    if (hba1c) {
      const cat = hba1c < 7 ? "baik / terkontrol" : "perlu perbaikan";
      parts.push(`Estimasi HbA1c ${hba1c}% (${cat}, target umum < 7%).`);
    }
    if (patterns.length > 0) {
      parts.push(`Pola terdeteksi: ${patterns.join("; ")}.`);
    }
    return parts.join(" ");
  }

  private static buildAdvice(patterns: string[], hasHypo: boolean): string {
    if (hasHypo) {
      return "Ada episode hipoglikemia (< 70 mg/dL). Segera konsultasikan penyesuaian dosis obat ke dokter dan selalu sediakan sumber glukosa cepat (permen/jus).";
    }
    if (patterns.length === 0) {
      return "Pola gula darah Anda terlihat stabil dan dalam rentang target. Pertahankan pola makan, obat teratur, dan aktivitas fisik saat ini.";
    }
    if (patterns.some((p) => p.includes("setelah makan"))) {
      return "Fokus kurangi karbohidrat sederhana saat makan, perbanyak serat/sayuran, dan lakukan jalan kaki ringan 10-15 menit setelah makan untuk meredam lonjakan.";
    }
    if (patterns.some((p) => p.includes("puasa"))) {
      return "Perhatikan pola makan malam dan hindari camilan manis sebelum tidur. Diskusikan dengan dokter bila gula darah puasa terus-menerus tinggi.";
    }
    return "Diskusikan pola fluktuasi ini dengan dokter spesialis untuk evaluasi regimen terapi Anda.";
  }
}

export interface FindriscInput {
  age: number;
  bmi: number;
  waist_cm: number;
  gender?: "male" | "female" | string;
  eat_vegetables_daily?: boolean;
  physical_activity?: boolean; // >= 30 mins daily
  hypertension_medication?: boolean;
  high_blood_glucose_history?: boolean;
  family_history?: "none" | "extended" | "immediate"; // extended = kakek/nenek/paman/bibi, immediate = orang tua/saudara/anak
}

export interface FindriscResult {
  score: number;
  category: "Rendah" | "Sedikit Meningkat" | "Sedang" | "Tinggi" | "Sangat Tinggi";
  breakdown: Array<{ factor: string; points: number }>;
  advice: string;
  suggested_questions: string[];
}

export class RiskCalculator {
  static calculateFindrisc(data: FindriscInput): FindriscResult {
    let score = 0;
    const breakdown: Array<{ factor: string; points: number }> = [];

    // 1. Age
    const age = data.age || 0;
    const agePts = age < 45 ? 0 : age < 55 ? 2 : age < 65 ? 3 : 4;
    score += agePts;
    breakdown.push({ factor: "Usia", points: agePts });

    // 2. BMI
    const bmi = data.bmi || 0;
    const bmiPts = bmi < 25 ? 0 : bmi < 30 ? 1 : 3;
    score += bmiPts;
    breakdown.push({ factor: "Indeks Massa Tubuh (BMI)", points: bmiPts });

    // 3. Waist circumference (Asian/International criteria)
    const waist = data.waist_cm || 0;
    const gender = data.gender?.toLowerCase() === "female" ? "female" : "male";
    let waistPts = 0;
    if (gender === "male") {
      waistPts = waist < 94 ? 0 : waist <= 102 ? 3 : 4;
    } else {
      waistPts = waist < 80 ? 0 : waist <= 88 ? 3 : 4;
    }
    score += waistPts;
    breakdown.push({ factor: "Lingkar Perut", points: waistPts });

    // 4. Daily fruits/vegetables
    const vegPts = data.eat_vegetables_daily ? 0 : 1;
    score += vegPts;
    breakdown.push({ factor: "Konsumsi Sayur & Buah Harian", points: vegPts });

    // 5. Physical activity
    const actPts = data.physical_activity ? 0 : 2;
    score += actPts;
    breakdown.push({ factor: "Aktivitas Fisik (min. 30 mnt/hari)", points: actPts });

    // 6. Blood pressure medication
    const htPts = data.hypertension_medication ? 2 : 0;
    score += htPts;
    breakdown.push({ factor: "Riwayat Obat Hipertensi", points: htPts });

    // 7. History of high blood glucose
    const hbgPts = data.high_blood_glucose_history ? 5 : 0;
    score += hbgPts;
    breakdown.push({ factor: "Riwayat Gula Darah Tinggi Pernah Terdeteksi", points: hbgPts });

    // 8. Family history
    const fam = data.family_history || "none";
    const famPts = fam === "none" ? 0 : fam === "extended" ? 3 : 5;
    score += famPts;
    breakdown.push({ factor: "Riwayat Diabetes dalam Keluarga", points: famPts });

    const { category, advice } = this.interpretFindrisc(score);

    return {
      score,
      category,
      breakdown,
      advice,
      suggested_questions: [
        "Bagaimana langkah pencegahan diabetes yang paling efektif untuk saya?",
        "Seberapa sering saya perlu melakukan screening tes gula darah?",
        "Apa saja gejala awal diabetes yang perlu diwaspadai?",
      ],
    };
  }

  private static interpretFindrisc(score: number): {
    category: "Rendah" | "Sedikit Meningkat" | "Sedang" | "Tinggi" | "Sangat Tinggi";
    advice: string;
  } {
    if (score < 7) {
      return {
        category: "Rendah",
        advice: "Risiko rendah (perkiraan 1 dari 100 orang berkembang menjadi DM dalam 10 tahun). Pertahankan pola hidup sehat dan lakukan skrining rutin tiap 3 tahun.",
      };
    }
    if (score < 12) {
      return {
        category: "Sedikit Meningkat",
        advice: "Risiko sedikit meningkat (1 dari 25 orang). Tingkatkan asupan serat, aktivitas fisik harian, dan lakukan skrining tahunan.",
      };
    }
    if (score < 15) {
      return {
        category: "Sedang",
        advice: "Risiko sedang (1 dari 6 orang). Sangat disarankan memeriksa gula darah puasa & HbA1c serta konsultasi pola hidup.",
      };
    }
    if (score < 21) {
      return {
        category: "Tinggi",
        advice: "Risiko tinggi (1 dari 3 orang). Sangat disarankan pemeriksaan laboratorium lengkap dan konsultasi dokter untuk langkah preventif.",
      };
    }
    return {
      category: "Sangat Tinggi",
      advice: "Risiko sangat tinggi (1 dari 2 orang). Segera jadwalkan pemeriksaan glukosa darah komprehensif dan konsultasikan dengan dokter spesialis.",
    };
  }
}

export class InteractionChecker {
  private static readonly INTERACTIONS: Record<string, { severity: "tinggi" | "sedang" | "ringan"; description: string }> = {
    "metformin|alkohol": {
      severity: "tinggi",
      description: "Konsumsi alkohol bersama metformin meningkatkan risiko asidosis laktat secara signifikan.",
    },
    "metformin|kontras iodine": {
      severity: "tinggi",
      description: "Penggunaan zat kontras radiologi saat mengonsumsi metformin berisiko memicu gagal ginjal akut dan asidosis laktat. Hentikan metformin 48 jam sebelum prosedur kontras sesuai arahan dokter.",
    },
    "glibenclamide|nsaid": {
      severity: "sedang",
      description: "Obat NSAID (ibuprofen, asam mefenamat, diklofenak) dapat meningkatkan konsentrasi sulfonilurea sehingga memperkuat risiko hipoglikemia.",
    },
    "glimepiride|nsaid": {
      severity: "sedang",
      description: "NSAID dapat memperkuat efek sulfonilurea dan memicu penurunan gula darah berlebih.",
    },
    "glibenclamide|warfarin": {
      severity: "tinggi",
      description: "Kombinasi meningkatkan risiko hipoglikemia berat sekaligus risiko perdarahan akibat pergeseran ikatan protein plasma. Perlu pemantauan INR ketat.",
    },
    "glibenclamide|beta blocker": {
      severity: "sedang",
      description: "Beta-blocker (bisoprolol, propranolol) dapat menutupi gejala peringatan hipoglikemia (seperti tremor dan takikardia).",
    },
    "insulin|beta blocker": {
      severity: "sedang",
      description: "Beta-blocker dapat menyamarkan gejala peringatan hipoglikemia (palpitasi, gemetar).",
    },
    "insulin|alkohol": {
      severity: "sedang",
      description: "Alkohol menghambat glukoneogenesis hepar dan meningkatkan risiko hipoglikemia berkepanjangan.",
    },
    "sglt2|diuretik": {
      severity: "sedang",
      description: "Kombinasi SGLT2 inhibitor (empagliflozin/dapagliflozin) dengan diuretik (furosemide/HCT) melipatgandakan efek diuresis, meningkatkan risiko dehidrasi dan hipotensi ortostatik.",
    },
    "metformin|cimetidine": {
      severity: "sedang",
      description: "Cimetidine menurunkan klirens ginjal dari metformin sehingga meningkatkan kadar metformin dalam plasma darah.",
    },
  };

  private static readonly ALIASES: Record<string, string> = {
    ibuprofen: "nsaid",
    "asam mefenamat": "nsaid",
    diclofenac: "nsaid",
    diklofenak: "nsaid",
    naproxen: "nsaid",
    ketorolac: "nsaid",
    meloxicam: "nsaid",
    propranolol: "beta blocker",
    atenolol: "beta blocker",
    bisoprolol: "beta blocker",
    carvedilol: "beta blocker",
    furosemide: "diuretik",
    furosemid: "diuretik",
    hidroklorotiazid: "diuretik",
    hct: "diuretik",
    spironolakton: "diuretik",
    empagliflozin: "sglt2",
    jardiance: "sglt2",
    dapagliflozin: "sglt2",
    forxiga: "sglt2",
    canagliflozin: "sglt2",
    glibenclamide: "glibenclamide",
    glimepiride: "glimepiride",
    amaryl: "glimepiride",
    metformin: "metformin",
    glucophage: "metformin",
    insulin: "insulin",
    novorapid: "insulin",
    lantus: "insulin",
    levemir: "insulin",
    humalog: "insulin",
    alkohol: "alkohol",
    alcohol: "alkohol",
    "kontras iodine": "kontras iodine",
    cimetidine: "cimetidine",
  };

  static check(medications: string[]) {
    if (!medications || medications.length === 0) {
      return {
        medications: [],
        interactions: [],
        has_interaction: false,
        advice: "Daftar obat kosong.",
        suggested_questions: [],
      };
    }

    const normalized = medications.map((m) => this.normalize(m));
    const found: Array<{ pair: [string, string]; severity: "tinggi" | "sedang" | "ringan"; description: string }> = [];

    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const a = normalized[i]!;
        const b = normalized[j]!;
        const key1 = `${a}|${b}`;
        const key2 = `${b}|${a}`;

        const match = this.INTERACTIONS[key1] || this.INTERACTIONS[key2];
        if (match) {
          found.push({
            pair: [medications[i]!, medications[j]!],
            severity: match.severity,
            description: match.description,
          });
        }
      }
    }

    return {
      medications,
      interactions: found,
      has_interaction: found.length > 0,
      advice: this.buildAdvice(found),
      suggested_questions: [
        "Kapan waktu terbaik minum masing-masing obat diabetes ini?",
        "Apa efek samping yang harus saya waspadai jika minum kombinasi obat ini?",
        "Apakah ada aturan konsumsi obat saat menjalani ibadah puasa?",
      ],
    };
  }

  private static normalize(med: string): string {
    const lower = med.toLowerCase().trim();
    for (const [alias, canonical] of Object.entries(this.ALIASES)) {
      if (lower.includes(alias)) {
        return canonical;
      }
    }
    return lower;
  }

  private static buildAdvice(found: Array<{ severity: string }>): string {
    if (found.length === 0) {
      return "Tidak ditemukan interaksi obat berbahaya yang terdeteksi dalam database. Tetap informasikan semua suplemen dan obat herbal yang Anda konsumsi kepada dokter/apoteker.";
    }
    const hasHigh = found.some((f) => f.severity === "tinggi");
    if (hasHigh) {
      return "PERHATIAN: Ditemukan interaksi tingkat TINGGI yang berpotensi membahayakan. Segera diskusikan dengan dokter spesialis atau apoteker Anda sebelum melanjutkan kombinasi obat ini.";
    }
    return "Ditemukan interaksi obat dengan perhatian khusus (tingkat sedang). Konsultasikan ke dokter untuk kemungkinan penyesuaian jadwal konsumsi atau pemantauan gula darah lebih berkala.";
  }
}

export interface PatientConditions {
  usia?: number;
  bmi?: number;
  sedang_hamil?: boolean;
  tipe_diabetes?: "tipe1" | "tipe2" | "gestasional" | string;
  egfr_di_bawah_30?: boolean;
  egfr_di_bawah_20?: boolean;
  gangguan_ginjal?: boolean;
  gagal_jantung?: boolean;
  asidosis?: boolean;
  ketoasidosis?: boolean;
  penyakit_kardiovaskular?: boolean;
  alergi?: string;
}

export class ContraindicationChecker {
  private static readonly ABSOLUTE_CONTRAINDICATIONS: Record<string, string[]> = {
    metformin: ["gangguan_ginjal_berat", "asidosis_metabolik", "gagal_jantung_berat", "kehamilan"],
    sulfonilurea: ["dm_tipe_1", "kehamilan", "alergi_sulfonamid", "gangguan_ginjal_berat"],
    dpp4_inhibitor: [],
    sglt2_inhibitor: ["egfr_di_bawah_20", "ketoasidosis", "kehamilan"],
    insulin: [],
  };

  private static readonly CONDITION_WARNINGS: Record<string, Record<string, string>> = {
    lansia: {
      sulfonilurea: "Risiko hipoglikemia berat tinggi pada lansia. Sebaiknya hindari jika memungkinkan.",
      insulin: "Perlu pemantauan glukosa mandiri yang ketat karena risiko hipoglikemia tidak disadari.",
    },
    obesitas: {
      sulfonilurea: "Dapat memicu peningkatan berat badan.",
      insulin: "Dapat memicu peningkatan berat badan, pertimbangkan kombinasi dengan agen penurun BB (SGLT2i/GLP-1).",
    },
    kehamilan: {
      metformin: "Hanya insulin yang merupakan standar terapi aman lini pertama pada kehamilan/diabetes gestasional.",
      sulfonilurea: "KONTRAINDIKASI pada masa kehamilan.",
      dpp4_inhibitor: "KONTRAINDIKASI pada masa kehamilan.",
      sglt2_inhibitor: "KONTRAINDIKASI pada masa kehamilan.",
    },
    gangguan_ginjal: {
      metformin: "Perlu penyesuaian dosis. Kontraindikasi mutlak jika eGFR < 30 mL/min/1.73m².",
      sulfonilurea: "Klirens obat menurun, risiko hipoglikemia meningkat tajam.",
      sglt2_inhibitor: "Efikasi penurunan glukosa menurun drastis jika eGFR < 20 mL/min.",
    },
    penyakit_kardiovaskular: {
      sulfonilurea: "Pilihan lini kedua, pertimbangkan agen dengan manfaat kardiovaskular terbukti (SGLT2i / GLP-1 RA).",
    },
  };

  static check(proposedMedications: string[], patientConditions: PatientConditions) {
    const results = {
      safe_medications: [] as string[],
      contraindicated: [] as Array<{ medication: string; reasons: string[] }>,
      warnings: [] as Array<{ medication: string; warnings: string[] }>,
      recommendations: [] as string[],
    };

    for (const med of proposedMedications) {
      const medKey = this.normalizeMedName(med);
      const contraindications = this.checkAbsolute(medKey, patientConditions);

      if (contraindications.length > 0) {
        results.contraindicated.push({
          medication: med,
          reasons: contraindications,
        });
        continue;
      }

      const warnings = this.checkWarnings(medKey, patientConditions);
      if (warnings.length > 0) {
        results.warnings.push({
          medication: med,
          warnings,
        });
      }

      results.safe_medications.push(med);
    }

    results.recommendations = this.generateRecommendations(patientConditions);
    return results;
  }

  private static normalizeMedName(med: string): string {
    const lower = med.toLowerCase();
    if (lower.includes("metformin") || lower.includes("biguanid")) return "metformin";
    if (
      lower.includes("glibenclamide") ||
      lower.includes("glimepiride") ||
      lower.includes("gliclazide") ||
      lower.includes("sulfonilurea") ||
      lower.includes("sulfonylurea")
    ) {
      return "sulfonilurea";
    }
    if (
      lower.includes("sitagliptin") ||
      lower.includes("vildagliptin") ||
      lower.includes("linagliptin") ||
      lower.includes("saxagliptin") ||
      lower.includes("dpp4") ||
      lower.includes("dpp-4") ||
      lower.includes("gliptin")
    ) {
      return "dpp4_inhibitor";
    }
    if (
      lower.includes("empagliflozin") ||
      lower.includes("dapagliflozin") ||
      lower.includes("canagliflozin") ||
      lower.includes("sglt2") ||
      lower.includes("sglt-2") ||
      lower.includes("gliflozin")
    ) {
      return "sglt2_inhibitor";
    }
    if (
      lower.includes("insulin") ||
      lower.includes("glargine") ||
      lower.includes("detemir") ||
      lower.includes("aspart") ||
      lower.includes("lispro") ||
      lower.includes("nph")
    ) {
      return "insulin";
    }
    return lower;
  }

  private static checkAbsolute(medKey: string, conditions: PatientConditions): string[] {
    const contraindications: string[] = [];
    const absList = this.ABSOLUTE_CONTRAINDICATIONS[medKey] || [];

    for (const contra of absList) {
      if (contra === "kehamilan" && conditions.sedang_hamil) {
        contraindications.push("Kehamilan (kontraindikasi terapi oral)");
      } else if (contra === "dm_tipe_1" && conditions.tipe_diabetes === "tipe1") {
        contraindications.push("Diabetes Melitus Tipe 1 (wajib insulin eksogen)");
      } else if (contra === "alergi_sulfonamid" && conditions.alergi?.toLowerCase().includes("sulfonamid")) {
        contraindications.push("Riwayat alergi antibiotik/komponen sulfonamid");
      } else if (contra === "gangguan_ginjal_berat" && (conditions.egfr_di_bawah_30 || conditions.gangguan_ginjal)) {
        contraindications.push("Gangguan fungsi ginjal berat (eGFR < 30 mL/min)");
      } else if (contra === "asidosis_metabolik" && conditions.asidosis) {
        contraindications.push("Riwayat/kondisi asidosis metabolik");
      } else if (contra === "gagal_jantung_berat" && conditions.gagal_jantung) {
        contraindications.push("Gagal jantung kongestif berat (NYHA Class III-IV)");
      } else if (contra === "egfr_di_bawah_20" && conditions.egfr_di_bawah_20) {
        contraindications.push("eGFR < 20 mL/min");
      } else if (contra === "ketoasidosis" && conditions.ketoasidosis) {
        contraindications.push("Ketoasidosis diabetik (KAD)");
      }
    }

    return contraindications;
  }

  private static checkWarnings(medKey: string, conditions: PatientConditions): string[] {
    const warnings: string[] = [];

    if ((conditions.usia ?? 0) >= 65) {
      const lansiaWarn = this.CONDITION_WARNINGS.lansia?.[medKey];
      if (lansiaWarn) warnings.push(`[Lansia] ${lansiaWarn}`);
    }

    if ((conditions.bmi ?? 0) >= 25) {
      const obesWarn = this.CONDITION_WARNINGS.obesitas?.[medKey];
      if (obesWarn) warnings.push(`[Obesitas] ${obesWarn}`);
    }

    if (conditions.sedang_hamil) {
      const hamilWarn = this.CONDITION_WARNINGS.kehamilan?.[medKey];
      if (hamilWarn) warnings.push(`[Kehamilan] ${hamilWarn}`);
    }

    if (conditions.gangguan_ginjal) {
      const ginjalWarn = this.CONDITION_WARNINGS.gangguan_ginjal?.[medKey];
      if (ginjalWarn) warnings.push(`[Ginjal] ${ginjalWarn}`);
    }

    if (conditions.penyakit_kardiovaskular) {
      const cvWarn = this.CONDITION_WARNINGS.penyakit_kardiovaskular?.[medKey];
      if (cvWarn) warnings.push(`[Kardiovaskular] ${cvWarn}`);
    }

    return warnings;
  }

  private static generateRecommendations(conditions: PatientConditions): string[] {
    const recs: string[] = [];

    if (conditions.sedang_hamil) {
      recs.push("Pasien hamil: INSULIN adalah terapi lini pertama yang paling aman.");
    }
    if ((conditions.usia ?? 0) >= 65) {
      recs.push("Pasien lansia: Hindari sulfonilurea dengan masa kerja panjang, pertimbangkan DPP-4i (mis. Linagliptin).");
    }
    if ((conditions.bmi ?? 0) >= 25) {
      recs.push("Pasien overweight/obesitas: Kombinasi Metformin dengan SGLT-2 inhibitor / GLP-1 RA sangat disukai karena efek penurunan berat badan.");
    }
    if (conditions.penyakit_kardiovaskular) {
      recs.push("Pasien dengan riwayat kardiovaskular: Pilih agen terbukti kardioprotektif (SGLT2i seperti Empagliflozin/Dapagliflozin).");
    }
    if (conditions.gangguan_ginjal) {
      recs.push("Pasien dengan gangguan ginjal: Linagliptin tidak memerlukan penyesuaian dosis renal pada semua tahap CKD.");
    }
    if (conditions.tipe_diabetes === "tipe1") {
      recs.push("Pasien DM Tipe 1: Terapi insulin basal-bolus mutlak wajib diberikan.");
    }

    return recs;
  }
}
