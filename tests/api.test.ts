import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { upsertKnowledgeDocument } from "../src/services/rag.service";
import { findRelatedCareOptions } from "../src/services/care-catalog.service";
import {
  CHAT_SESSION_COOKIE_NAME,
  hashChatSessionToken,
} from "../src/utils/chat-session";

let server: Server;
let baseUrl: string;
let sessionCookie = "";
let chatCookie = "";
let createdProductId: string | undefined;
let createdDoctorId: string | undefined;
let createdChatSessionId: string | undefined;
let createdClinicId: string | undefined;
const createdScheduleIds: string[] = [];
let createdBookingId: string | undefined;
const testKnowledgeSource = "integration-test-knowledge.md";

async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const cookies = [sessionCookie, chatCookie].filter(Boolean);
  if (cookies.length > 0) {
    headers.set("cookie", cookies.join("; "));
  }

  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: process.env.ADMIN_EMAIL?.toLowerCase() },
  });

  if (!admin) {
    throw new Error("Admin seed tidak ditemukan. Jalankan `bun run db:seed`.");
  }

  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await prisma.$executeRaw`DELETE FROM "knowledge_base" WHERE "source" = ${testKnowledgeSource}`;
  if (createdBookingId || createdScheduleIds.length > 0) {
    await prisma.consultationBooking.deleteMany({
      where: {
        OR: [
          ...(createdBookingId ? [{ id: createdBookingId }] : []),
          ...(createdScheduleIds.length > 0
            ? [{ slotId: { in: createdScheduleIds } }]
            : []),
        ],
      },
    });
  }
  if (createdScheduleIds.length > 0) {
    await prisma.doctorScheduleSlot.deleteMany({
      where: { id: { in: createdScheduleIds } },
    });
  }
  if (createdClinicId) {
    await prisma.clinic.deleteMany({ where: { id: createdClinicId } });
  }
  if (createdDoctorId) {
    await prisma.doctor.deleteMany({ where: { id: createdDoctorId } });
  }
  if (createdProductId) {
    await prisma.product.deleteMany({ where: { id: createdProductId } });
  }
  if (createdChatSessionId) {
    await prisma.chatSession.deleteMany({
      where: { id: createdChatSessionId },
    });
  }
  await prisma.userSession.deleteMany();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

