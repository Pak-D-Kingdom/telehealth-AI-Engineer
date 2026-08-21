import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { app } from "../src/app";
import { InventoryAgent } from "../src/services/agents/inventory.agent";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("Admin AI Pharmacy Inventory & Restock Forecasting Agent", () => {
  describe("InventoryAgent", () => {
    test("menghasilkan peramalan stok, runout days, dan rekomendasi EOQ", async () => {
      const result = await InventoryAgent.generateInventoryForecast();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(typeof result.summary.totalProductsTracked).toBe("number");
      expect(result.summary.totalProductsTracked).toBeGreaterThan(0);
      expect(typeof result.summary.totalEstimatedReorderBudget).toBe("number");
      expect(typeof result.summary.fastestDepletingProduct).toBe("string");

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);

      const firstItem = result.items[0];
      expect(firstItem.productId).toBeDefined();
      expect(typeof firstItem.productName).toBe("string");
      expect(typeof firstItem.runoutDays).toBe("number");
      expect(["CRITICAL_REFILL", "REORDER_RECOMMENDED", "HEALTHY"]).toContain(firstItem.stockStatus);
      expect(typeof firstItem.recommendedReorderQty).toBe("number");
      expect(Array.isArray(firstItem.demandSignalReasons)).toBe(true);

      expect(result.aiExecutiveAdvice).toBeDefined();
      expect(typeof result.aiExecutiveAdvice.procurementSummary).toBe("string");
      expect(Array.isArray(result.aiExecutiveAdvice.priorityActions)).toBe(true);
    }, 30000);

    test("menangani pertanyaan interaktif admin pengadaan/gudang farmasi", async () => {
      const result = await InventoryAgent.askInventoryAdvisor("Kapan kita harus pesan ulang strip glukometer?");

      expect(result).toBeDefined();
      expect(typeof result.answer).toBe("string");
      expect(result.answer.length).toBeGreaterThan(10);
    }, 30000);

    test("melempar error jika query inventaris kosong", async () => {
      expect(InventoryAgent.askInventoryAdvisor("")).rejects.toThrow();
    });
  });

  describe("API Endpoints Integration", () => {
    test("GET /api/ai/inventory/forecast mengembalikan status 200 dan data proyeksi stok", async () => {
      const res = await fetch(`${baseUrl}/api/ai/inventory/forecast`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.summary).toBeDefined();
      expect(Array.isArray(json.data.items)).toBe(true);
    }, 45000);

    test("POST /api/ai/inventory/query mengembalikan status 200 dan saran pengadaan AI", async () => {
      const res = await fetch(`${baseUrl}/api/ai/inventory/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Berapa total anggaran restock yang dibutuhkan saat ini?" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.data.answer).toBe("string");
    }, 45000);
  });
});
