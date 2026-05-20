import assert from "node:assert/strict";
import { describe, it } from "node:test";

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

const {
  consumeSseLine,
  getAppCheckToken,
  normalizeServerError,
  parseSsePayload,
} = await import("../public/js/services/analyze-api.js");
const { AppState } = await import("../public/js/core/state.js");

describe("SSE helpers", () => {
  it("keeps partial data lines until the next chunk arrives", () => {
    const chunks = [];
    let buffer = consumeSseLine('data: {"text":"hel', (data) => chunks.push(data));

    assert.deepEqual(chunks, []);
    assert.equal(buffer, 'data: {"text":"hel');

    buffer = consumeSseLine(`${buffer}lo"}\n`, (data) => chunks.push(data));

    assert.deepEqual(chunks, ['{"text":"hello"}']);
    assert.equal(buffer, "");
  });

  it("emits text payloads and ignores DONE markers", () => {
    const text = [];

    parseSsePayload('{"text":"第一段"}', (value) => text.push(value));
    parseSsePayload("[DONE]", (value) => text.push(value));

    assert.deepEqual(text, ["第一段"]);
  });

  it("turns stream error payloads into user-facing api errors", () => {
    assert.throws(
      () => parseSsePayload('{"error":{"code":"quota-exceeded","message":"今日使用次數已達上限"}}', () => {}),
      (err) => {
        assert.equal(err.status, 200);
        assert.equal(err.code, "quota-exceeded");
        assert.equal(err.userMessage, "AI 分析中斷：今日使用次數已達上限");
        return true;
      },
    );
  });

  it("normalizes legacy and current backend error shapes", () => {
    assert.deepEqual(normalizeServerError({ code: "bad-request", message: "格式不正確" }), {
      code: "bad-request",
      message: "格式不正確",
    });
    assert.deepEqual(normalizeServerError({ error: "舊格式錯誤", code: "legacy" }), {
      code: "legacy",
      message: "舊格式錯誤",
    });
    assert.deepEqual(normalizeServerError({ error: { code: "nested", message: "巢狀錯誤" } }), {
      code: "nested",
      message: "巢狀錯誤",
    });
  });

  it("retries App Check token retrieval with a forced refresh", async () => {
    const calls = [];
    AppState.set("appCheck", {
      getToken: async (forceRefresh) => {
        calls.push(forceRefresh);
        return forceRefresh ? { token: "fresh-token" } : { token: "" };
      },
    });

    const token = await getAppCheckToken();

    assert.equal(token, "fresh-token");
    assert.deepEqual(calls, [false, true]);
    assert.equal(AppState.get("appCheckReady"), true);
    assert.equal(AppState.get("appCheckStatus"), "token-ready-refresh");
  });
});
