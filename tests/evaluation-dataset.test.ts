import { describe, expect, test } from "bun:test";
import {
  evaluateDeterministicCase,
  loadChatEvaluationDataset,
} from "../src/evaluation/chat-evaluation";

describe("chat evaluation dataset", () => {
  test("memiliki 60 kasus unik dan seluruh deterministic guardrail sesuai", async () => {
    const dataset = await loadChatEvaluationDataset();
    const ids = dataset.cases.map((testCase) => testCase.id);
    const failures = dataset.cases.flatMap((testCase) =>
      evaluateDeterministicCase(testCase)
        .filter((check) => !check.passed)
        .map((check) => `${testCase.id}:${check.name}:${check.details}`),
    );

    expect(dataset.cases).toHaveLength(60);
    expect(new Set(ids).size).toBe(ids.length);
    expect(failures).toEqual([]);
  });
});
