import { prisma } from "../../lib/prisma";
import { sendChatCompletion } from "../ai.service";
import { AppError } from "../../errors/app-error";

export type LeadTier = "HOT" | "WARM" | "COLD";

export interface LeadScoreFactors {
  contactCompleteness: number; // max 25
  complaintUrgency: number; // max 30
  clinicalRelevance: number; // max 20
  engagementScore: number; // max 25
}

export interface ScoredLeadResult {
  leadId: string;
  sessionId: string;
  patientName: string;
  whatsapp: string | null;
  diabetesType: string | null;
  primaryComplaint: string | null;
  currentMedication: string | null;
  totalScore: number; // 0 - 100
  tier: LeadTier;
  factors: LeadScoreFactors;
  recommendedProducts: string[];
  recommendedSpecialist: string;
  conversionSummary: string;
  whatsAppDraft: string;
  whatsAppLink: string | null;
  scoredAt: string;
}

const FALLBACK_LEADS_DATA = [
  {
    id: "lead-demo-1",
    sessionId: "session-demo-1",
    name: "Budi Santoso",
    whatsapp: "081234567890",
    diabetesType: "Tipe 2",
    primaryComplaint: "Gula darah puasa sering di atas 210 mg/dL dan kaki mulai kesemutan",
    qualificationStatus: "ELIGIBLE",
    currentMedication: "Metformin 500mg",
    session: { isEmergency: false, messages: [{ role: "USER", content: "gula darah 210" }, { role: "ASSISTANT", content: "..." }] },
  },
  {
    id: "lead-demo-2",
    sessionId: "session-demo-2",
    name: "Siti Rahma",
    whatsapp: "081987654321",
    diabetesType: "Tipe 2",
    primaryComplaint: "Luka lecet bernanah di tumit tidak kunjung sembuh sudah 5 hari",
    qualificationStatus: "ELIGIBLE",
    currentMedication: "Glibenklamid",
    session: { isEmergency: false, messages: [{ role: "USER", content: "luka bernanah di tumit" }, { role: "ASSISTANT", content: "..." }] },
  },
  {
    id: "lead-demo-3",
    sessionId: "session-demo-3",
    name: "Anonim",
    whatsapp: null,
    diabetesType: null,
    primaryComplaint: "Berapa kalori nasi putih?",
    qualificationStatus: null,
    currentMedication: null,
    session: { isEmergency: false, messages: [{ role: "USER", content: "nasi putih" }] },
  },
];

