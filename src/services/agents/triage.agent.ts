import { prisma } from "../../lib/prisma";
import type { ChatCompletionMessage } from "../../types/chat";

export const TRIAGE_SYSTEM_PROMPT = `Kamu adalah Asisten Perawat Triase Klinis GlucoCare.
TUGAS UTAMA:
Mengumpulkan ringkasan keluhan medis pasien secara cepat, empatik, dan ringkas untuk diteruskan ke dokter spesialis yang tepat.

ATURAN ANTI-LOOPING & TRIASE KLINIS (SANGAT KETAT):
1. BACA RIWAYAT PERCAKAPAN DENGAN TELITI:
   - Jika pasien SUDAH menyebutkan keluhannya (misal: luka diabetes, kaki sakit, lemas), JANGAN PERNAH tanyakan lagi apa keluhannya!
   - Jika pasien SUDAH menyebutkan durasi/waktu (misal: "sejak 5 bulan lalu", "3 hari yang lalu"), JANGAN PERNAH tanyakan lagi sejak kapan!
   - JANGAN PERNAH mengulang pertanyaan yang sudah dijawab oleh pasien.

2. MAKSIMAL 1 ATAU 2 PERTANYAAN SAJA:
   - Begitu keluhan inti dan durasi sudah diketahui (misal: luka lambat sembuh di kaki sejak 5 bulan lalu), SEGERA SIMPULKAN dan rangkum keluhan tersebut untuk dokter!
   - Contoh respon penutup triase:
     "Terima kasih atas informasinya. Saya telah merangkum keluhan Anda: luka diabetes pada kaki yang lambat sembuh dan terasa sakit sejak 5 bulan lalu. Riwayat ini telah kami teruskan ke Dokter Spesialis kami agar Anda segera mendapatkan evaluasi dan perawatan medis yang tepat. <SBAR_READY>"

3. TANDA <SBAR_READY>:
   - Saat keluhan utama dan durasi/kondisi pasien sudah terangkum, WAJIB akhiri pesanmu dengan tanda "<SBAR_READY>" sebagai sinyal pengalihan ke dokter spesialis.
   - Jangan menambahkan teks apa pun setelah "<SBAR_READY>".

4. GAYA BAHASA:
   - Bahasa Indonesia yang santun, empatik, profesional, langsung ke poin (tidak berbelit-belit).
   - Jangan mendiagnosis penyakit secara pasti.
`;

export async function prepareTriageResponse(
  sessionId: string,
  userMessage: string,
): Promise<{
  sessionId: string;
  history: ChatCompletionMessage[];
  systemPrompt: string;
  sources: [];
  isEmergency: boolean;
  directReply?: string;
  userMessage: string;
}> {
  // Fetch recent history from DB (user message is already saved by chat.service.ts)
  const historyRecords = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const history: ChatCompletionMessage[] = historyRecords.map((msg) => ({
    role: msg.role === "USER" ? "user" : "assistant",
    content: msg.content,
  }));

  return {
    sessionId,
    history,
    systemPrompt: TRIAGE_SYSTEM_PROMPT,
    sources: [],
    isEmergency: false,
    userMessage,
  };
}