describe("Telehealth API", () => {
  test("health dan data publik tersedia", async () => {
    const healthResponse = await apiRequest("/health");
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toMatchObject({
      status: "ok",
      database: "connected",
    });

    const productsResponse = await apiRequest("/api/products");
    const productsBody = (await productsResponse.json()) as {
      data: unknown[];
      meta: { total: number };
    };
    expect(productsResponse.status).toBe(200);
    expect(productsBody.data.length).toBeGreaterThanOrEqual(4);
    expect(productsBody.meta.total).toBeGreaterThanOrEqual(4);

    const doctorsResponse = await apiRequest("/api/doctors");
    const doctorsBody = (await doctorsResponse.json()) as { data: unknown[] };
    expect(doctorsResponse.status).toBe(200);
    expect(doctorsBody.data.length).toBeGreaterThanOrEqual(4);
  });

  test("pgvector menyimpan knowledge base secara idempotent", async () => {
    const embedding = Array.from({ length: 3_072 }, (_, index) =>
      index === 0 ? 1 : 0,
    );

    await upsertKnowledgeDocument({
      title: "Knowledge Integration Test",
      content: "Versi pertama.",
      source: testKnowledgeSource,
      embedding,
    });
    await upsertKnowledgeDocument({
      title: "Knowledge Integration Test Diperbarui",
      content: "Versi kedua.",
      source: testKnowledgeSource,
      embedding,
    });

    const rows = await prisma.$queryRaw<
      Array<{ title: string; dimensions: number }>
    >`
      SELECT "title", vector_dims("embedding") AS "dimensions"
      FROM "knowledge_base"
      WHERE "source" = ${testKnowledgeSource}
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Knowledge Integration Test Diperbarui");
    expect(rows[0]?.dimensions).toBe(3_072);
  });

  test("route admin menolak request tanpa session", async () => {
    const response = await apiRequest("/api/admin/products");
    expect(response.status).toBe(401);
    expect((await apiRequest("/api/admin/chat/sessions")).status).toBe(401);
  });

  test("permintaan obat diabetes menghasilkan produk dan dokter terkait dari katalog aktif", async () => {
    const related = await findRelatedCareOptions(
      "Rekomendasikan obat untuk diabetes tipe 2 dan dokter yang bisa saya konsultasikan.",
    );

    expect(
      related?.products.some((product) => /metformin/i.test(product.name)),
    ).toBe(true);
    expect(
      related?.products.find((product) => /metformin/i.test(product.name))
        ?.requiresPrescription,
    ).toBe(true);
    expect(related?.doctors.length).toBeGreaterThan(0);
    expect(related?.disclaimer).toContain("bukan diagnosis");
    expect(related?.suggestedReplies.length).toBeGreaterThan(0);
  });

  test("pasien dapat mengecek, mengubah, dan membatalkan booking dengan audit lengkap", async () => {
    const doctor = await prisma.doctor.findFirstOrThrow({
      where: { isActive: true },
    });
    const clinic = await prisma.clinic.create({
      data: {
        slug: `clinic-booking-test-${randomUUID()}`,
        name: "Klinik Booking Integration Test",
        city: "Jakarta Selatan",
        address: "Alamat khusus integration test",
      },
    });
    createdClinicId = clinic.id;
    const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1_000);
    startsAt.setSeconds(0, 0);
    const slot = await prisma.doctorScheduleSlot.create({
      data: {
        doctorId: doctor.id,
        clinicId: clinic.id,
        mode: "OFFLINE",
        startsAt,
        endsAt: new Date(startsAt.getTime() + 45 * 60 * 1_000),
        price: 250_000,
      },
    });
    const replacementSlot = await prisma.doctorScheduleSlot.create({
      data: {
        doctorId: doctor.id,
        mode: "ONLINE",
        startsAt: new Date(startsAt.getTime() + 24 * 60 * 60 * 1_000),
        endsAt: new Date(
          startsAt.getTime() + 24 * 60 * 60 * 1_000 + 45 * 60 * 1_000,
        ),
        price: 275_000,
      },
    });
    createdScheduleIds.push(slot.id, replacementSlot.id);

    const bookingChatToken = randomUUID();
    const bookingSession = await prisma.chatSession.create({
      data: {
        tokenHash: hashChatSessionToken(bookingChatToken),
        expiresAt: new Date(Date.now() + 60_000),
        consentAt: new Date(),
        consentVersion: "2026-08-24",
        lead: {
          create: {
            name: "Pasien Booking Test",
            whatsapp: "+6281234567890",
            diabetesType: "Diabetes tipe 2",
            currentMedication: "Metformin dari dokter",
            primaryComplaint: "Gula darah belum stabil",
          },
        },
        messages: {
          create: {
            role: "USER",
            content: "Gula darah saya belum stabil dan ingin berkonsultasi.",
          },
        },
      },
    });
    chatCookie = `${CHAT_SESSION_COOKIE_NAME}=${bookingChatToken}`;

    const scheduleResponse = await apiRequest(
      `/api/doctors/${doctor.slug}/schedule?limit=30`,
    );
    const scheduleBody = (await scheduleResponse.json()) as {
      data: { slots: Array<{ id: string }> };
    };
    expect(scheduleResponse.status).toBe(200);
    expect(scheduleBody.data.slots.some((item) => item.id === slot.id)).toBe(
      true,
    );

    const requestBody = JSON.stringify({
      slotId: slot.id,
      patientName: "Pasien Booking Test",
      whatsapp: "081234567890",
      complaint: "Kontrol gula darah",
      consentToBooking: true,
    });
    const [responseA, responseB] = await Promise.all([
      apiRequest("/api/chat/bookings", { method: "POST", body: requestBody }),
      apiRequest("/api/chat/bookings", { method: "POST", body: requestBody }),
    ]);
    const [firstResponse, secondResponse] =
      responseA.status === 201
        ? [responseA, responseB]
        : [responseB, responseA];
    const firstBody = (await firstResponse.json()) as {
      data: { id: string; bookingCode: string; whatsapp: string };
    };
    expect(firstResponse.status).toBe(201);
    expect(firstBody.data.bookingCode).toStartWith("GC-");
    expect(firstBody.data.whatsapp).toBe("+6281234567890");
    createdBookingId = firstBody.data.id;
    chatCookie = "";
    await prisma.chatSession.delete({ where: { id: bookingSession.id } });

    expect(secondResponse.status).toBe(409);
    expect(await secondResponse.json()).toMatchObject({
      error: { code: "SCHEDULE_SLOT_UNAVAILABLE" },
    });

    const invalidLookup = await apiRequest("/api/chat/bookings/lookup", {
      method: "POST",
      body: JSON.stringify({
        bookingCode: firstBody.data.bookingCode,
        whatsapp: "081200000000",
      }),
    });
    expect(invalidLookup.status).toBe(404);

    const lookupResponse = await apiRequest("/api/chat/bookings/lookup", {
      method: "POST",
      body: JSON.stringify({
        bookingCode: firstBody.data.bookingCode.toLowerCase(),
        whatsapp: "081234567890",
      }),
    });
    expect(lookupResponse.status).toBe(200);
    expect(await lookupResponse.json()).toMatchObject({
      data: {
        status: "PENDING",
        preConsultationSummary: {
          diabetesType: "Diabetes tipe 2",
          currentMedication: "Metformin dari dokter",
          emergencyFlag: false,
        },
        events: [{ action: "BOOKING_CREATED" }],
      },
    });

    const rescheduleResponse = await apiRequest(
      `/api/chat/bookings/${firstBody.data.bookingCode}/reschedule`,
      {
        method: "PATCH",
        body: JSON.stringify({
          whatsapp: "081234567890",
          slotId: replacementSlot.id,
          consentToBooking: true,
        }),
      },
    );
    expect(rescheduleResponse.status).toBe(200);
    expect(await rescheduleResponse.json()).toMatchObject({
      data: { slotId: replacementSlot.id, status: "PENDING" },
    });
    expect(
      (await prisma.doctorScheduleSlot.findUnique({ where: { id: slot.id } }))
        ?.status,
    ).toBe("AVAILABLE");

    const deletionResponse = await apiRequest(
      `/api/chat/bookings/${firstBody.data.bookingCode}/deletion-request`,
      { method: "POST", body: JSON.stringify({ whatsapp: "081234567890" }) },
    );
    expect(deletionResponse.status).toBe(200);
    const deletionBody = (await deletionResponse.json()) as {
      data: { deletionRequestedAt: string | null };
    };
    expect(deletionBody.data.deletionRequestedAt).toBeString();

    const cancelResponse = await apiRequest(
      `/api/chat/bookings/${firstBody.data.bookingCode}/cancel`,
      { method: "PATCH", body: JSON.stringify({ whatsapp: "081234567890" }) },
    );
    const cancelledBody = (await cancelResponse.json()) as {
      data: { status: string; events: Array<{ action: string }> };
    };
    expect(cancelResponse.status).toBe(200);
    expect(cancelledBody.data.status).toBe("CANCELLED");
    expect(cancelledBody.data.events.map((event) => event.action)).toEqual([
      "BOOKING_CREATED",
      "BOOKING_RESCHEDULED",
      "DATA_DELETION_REQUESTED",
      "BOOKING_CANCELLED",
    ]);
    expect(
      (
        await prisma.doctorScheduleSlot.findUnique({
          where: { id: replacementSlot.id },
        })
      )?.status,
    ).toBe("AVAILABLE");
  });

  test("chat membuat sesi aman, menangani kondisi darurat, dan melindungi histori", async () => {
    const providerStatusResponse = await apiRequest("/api/chat/status");
    expect(providerStatusResponse.status).toBe(200);

    const missingHistoryResponse = await apiRequest("/api/chat");
    expect(missingHistoryResponse.status).toBe(401);

    const invalidMessageResponse = await apiRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "", consentToDataProcessing: true }),
    });
    expect(invalidMessageResponse.status).toBe(422);

    const emergencyResponse = await apiRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Pasien diabetes tiba-tiba pingsan dan kejang.",
        consentToDataProcessing: true,
      }),
    });
    const emergencyBody = (await emergencyResponse.json()) as {
      data: {
        messageId: string;
        sessionId: string;
        reply: string;
        leadComplete: boolean;
        isEmergency: boolean;
        sources: unknown[];
      };
    };
    expect(emergencyResponse.status).toBe(200);
    expect(emergencyBody.data.isEmergency).toBe(true);
    expect(emergencyBody.data.reply).toContain("119");
    expect(emergencyBody.data.sources).toEqual([]);
    createdChatSessionId = emergencyBody.data.sessionId;
    chatCookie =
      emergencyResponse.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    expect(chatCookie).toStartWith("telehealth_chat_session=");

    const historyResponse = await apiRequest(
      `/api/chat/${createdChatSessionId}`,
    );
    const historyBody = (await historyResponse.json()) as {
      data: {
        consentGranted: boolean;
        messages: Array<{
          id: string;
          role: string;
          content: string;
          sources: unknown[];
          feedback?: { rating: string; reason?: string };
        }>;
      };
    };
    expect(historyResponse.status).toBe(200);
    expect(historyBody.data.messages).toHaveLength(2);
    expect(historyBody.data.messages[1]?.role).toBe("assistant");
    expect(historyBody.data.messages[1]?.sources).toEqual([]);

    await prisma.chatMessage.update({
      where: { id: historyBody.data.messages[1]!.id },
      data: {
        sources: [
          { title: "Knowledge Integration Test", source: testKnowledgeSource },
        ],
      },
    });
    const sourcedHistoryResponse = await apiRequest("/api/chat");
    const sourcedHistoryBody = (await sourcedHistoryResponse.json()) as {
      data: {
        messages: Array<{ sources: Array<{ title: string; source: string }> }>;
      };
    };
    expect(sourcedHistoryBody.data.messages[1]?.sources).toEqual([
      { title: "Knowledge Integration Test", source: testKnowledgeSource },
    ]);

    const streamResponse = await apiRequest("/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({
        message: "Pasien diabetes tidak sadar dan sulit bernapas.",
        consentToDataProcessing: true,
      }),
    });
    const streamBody = await streamResponse.text();
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get("content-type")).toContain(
      "text/event-stream",
    );
    expect(streamBody).toContain("event: meta");
    expect(streamBody).toContain("event: token");
    expect(streamBody).toContain("event: done");
    expect(streamBody).toContain("119");

    const retryResponse = await apiRequest("/api/chat/retry", {
      method: "POST",
      body: JSON.stringify({ consentToDataProcessing: true }),
    });
    expect(retryResponse.status).toBe(409);
    expect(await retryResponse.json()).toMatchObject({
      error: { code: "CHAT_NOT_RETRYABLE" },
    });

    const foreignHistoryResponse = await apiRequest(
      `/api/chat/${randomUUID()}`,
    );
    expect(foreignHistoryResponse.status).toBe(403);

    expect((await apiRequest("/api/chat", { method: "DELETE" })).status).toBe(
      204,
    );
    chatCookie = "";
    expect((await apiRequest("/api/chat")).status).toBe(401);
  });

  test("login menolak password yang salah", async () => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: "password-yang-salah",
      }),
    });
    expect(response.status).toBe(401);
  });

  test("admin dapat login, mengelola data, dan logout", async () => {
    const loginResponse = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });
    expect(loginResponse.status).toBe(200);
    sessionCookie =
      loginResponse.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    expect(sessionCookie).toStartWith("telehealth_session=");

    const meResponse = await apiRequest("/api/auth/me");
    expect(meResponse.status).toBe(200);

    const chatStatsResponse = await apiRequest("/api/admin/chat/stats");
    expect(chatStatsResponse.status).toBe(200);

    const emergencySessionsResponse = await apiRequest(
      "/api/admin/chat/sessions?emergency=true&limit=100",
    );
    expect(emergencySessionsResponse.status).toBe(200);

    const productResponse = await apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Produk Integration Test",
        category: "Test",
        price: 12345,
        description: "Data sementara untuk integration test.",
      }),
    });
    const productBody = (await productResponse.json()) as {
      data: { id: string; slug: string };
    };
    expect(productResponse.status).toBe(201);
    createdProductId = productBody.data.id;
    expect(productBody.data.slug).toBe("produk-integration-test");

    const productUpdateResponse = await apiRequest(
      `/api/products/${createdProductId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ price: 15000, isActive: false }),
      },
    );
    expect(productUpdateResponse.status).toBe(200);

    const doctorResponse = await apiRequest("/api/doctors", {
      method: "POST",
      body: JSON.stringify({
        name: "dr. Integration Test, Sp.PD",
        specialty: "Integration Testing",
        experience: "1 Tahun",
        registrationNumber: "TEST-STR-001",
        categoryIds: ["diabetes2"],
      }),
    });
    const doctorBody = (await doctorResponse.json()) as {
      data: { id: string; categories: Array<{ id: string }> };
    };
    expect(doctorResponse.status).toBe(201);
    createdDoctorId = doctorBody.data.id;
    expect(doctorBody.data.categories[0]?.id).toBe("diabetes2");

    const doctorUpdateResponse = await apiRequest(
      `/api/doctors/${createdDoctorId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ categoryIds: ["insulin", "diabetes2"] }),
      },
    );
    const doctorUpdateBody = (await doctorUpdateResponse.json()) as {
      data: { categories: Array<{ id: string }> };
    };
    expect(doctorUpdateResponse.status).toBe(200);
    expect(doctorUpdateBody.data.categories).toHaveLength(2);

    expect(
      (
        await apiRequest(`/api/doctors/${createdDoctorId}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    createdDoctorId = undefined;

    expect(
      (
        await apiRequest(`/api/products/${createdProductId}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    createdProductId = undefined;

    const logoutResponse = await apiRequest("/api/auth/logout", {
      method: "POST",
    });
    expect(logoutResponse.status).toBe(204);
    sessionCookie = "";

    const expiredSessionResponse = await apiRequest("/api/auth/me");
    expect(expiredSessionResponse.status).toBe(401);
  });
});