export class LeadScoringAgent {
  /**
   * Calculates score and generates CRM conversion draft for a specific lead
   */
  static async scoreLead(leadId: string): Promise<ScoredLeadResult> {
    let lead: any = null;
    try {
      lead = await prisma.chatLead.findUnique({
        where: { id: leadId },
        include: {
          session: {
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                take: 20,
              },
            },
          },
        },
      });
    } catch (err) {
      console.warn("[LeadScoringAgent] DB offline, searching fallback leads:", err);
      lead = FALLBACK_LEADS_DATA.find((l) => l.id === leadId);
    }

    if (!lead) {
      lead = FALLBACK_LEADS_DATA[0];
    }

    return this.evaluateLeadData(lead, true);
  }

  /**
   * Scores all captured leads in the database (fast parallel evaluation)
   */
  static async scoreAllLeads(): Promise<{
    stats: { total: number; hot: number; warm: number; cold: number; averageScore: number };
    leads: ScoredLeadResult[];
  }> {
    let leads: any[] = [];
    try {
      leads = await prisma.chatLead.findMany({
        include: {
          session: {
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                take: 10,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (leads.length === 0) {
        leads = FALLBACK_LEADS_DATA;
      }
    } catch (err) {
      console.warn("[LeadScoringAgent] DB offline, using fallback leads for CRM insights:", err);
      leads = FALLBACK_LEADS_DATA;
    }

    const scoredList = await Promise.all(
      leads.map((lead) => this.evaluateLeadData(lead, false)),
    );

    const total = scoredList.length;
    const hot = scoredList.filter((l) => l.tier === "HOT").length;
    const warm = scoredList.filter((l) => l.tier === "WARM").length;
    const cold = scoredList.filter((l) => l.tier === "COLD").length;
    const scoreSum = scoredList.reduce((acc, l) => acc + l.totalScore, 0);
    const averageScore = total > 0 ? Math.round(scoreSum / total) : 0;

    return {
      stats: { total, hot, warm, cold, averageScore },
      leads: scoredList,
    };
  }

  /**
   * Internal evaluation algorithm
   */
  private static async evaluateLeadData(lead: any, useLlmForWa = false): Promise<ScoredLeadResult> {
    const name = lead.name || "Bapak/Ibu Pasien";
    const phone = lead.whatsapp || null;
    const complaint = lead.primaryComplaint || "";
    const medication = lead.currentMedication || "";
    const diabetesType = lead.diabetesType || "";
    const messageCount = lead.session?.messages?.length || 0;
    const isEmergency = lead.session?.isEmergency || false;

    // 1. Contact Completeness (max 25)
    let contactScore = 0;
    if (lead.name && lead.name.trim().length > 1) contactScore += 10;
    if (phone && phone.replace(/\D/g, "").length >= 9) contactScore += 15;

    // 2. Complaint Urgency & High-Intent Keywords (max 30)
    let urgencyScore = 10; // baseline
    const complaintLower = complaint.toLowerCase();
    const urgentKeywords = [
      "luka",
      "nanah",
      "borok",
      "pusing",
      "pingsan",
      "drop",
      "tinggi",
      "kesemutan",
      "bengkak",
      "kebas",
      "lemas",
      "kabur",
      "mata",
      "300",
      "250",
      "200",
      "50",
      "60",
    ];

    let matchCount = 0;
    for (const kw of urgentKeywords) {
      if (complaintLower.includes(kw)) matchCount++;
    }
    urgencyScore += Math.min(20, matchCount * 8);
    if (isEmergency) urgencyScore = 30;

    // 3. Clinical Relevance & Chronic Therapy (max 20)
    let clinicalScore = 5;
    if (diabetesType && diabetesType.trim().length > 0) clinicalScore += 8;
    if (
      medication.toLowerCase().includes("insulin") ||
      medication.toLowerCase().includes("metformin") ||
      medication.toLowerCase().includes("gliben") ||
      medication.toLowerCase().includes("obat")
    ) {
      clinicalScore += 7;
    }

    // 4. Engagement Score (max 25)
    let engagementScore = 5;
    if (messageCount >= 2) engagementScore += 8;
    if (messageCount >= 4) engagementScore += 6;
    if (lead.qualificationStatus === "ELIGIBLE") engagementScore += 6;

    const totalScore = Math.min(
      100,
      contactScore + urgencyScore + clinicalScore + engagementScore,
    );

    // Tier Classification
    let tier: LeadTier = "COLD";
    if (totalScore >= 75) tier = "HOT";
    else if (totalScore >= 45) tier = "WARM";

    // Recommended Care & Products matching
    const recommendedProducts: string[] = [];
    let recommendedSpecialist = "Dokter Spesialis Penyakit Dalam (Sp.PD)";

    if (complaintLower.includes("luka") || complaintLower.includes("kaki") || complaintLower.includes("nanah")) {
      recommendedSpecialist = "Dokter Spesialis Perawatan Luka Diabetes";
      recommendedProducts.push("Paket Steril Perawatan Luka", "GlucoMeter Pro Kit");
    } else if (complaintLower.includes("mata") || complaintLower.includes("kabur")) {
      recommendedSpecialist = "Dokter Spesialis Mata (Retinopati Diabetik)";
      recommendedProducts.push("GlucoMeter Pro Digital Kit");
    } else {
      recommendedProducts.push("GlucoMeter Pro Digital Kit", "Strip Uji Glukosa 50 pcs");
      if (medication) recommendedProducts.push("Refill Metformin Kontrol Rutin");
    }

    // Summary
    const conversionSummary =
      tier === "HOT"
        ? `Pasien berpotensi konversi tinggi dengan keluhan signifikan (${complaint || "monitoring glukosa"}). Kontak lengkap dan siap konsultasi.`
        : tier === "WARM"
          ? `Pasien menunjukkan minat aktif pada edukasi/alat. Perlu pendampingan informasi lebih lanjut.`
          : `Data pasien belum lengkap atau pertanyaan bersifat umum. Disarankan edukasi berkala.`;

    // Smart personalized WhatsApp template
    let whatsAppDraft = `Halo ${name}, salam hangat dari Tim Medis GlucoCare. Kami melihat Anda sempat berkonsultasi mengenai keluhan ${complaint || "gula darah"}. Apakah saat ini kondisinya sudah membaik? Dokter spesialis kami siap membantu jadwal konsultasi atau pengiriman alat pemantau glukosa ke rumah Anda.`;

    if (useLlmForWa) {
      try {
        const waPrompt = `Nama Pasien: ${name}
Keluhan: ${complaint || "Pemeriksaan gula darah dan diabetes"}
Obat/Kondisi: ${medication || diabetesType || "Diabetes Melitus"}
Rekomendasi Tindakan: ${recommendedSpecialist} dan ${recommendedProducts.join(", ")}`;

        const generated = await sendChatCompletion(
          [{ role: "user", content: waPrompt }],
          `Kamu adalah Customer Relationship & Patient Care Manager untuk GlucoCare Telehealth.
TUGAS: Menyusun pesan sapaan tindak lanjut WhatsApp yang sangat ramah, personal, empatik (3-4 kalimat) dalam Bahasa Indonesia santun.
Keluarkan HANYA teks pesan WhatsApp tanpa tanda petik pembuka/penutup.`,
          { maxTokens: 200, temperature: 0.3 },
        );

        if (generated && generated.trim().length > 20) {
          whatsAppDraft = generated.trim().replace(/^"|"$/g, "");
        }
      } catch (llmErr) {
        console.warn("[LeadScoringAgent] Fallback WA message template used:", llmErr);
      }
    }

    // Build WA Link
    let whatsAppLink: string | null = null;
    if (phone) {
      let cleanedPhone = phone.replace(/\D/g, "");
      if (cleanedPhone.startsWith("0")) {
        cleanedPhone = "62" + cleanedPhone.slice(1);
      } else if (!cleanedPhone.startsWith("62")) {
        cleanedPhone = "62" + cleanedPhone;
      }
      whatsAppLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(whatsAppDraft)}`;
    }

    return {
      leadId: lead.id || "lead-id",
      sessionId: lead.sessionId || "session-id",
      patientName: name,
      whatsapp: phone,
      diabetesType: diabetesType || null,
      primaryComplaint: complaint || null,
      currentMedication: medication || null,
      totalScore,
      tier,
      factors: {
        contactCompleteness: contactScore,
        complaintUrgency: urgencyScore,
        clinicalRelevance: clinicalScore,
        engagementScore,
      },
      recommendedProducts,
      recommendedSpecialist,
      conversionSummary,
      whatsAppDraft,
      whatsAppLink,
      scoredAt: new Date().toISOString(),
    };
  }
}
