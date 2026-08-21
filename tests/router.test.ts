import { expect, test, describe } from "bun:test";
import { routeUserIntent } from "../src/services/agents/router.agent";

describe("Master Router Agent", () => {
  test("mengarahkan keluhan medis ke TRIAGE", async () => {
    const intent = await routeUserIntent("Kaki saya luka bernanah dan berbau", []);
    expect(intent).toBe("TRIAGE");
  }, 30000);

  test("mengarahkan pertanyaan umum ke EDUCATION", async () => {
    const intent = await routeUserIntent("Apa itu HbA1c dan berapa nilai normalnya?", []);
    expect(intent).toBe("EDUCATION");
  }, 30000);

  test("mengarahkan pertanyaan makanan ke EDUCATION", async () => {
    const intent = await routeUserIntent("Berapa banyak kalori dalam sepiring nasi putih?", []);
    expect(intent).toBe("EDUCATION");
  }, 30000);

  test("mengarahkan keluhan gawat darurat ke TRIAGE", async () => {
    const intent = await routeUserIntent("Gula darah bapak saya drop 40 dan dia pingsan", []);
    expect(intent).toBe("TRIAGE");
  }, 30000);
});
