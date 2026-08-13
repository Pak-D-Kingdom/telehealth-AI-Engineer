import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { upsertKnowledgeDocument } from "../src/services/rag.service";

let server: Server;
let baseUrl: string;
let sessionCookie = "";
let chatCookie = "";
let createdProductId: string | undefined;
let createdDoctorId: string | undefined;
let createdChatSessionId: string | undefined;
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
  if (createdDoctorId) {
    await prisma.doctor.deleteMany({ where: { id: createdDoctorId } });
  }
  if (createdProductId) {
    await prisma.product.deleteMany({ where: { id: createdProductId } });
  }
  if (createdChatSessionId) {
    await prisma.chatSession.deleteMany({ where: { id: createdChatSessionId } });
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
    const embedding = Array.from({ length: 3_072 }, (_, index) => (index === 0 ? 1 : 0));

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

    const rows = await prisma.$queryRaw<Array<{ title: string; dimensions: number }>>`
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

  test("chat membuat sesi aman, menangani kondisi darurat, dan melindungi histori", async () => {
    const missingHistoryResponse = await apiRequest("/api/chat");
    expect(missingHistoryResponse.status).toBe(401);

    const invalidMessageResponse = await apiRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "" }),
    });
    expect(invalidMessageResponse.status).toBe(422);

    const emergencyResponse = await apiRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Pasien diabetes tiba-tiba pingsan dan kejang." }),
    });
    const emergencyBody = (await emergencyResponse.json()) as {
      data: {
        sessionId: string;
        reply: string;
        leadComplete: boolean;
        isEmergency: boolean;
      };
    };
    expect(emergencyResponse.status).toBe(200);
    expect(emergencyBody.data.isEmergency).toBe(true);
    expect(emergencyBody.data.reply).toContain("119");
    createdChatSessionId = emergencyBody.data.sessionId;
    chatCookie = emergencyResponse.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    expect(chatCookie).toStartWith("telehealth_chat_session=");

    const historyResponse = await apiRequest(`/api/chat/${createdChatSessionId}`);
    const historyBody = (await historyResponse.json()) as {
      data: { messages: Array<{ role: string; content: string }> };
    };
    expect(historyResponse.status).toBe(200);
    expect(historyBody.data.messages).toHaveLength(2);
    expect(historyBody.data.messages[1]?.role).toBe("assistant");

    const foreignHistoryResponse = await apiRequest(`/api/chat/${randomUUID()}`);
    expect(foreignHistoryResponse.status).toBe(403);

    expect((await apiRequest("/api/chat", { method: "DELETE" })).status).toBe(204);
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
    sessionCookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    expect(sessionCookie).toStartWith("telehealth_session=");

    const meResponse = await apiRequest("/api/auth/me");
    expect(meResponse.status).toBe(200);

    const chatStatsResponse = await apiRequest("/api/admin/chat/stats");
    expect(chatStatsResponse.status).toBe(200);

    const emergencySessionsResponse = await apiRequest(
      "/api/admin/chat/sessions?emergency=true&limit=100",
    );
    const emergencySessionsBody = (await emergencySessionsResponse.json()) as {
      data: Array<{ id: string; isEmergency: boolean; messageCount: number }>;
    };
    expect(emergencySessionsResponse.status).toBe(200);
    expect(
      emergencySessionsBody.data.some(
        (session) =>
          session.id === createdChatSessionId && session.isEmergency && session.messageCount === 2,
      ),
    ).toBe(true);

    const chatDetailResponse = await apiRequest(`/api/admin/chat/sessions/${createdChatSessionId}`);
    const chatDetailBody = (await chatDetailResponse.json()) as {
      data: { messages: unknown[]; status: string; lead: { qualificationStatus: string } | null };
    };
    expect(chatDetailResponse.status).toBe(200);
    expect(chatDetailBody.data.messages).toHaveLength(2);

    const updateChatResponse = await apiRequest(`/api/admin/chat/sessions/${createdChatSessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED", qualificationStatus: "NEEDS_REVIEW" }),
    });
    const updateChatBody = (await updateChatResponse.json()) as {
      data: { status: string; lead: { qualificationStatus: string } };
    };
    expect(updateChatResponse.status).toBe(200);
    expect(updateChatBody.data.status).toBe("COMPLETED");
    expect(updateChatBody.data.lead.qualificationStatus).toBe("NEEDS_REVIEW");

    const filteredChatResponse = await apiRequest(
      "/api/admin/chat/sessions?status=COMPLETED&emergency=true&leadCaptured=false",
    );
    const filteredChatBody = (await filteredChatResponse.json()) as {
      data: Array<{ id: string }>;
    };
    expect(filteredChatResponse.status).toBe(200);
    expect(filteredChatBody.data.some((session) => session.id === createdChatSessionId)).toBe(true);

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

    const productUpdateResponse = await apiRequest(`/api/products/${createdProductId}`, {
      method: "PATCH",
      body: JSON.stringify({ price: 15000, isActive: false }),
    });
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

    const doctorUpdateResponse = await apiRequest(`/api/doctors/${createdDoctorId}`, {
      method: "PATCH",
      body: JSON.stringify({ categoryIds: ["insulin", "diabetes2"] }),
    });
    const doctorUpdateBody = (await doctorUpdateResponse.json()) as {
      data: { categories: Array<{ id: string }> };
    };
    expect(doctorUpdateResponse.status).toBe(200);
    expect(doctorUpdateBody.data.categories).toHaveLength(2);

    expect((await apiRequest(`/api/doctors/${createdDoctorId}`, { method: "DELETE" })).status).toBe(
      204,
    );
    createdDoctorId = undefined;

    expect(
      (await apiRequest(`/api/products/${createdProductId}`, { method: "DELETE" })).status,
    ).toBe(204);
    createdProductId = undefined;

    const logoutResponse = await apiRequest("/api/auth/logout", { method: "POST" });
    expect(logoutResponse.status).toBe(204);
    sessionCookie = "";

    const expiredSessionResponse = await apiRequest("/api/auth/me");
    expect(expiredSessionResponse.status).toBe(401);
  });
});
