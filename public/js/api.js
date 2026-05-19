// @ts-check

import { API_CONFIG } from './config.js';
import { AppState } from './state.js';
import { analysisCache } from './cache.js';

// ── SSE helpers ───────────────────────────────────────────────

/**
 * Parse lines from the SSE buffer, returning remaining partial line.
 * @param {string} buffer
 * @param {(data: string) => void} onData
 * @returns {string} remaining unparsed buffer tail
 */
function consumeSseLine(buffer, onData) {
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? ""; // last item may be incomplete
  for (const line of lines) {
    if (line.startsWith("data: ")) onData(line.slice(6).trim());
  }
  return remaining;
}

const normalizeServerError = (body, fallback = "") => {
  if (!body) return { code: "", message: fallback };
  if (typeof body === "string") return { code: "", message: body || fallback };
  if (typeof body.error === "string") return { code: body.code || "", message: body.error || fallback };
  if (body.error && typeof body.error === "object") {
    return {
      code: body.error.code || body.code || "",
      message: body.error.message || body.message || fallback,
    };
  }
  return { code: body.code || "", message: body.message || fallback };
};

const makeApiError = (status, code, message) => {
  /** @type {Error & { status?: number, code?: string, userMessage?: string }} */
  const err = new Error(`伺服器錯誤：HTTP ${status}${message ? " — " + message : ""}`);
  err.status = status;
  err.code = code || "";
  err.userMessage = message || "";
  return err;
};

// ── Core fetcher ──────────────────────────────────────────────

/**
 * Fetch a single-draft analysis via SSE from the Cloud Function.
 * @param {string} draft
 * @param {AbortSignal} signal
 * @param {number} reqId
 * @param {((partial: string) => void) | undefined} onChunk  — receives cumulative text
 * @returns {Promise<import('./types.js').AnalyzeResponse>}
 */
export const analyzeDraft = async (draft, signal, reqId, onChunk) => {
  const auth = AppState.get("fbAuth");
  const user = auth ? auth.currentUser : null;
  const uid = user?.uid || "anon";

  const cached = await analysisCache.getByText(uid, draft);
  if (cached) return { result: cached, fromCache: true };

  const token = user ? await user.getIdToken() : "";
  const res = await fetch(API_CONFIG.FUNCTIONS_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body:   JSON.stringify({ text: draft }),
    signal,
  });

  if (!res.ok) {
    let serverError = { code: "", message: "" };
    try {
      const body = await res.json();
      serverError = normalizeServerError(body);
    } catch {
      serverError = normalizeServerError(await res.text().catch(() => ""));
    }
    throw makeApiError(res.status, serverError.code, serverError.message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let result = "";
  let sseBuffer = ""; // Accumulates across reader.read() calls to handle split lines

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });
    sseBuffer = consumeSseLine(sseBuffer, (dataStr) => {
      if (dataStr === "[DONE]") return;
      try {
        const data = JSON.parse(dataStr);
        if (data.error) {
          const serverError = normalizeServerError(data, "Stream interrupted");
          throw makeApiError(200, serverError.code || "stream-interrupted", `AI 分析中斷：${serverError.message}`);
        }
        if (data.text) {
          result += data.text;
          if (onChunk) onChunk(result);
        }
      } catch (e) {
        if (/** @type {any} */ (e)?.message?.startsWith("AI 分析中斷")) throw e;
        // Ignore JSON parse errors on truly partial lines (will be retried in next read)
      }
    });
  }

  // Flush any remaining buffer content
  if (sseBuffer.startsWith("data: ")) {
    const dataStr = sseBuffer.slice(6).trim();
    if (dataStr && dataStr !== "[DONE]") {
      try {
        const data = JSON.parse(dataStr);
        if (data.text) { result += data.text; if (onChunk) onChunk(result); }
      } catch { /* partial — safe to ignore */ }
    }
  }

  await analysisCache.set(uid, draft, result);
  return { result, fromCache: false };
};
