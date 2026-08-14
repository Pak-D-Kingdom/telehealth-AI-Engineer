import { prisma } from "../lib/prisma";
import { sendChatCompletion } from "../services/ai.service";

const FOLLOWUP_SYSTEM_PROMPT = `You are a caring diabetes healthcare assistant for GlucoCare.
Your goal is to send a warm, empathetic, 1-2 sentence proactive follow-up message to a patient you talked to previously.
Based on the provided conversation history, ask how they are feeling today, mention their specific symptom/topic (e.g. blood sugar, wound, medication), and invite them to update you.
Keep it strictly under 40 words, friendly, professional, and in Indonesian.`;

export async function runProactiveFollowUp() {
  console.log("[Follow-up Cron] Checking for idle chat sessions needing follow-up...");

  try {
    // Find sessions that have been active and had messages
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 mins for demo/simulations

    const candidateSessions = await prisma.chatSession.findMany({
      where: {
        status: "ACTIVE",
        updatedAt: { lte: cutoffTime },
        messages: {
          some: {},
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
      },
      take: 10,
    });

    for (const session of candidateSessions) {
      if (session.messages.length < 2) continue;

      const latestMsg = session.messages[0];
      // Skip if the latest message was already a proactive follow-up
      if (latestMsg && latestMsg.content.includes("👉 *Pesan Tindak Lanjut Otomatis*")) {
        continue;
      }

      const historySummary = session.messages
        .reverse()
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      try {
        const followUpText = await sendChatCompletion(
          [
            {
              role: "user",
              content: `Berikut adalah riwayat percakapan pasien:\n${historySummary}\n\nBuatkan pesan sapaan tindak lanjut (follow-up) proaktif singkat untuk pasien ini.`,
            },
          ],
          FOLLOWUP_SYSTEM_PROMPT,
          {
            temperature: 0.5,
            maxTokens: 100,
          },
        );

        const finalMessage = `👉 *Pesan Tindak Lanjut Otomatis*\n\n${followUpText}`;

        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "ASSISTANT",
            content: finalMessage,
          },
        });

        // Update session's updatedAt timestamp
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        });

        console.log(`[Follow-up Cron] Proactive message sent to session ${session.id}`);
      } catch (err) {
        console.error(`[Follow-up Cron] Failed to generate follow-up for session ${session.id}:`, err);
      }
    }
  } catch (error) {
    console.error("[Follow-up Cron] Error running follow-up job:", error);
  }
}

/**
 * Initializes recurring interval timer for the follow-up agent.
 */
export function initFollowUpCron() {
  console.log("[Follow-up Cron] Proactive Follow-up Agent initialized.");
  
  // Run once on startup (after 5 seconds), then every 1 hour (3600000 ms)
  setTimeout(() => {
    runProactiveFollowUp().catch(console.error);
  }, 5000);

  setInterval(() => {
    runProactiveFollowUp().catch(console.error);
  }, 60 * 60 * 1000);
}
