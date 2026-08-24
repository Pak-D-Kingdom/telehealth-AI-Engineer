import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { env } from "../src/config/env";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const retentionCutoff = new Date(
    Date.now() - env.BOOKING_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  );
  const bookings = await prisma.consultationBooking.findMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
      anonymizedAt: null,
      OR: [
        { deletionRequestedAt: { not: null } },
        { updatedAt: { lt: retentionCutoff } },
      ],
    },
    select: { id: true, status: true, deletionRequestedAt: true },
  });

  if (dryRun) {
    console.log(
      `${bookings.length} booking memenuhi syarat anonimisasi; tidak ada data yang diubah (dry-run).`,
    );
    return;
  }

  for (const booking of bookings) {
    await prisma.$transaction([
      prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          actorType: "SYSTEM",
          actorLabel: "Sistem retensi data",
          action: "DATA_ANONYMIZED",
          previousStatus: booking.status,
          newStatus: booking.status,
          details: {
            reason: booking.deletionRequestedAt
              ? "PATIENT_REQUEST"
              : "RETENTION_PERIOD",
          },
        },
      }),
      prisma.consultationBooking.update({
        where: { id: booking.id },
        data: {
          patientName: "Data telah dihapus",
          whatsapp: "ANONYMIZED",
          complaint: null,
          preConsultationSummary: Prisma.DbNull,
          anonymizedAt: new Date(),
          sessionId: null,
        },
      }),
    ]);
  }

  console.log(
    `${bookings.length} booking telah dianonimkan sesuai kebijakan retensi.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
