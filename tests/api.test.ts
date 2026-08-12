import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

let server: Server;
let baseUrl: string;
let sessionCookie = "";
let createdProductId: string | undefined;
let createdDoctorId: string | undefined;

async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (sessionCookie) {
    headers.set("cookie", sessionCookie);
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
  if (createdDoctorId) {
    await prisma.doctor.deleteMany({ where: { id: createdDoctorId } });
  }
  if (createdProductId) {
    await prisma.product.deleteMany({ where: { id: createdProductId } });
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

  test("route admin menolak request tanpa session", async () => {
    const response = await apiRequest("/api/admin/products");
    expect(response.status).toBe(401);
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
