import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { app } from "../src/app";
import { FinanceAgent } from "../src/services/agents/finance.agent";
import { LeadScoringAgent } from "../src/services/agents/lead-scoring.agent";

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

describe("Admin AI Agents: Finance Intelligence & Lead Scoring CRM", () => {
  describe("FinanceAgent", () => {
    test("menghasilkan ringkasan metrik katalog, valuasi pipeline, dan executive summary", async () => {
      const insights = await FinanceAgent.generateFinancialInsights();

      expect(insights).toBeDefined();
      expect(insights.catalogSummary).toBeDefined();
      expect(typeof insights.catalogSummary.totalActiveProducts).toBe("number");
      expect(typeof insights.catalogSummary.totalCatalogValue).toBe("number");
      expect(Array.isArray(insights.catalogSummary.categoryBreakdown)).toBe(true);

      expect(insights.pipelineSummary).toBeDefined();
      expect(typeof insights.pipelineSummary.totalLeads).toBe("number");
      expect(typeof insights.pipelineSummary.estimatedPipelineRevenue).toBe("number");

      expect(insights.executiveSummary).toBeDefined();
      expect(typeof insights.executiveSummary.overview).toBe("string");
      expect(Array.isArray(insights.executiveSummary.keyOpportunities)).toBe(true);
      expect(Array.isArray(insights.executiveSummary.bundlingRecommendations)).toBe(true);
      expect(typeof insights.executiveSummary.actionableAdvice).toBe("string");
    }, 45000);

    test("menangani query interaktif tanya jawab finansial admin", async () => {
      const result = await FinanceAgent.askFinanceAdvisor("Bagaimana cara meningkatkan konversi produk glukometer?");

      expect(result).toBeDefined();
      expect(typeof result.answer).toBe("string");
      expect(result.answer.length).toBeGreaterThan(10);
    }, 45000);

    test("melempar error jika query finansial kosong", async () => {
      expect(FinanceAgent.askFinanceAdvisor("")).rejects.toThrow();
    });
  });

  describe("LeadScoringAgent", () => {
    test("mengevaluasi batch skor seluruh lead dan klasifikasi tier", async () => {
      const result = await LeadScoringAgent.scoreAllLeads();

      expect(result).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(typeof result.stats.total).toBe("number");
      expect(typeof result.stats.hot).toBe("number");
      expect(typeof result.stats.warm).toBe("number");
      expect(typeof result.stats.cold).toBe("number");
      expect(Array.isArray(result.leads)).toBe(true);

      if (result.leads.length > 0) {
        const first = result.leads[0];
        expect(first.leadId).toBeDefined();
        expect(typeof first.totalScore).toBe("number");
        expect(["HOT", "WARM", "COLD"]).toContain(first.tier);
        expect(first.factors).toBeDefined();
        expect(typeof first.whatsAppDraft).toBe("string");
      }
    }, 45000);
  });

  describe("API Endpoints Integration", () => {
    test("GET /api/ai/finance/insights mengembalikan HTTP 200 dengan data finansial", async () => {
      const res = await fetch(`${baseUrl}/api/ai/finance/insights`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.catalogSummary).toBeDefined();
      expect(json.data.pipelineSummary).toBeDefined();
    }, 45000);

    test("POST /api/ai/finance/query mengembalikan HTTP 200 dengan jawaban AI", async () => {
      const res = await fetch(`${baseUrl}/api/ai/finance/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Berapa potensi omset platform saat ini?" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.data.answer).toBe("string");
    }, 45000);

    test("GET /api/ai/leads/batch-scores mengembalikan HTTP 200 dengan statistik lead", async () => {
      const res = await fetch(`${baseUrl}/api/ai/leads/batch-scores`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.stats).toBeDefined();
      expect(Array.isArray(json.data.leads)).toBe(true);
    }, 15000);
  });
});
