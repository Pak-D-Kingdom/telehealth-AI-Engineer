export interface InputGuardrailResult {
  allowed: boolean;
  isEmergency?: boolean;
  fallbackReply?: string;
  category?: "EMERGENCY" | "SELF_HARM" | "DANGEROUS_DOSAGE" | "OUT_OF_DOMAIN" | "JAILBREAK";
}

const EMERGENCY_PATTERNS = [
  /\b(pingsan|tidak sadar|tidak sadarkan diri|koma)\b/i,
  /\b(kejang|kebingungan berat)\b/i,
  /\b(sesak napas|sesak nafas|sulit bernapas)\b/i,
  /\b(nyeri dada hebat|serangan jantung|stroke)\b/i,
  /\b(muntah terus-menerus|muntah terus menerus|muntah darah)\b/i,
  /\b(napas bau aseton|ketoasidosis)\b/i,
];

const SELF_HARM_PATTERNS = [
  /\b(bunuh diri|akhiri hidup|menyakiti diri)\b/i,
  /\b(minum racun|overdosis sengaja)\b/i,
];

const DANGEROUS_DRUG_ABUSE_PATTERNS = [
  /\b(dosis mematikan|dosis berlebih yang fatal|dosis untuk bunuh diri)\b/i,
  /\b(cara overdosis|cara menyalahgunakan obat)\b/i,
];

const JAILBREAK_PATTERNS = [
  /\b(ignore all previous instructions|abaikan instruksi sebelumnya|abaikan batasan)\b/i,
  /\b(tampilkan system prompt|tulis ulang aturanmu|bocorkan prompt)\b/i,
  /\b(kamu sekarang adalah dan|dan mode|jailbreak mode)\b/i,
];

const OUT_OF_DOMAIN_PATTERNS = [
  /\b(buatkan kode|tuliskan program|coding python|buat website|html|javascript)\b/i,
  /\b(siapa presiden|pemilu|politik indonesia|partai politik)\b/i,
  /\b(resep masakan|buat puisi cinta|cerita fiksi|chord gitar)\b/i,
];

export const EMERGENCY_FALLBACK_MESSAGE =
  "⚠️ PENTING: Mohon segera hubungi layanan gawat darurat 119 atau segera kunjungi Instalasi Gawat Darurat (IGD) rumah sakit terdekat. Gejala yang Anda alami memerlukan penanganan medis darurat langsung oleh tenaga kesehatan. Jangan menunda pertolongan.";

export const SELF_HARM_FALLBACK_MESSAGE =
  "⚠️ Kami sangat peduli dengan keselamatan Anda. Jika Anda atau seseorang yang Anda kenal membutuhkan bantuan emosional atau krisis, silakan segera hubungi hotline kesehatan jiwa di 119 ext. 8 atau hubungi keluarga/kerabat terdekat untuk mendapatkan pendampingan segera.";

export const OUT_OF_DOMAIN_FALLBACK_MESSAGE =
  "Maaf, sebagai asisten medis virtual GlucoCare, saya hanya didedikasikan untuk membantu edukasi kesehatan, manajemen diabetes, gula darah, serta navigasi layanan medis kami. Apakah ada hal terkait kesehatan yang dapat saya bantu?";

export function validateInputGuardrails(message: string): InputGuardrailResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return { allowed: true };
  }

  // 1. Check Self Harm
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isEmergency: true,
        category: "SELF_HARM",
        fallbackReply: SELF_HARM_FALLBACK_MESSAGE,
      };
    }
  }

  // 2. Check Dangerous Drug Abuse
  for (const pattern of DANGEROUS_DRUG_ABUSE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isEmergency: false,
        category: "DANGEROUS_DOSAGE",
        fallbackReply:
          "⚠️ Peringatan: GlucoCare tidak dapat memberikan informasi terkait dosis berbahaya atau penyalahgunaan obat. Penggunaan obat harus selalu berada di bawah petunjuk dan pengawasan dokter resmi.",
      };
    }
  }

  // 3. Check Medical Emergency
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isEmergency: true,
        category: "EMERGENCY",
        fallbackReply: EMERGENCY_FALLBACK_MESSAGE,
      };
    }
  }

  // 4. Check Jailbreak Attempts
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isEmergency: false,
        category: "JAILBREAK",
        fallbackReply:
          "Maaf, saya tidak dapat memenuhi permintaan tersebut. Saya tetap beroperasi sebagai asisten medis edukasi GlucoCare.",
      };
    }
  }

  // 5. Check Out of Domain (if completely unrelated)
  for (const pattern of OUT_OF_DOMAIN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isEmergency: false,
        category: "OUT_OF_DOMAIN",
        fallbackReply: OUT_OF_DOMAIN_FALLBACK_MESSAGE,
      };
    }
  }

  return { allowed: true };
}

export function validateOutputGuardrails(reply: string): string {
  let sanitized = reply;

  // Detect and sanitize definite absolute cure claims
  sanitized = sanitized.replace(
    /\b(pasti sembuh total|100% sembuh permanen|dijamin sembuh total dari diabetes)\b/gi,
    "dapat dikontrol dengan baik melalui pengelolaan yang tepat",
  );

  return sanitized;
}
