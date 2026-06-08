// LLM 供應商層：NVIDIA NIM（OpenAI 相容）多模型 fallback + Groq 跨供應商備援。
// 抽出 client 建構、供應商鏈組裝、token 估算、模型/思考/快慢解析，讓 index.ts 專注在 HTTP handler。
import Groq from "groq-sdk";
import OpenAI from "openai";

// ── 端點與模型 id（請對 build.nvidia.com 各模型卡「View Code」核對；填錯只會 404→跳下一顆）──
export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NIM_MODEL_KIMI = "moonshotai/kimi-k2.6";
export const NIM_MODEL_GLM = "z-ai/glm-5.1";
export const NIM_MODEL_NEMOTRON = "nvidia/nemotron-3-ultra-550b-a55b";
export const NIM_MAX_TOKENS = 16384; // context 充裕；深度 thinking 會佔額度，給足避免重寫被截斷

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GROQ_TPM = 12000; // 免費 tier：prompt + max_tokens 合計上限
export const GROQ_MAX_TOKENS = 6000;

export const FAST_DRAFT_CHARS = 600; // 草稿 ≤ 此字數 → 關 thinking 走快速路徑

export type ModelChoice = "auto" | "kimi" | "groq";
export type ThinkingChoice = "auto" | "on" | "off";
export type Provider = {
  label: string;
  client: any;
  model: string;
  maxTokens: number;
  thinkOff?: Record<string, unknown>; // 各家 NIM 關 thinking 的參數（名稱不同）
};

/** 繁中粗估 ~1.6 token/字（保守上估：寧可少給 max_tokens 也不要撞 Groq TPM 413）。 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.6);
}

/** 解析前端覆寫的模型選擇，非法值回 auto。 */
export function resolveModelChoice(raw: unknown): ModelChoice {
  const v = String(raw ?? "auto").toLowerCase();
  return v === "kimi" || v === "groq" ? v : "auto";
}

/** 解析前端覆寫的思考模式，非法值回 auto。 */
export function resolveThinkingChoice(raw: unknown): ThinkingChoice {
  const v = String(raw ?? "auto").toLowerCase();
  return v === "on" || v === "off" ? v : "auto";
}

/** thinking：on=強制深度、off=強制快速、auto=依字數（短稿快速）。 */
export function resolveFast(thinking: ThinkingChoice, draftLength: number): boolean {
  if (thinking === "on") return false;
  if (thinking === "off") return true;
  return draftLength <= FAST_DRAFT_CHARS;
}

/** NIM（OpenAI 相容）client：非串流長等待用大 timeout；maxRetries:0 讓初次失敗立刻換下一顆。 */
export function makeNimClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: NIM_BASE_URL, timeout: 530000, maxRetries: 0 });
}

/** Groq client（快速備援）。 */
export function makeGroqClient(apiKey: string): Groq {
  return new Groq({ apiKey, timeout: 120000, maxRetries: 0 });
}

/**
 * 組裝依序嘗試的供應商鏈：
 *   NIM Kimi → GLM → Nemotron（皆中文強），末端視 TPM 預算加入 Groq 跨供應商備援。
 * modelChoice 指定 kimi/groq 時，把該顆提到最前（其餘仍作 fallback）。
 */
export function buildProviderChain(opts: {
  nim: OpenAI;
  groq: Groq;
  promptTokens: number;
  modelChoice: ModelChoice;
}): Provider[] {
  const { nim, groq, promptTokens, modelChoice } = opts;

  const providers: Provider[] = [
    { label: "nim-kimi", client: nim, model: NIM_MODEL_KIMI, maxTokens: NIM_MAX_TOKENS, thinkOff: { chat_template_kwargs: { thinking: false } } },
    { label: "nim-glm", client: nim, model: NIM_MODEL_GLM, maxTokens: NIM_MAX_TOKENS, thinkOff: { chat_template_kwargs: { enable_thinking: false } } },
    { label: "nim-nemotron", client: nim, model: NIM_MODEL_NEMOTRON, maxTokens: NIM_MAX_TOKENS, thinkOff: { chat_template_kwargs: { enable_thinking: false } } },
  ];

  // Groq 受 TPM 限制，僅在「容得下完整重寫」時才納入（否則必 413，納入無益）。
  const groqBudget = GROQ_TPM - promptTokens - 600;
  if (groqBudget >= 1500) {
    providers.push({ label: "groq", client: groq, model: GROQ_MODEL, maxTokens: Math.min(GROQ_MAX_TOKENS, groqBudget) });
  }

  const prefLabel = modelChoice === "kimi" ? "nim-kimi" : modelChoice === "groq" ? "groq" : "";
  if (prefLabel) {
    const pref = providers.filter((p) => p.label === prefLabel);
    if (pref.length) return [...pref, ...providers.filter((p) => p.label !== prefLabel)];
  }
  return providers;
}
