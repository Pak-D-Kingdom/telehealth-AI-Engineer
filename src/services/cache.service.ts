import type { ChatReply } from "../types/chat";

interface CacheEntry {
  query: string;
  normalizedQuery: string;
  result: ChatReply;
  timestamp: number;
}

// In-memory cache store
const cacheStore: CacheEntry[] = [];
const MAX_CACHE_SIZE = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalizes text for comparison (lowercasing, trimming, removing extra spaces and punctuation)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ");
}

/**
 * Calculates word overlap coefficient (Jaccard similarity on words)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const words1 = new Set(s1.split(" "));
  const words2 = new Set(s2.split(" "));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  const jaccardScore = intersection.size / union.size;

  if ((s1.length > 10 && s2.includes(s1)) || (s2.length > 10 && s1.includes(s2))) {
    return Math.max(jaccardScore, 0.9);
  }

  return jaccardScore;
}

/**
 * Retrieves a cached response if query similarity >= threshold (default 0.85)
 */
export const getCachedResponse = (
  query: string,
  sessionId: string,
  threshold = 0.85,
): ChatReply | null => {
  const normQuery = normalizeText(query);
  if (!normQuery || normQuery.length < 3) return null;

  const now = Date.now();

  for (const entry of cacheStore) {
    if (now - entry.timestamp > CACHE_TTL_MS) continue;

    const sim = calculateSimilarity(normQuery, entry.normalizedQuery);
    if (sim >= threshold) {
      console.log(
        `[Cache Hit - Similarity: ${(sim * 100).toFixed(1)}%] Query: "${query}" matched with "${entry.query}"`,
      );

      const prefixes = [
        "Tentu, ini dia infonya: ",
        "Berdasarkan database kami: ",
        "Sesuai dengan pertanyaan Anda: ",
        "Ini referensi untuk Anda: ",
        "",
      ];
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];

      return {
        ...entry.result,
        sessionId,
        reply: randomPrefix ? `${randomPrefix}${entry.result.reply}` : entry.result.reply,
      };
    }
  }

  return null;
};

/**
 * Stores a response in the semantic cache
 */
export const setCachedResponse = (query: string, result: ChatReply): void => {
  const normQuery = normalizeText(query);
  if (!normQuery || normQuery.length < 3) return;

  if (
    result.reply.toLowerCase().includes("darurat") ||
    result.reply.toLowerCase().includes("119")
  ) {
    return;
  }

  const existingIdx = cacheStore.findIndex((e) => e.normalizedQuery === normQuery);
  if (existingIdx !== -1) {
    cacheStore.splice(existingIdx, 1);
  }

  if (cacheStore.length >= MAX_CACHE_SIZE) {
    cacheStore.shift();
  }

  cacheStore.push({
    query,
    normalizedQuery: normQuery,
    result,
    timestamp: Date.now(),
  });

  console.log(`[Cache Saved] Cached response for query: "${query}"`);
};
