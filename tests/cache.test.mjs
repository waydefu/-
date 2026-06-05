import assert from "node:assert/strict";
import { describe, it } from "node:test";

const storage = new Map();

globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
};

const { UI_CONFIG } = await import("../public/js/core/config.js");
const { AnalysisCache } = await import("../public/js/services/cache.js");

describe("analysis cache", () => {
  it("keys cached results by the active analysis rule version", async () => {
    const originalVersion = UI_CONFIG.ANALYSIS_RULE_VERSION;
    const cache = new AnalysisCache(10);

    try {
      UI_CONFIG.ANALYSIS_RULE_VERSION = "test-rules-v1";
      await cache.set("user-1", "同一段草稿", "舊規則結果");
      assert.equal(await cache.getByText("user-1", "同一段草稿"), "舊規則結果");

      UI_CONFIG.ANALYSIS_RULE_VERSION = "test-rules-v2";
      assert.equal(await cache.getByText("user-1", "同一段草稿"), null);

      await cache.set("user-1", "同一段草稿", "新規則結果");
      assert.equal(await cache.getByText("user-1", "同一段草稿"), "新規則結果");

      UI_CONFIG.ANALYSIS_RULE_VERSION = "test-rules-v1";
      assert.equal(await cache.getByText("user-1", "同一段草稿"), "舊規則結果");
    } finally {
      UI_CONFIG.ANALYSIS_RULE_VERSION = originalVersion;
    }
  });
});
