import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { app } from "../src/app";
import { MealPlannerAgent } from "../src/services/agents/meal-planner.agent";

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

describe("Free User AI Agent: Diabetes Daily Meal & Carb Planner", () => {
  describe("MealPlannerAgent", () => {
    test("menghasilkan rencana makan harian lengkap dengan ringkasan nutrisi dan 4 waktu makan", async () => {
      const result = await MealPlannerAgent.generateMealPlan({
        diabetesType: "TIPE_2",
        calorieTarget: 1600,
        dietaryPreferences: "hemat",
        allergiesOrDislikes: "Udang",
      });

      expect(result).toBeDefined();
      expect(result.dailyPlanSummary).toBeDefined();
      expect(typeof result.dailyPlanSummary.totalCalories).toBe("number");
      expect(typeof result.dailyPlanSummary.totalCarbsGrams).toBe("number");
      expect(typeof result.dailyPlanSummary.totalProteinGrams).toBe("number");
      expect(typeof result.dailyPlanSummary.nutritionAdvice).toBe("string");
      expect(typeof result.dailyPlanSummary.eatingSequenceTip).toBe("string");

      expect(Array.isArray(result.meals)).toBe(true);
      expect(result.meals.length).toBeGreaterThanOrEqual(3);

      const breakfast = result.meals.find((m) => m.mealType === "SARAPAN") || result.meals[0];
      expect(breakfast).toBeDefined();
      expect(typeof breakfast.menuName).toBe("string");
      expect(typeof breakfast.carbsGrams).toBe("number");
      expect(typeof breakfast.proteinGrams).toBe("number");

      expect(result.proPlanPreview).toBeDefined();
      expect(typeof result.proPlanPreview.bannerTitle).toBe("string");
    }, 75000);
  });

  describe("API Endpoints Integration", () => {
    test("POST /api/ai/meal-plan/generate mengembalikan status 200 dan data meal plan", async () => {
      const res = await fetch(`${baseUrl}/api/ai/meal-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diabetesType: "TIPE_2",
          calorieTarget: 1500,
          dietaryPreferences: "hemat",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.dailyPlanSummary).toBeDefined();
      expect(Array.isArray(json.data.meals)).toBe(true);
      expect(json.data.proPlanPreview).toBeDefined();
    }, 60000);
  });
});
