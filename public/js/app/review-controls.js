// @ts-check
// MODEL CORE SLOT 模型核心槽 + 思考模式開關（Ultra Pass3 §十）。
// 唯一職責：把使用者選擇寫進 AppState.reviewModel / reviewThinking，
// 供 services/analyze-api.js 帶入請求 body 與快取鍵。不直接呼叫 API。
import { AppState } from "../core/state.js";

const $ = (id) => document.getElementById(id);
const MODEL_NAME = { auto: "自動核心 AUTO", kimi: "深度核心 DEEP", groq: "快速核心 SWIFT" };

/**
 * 由模型選擇 + 思考開關推導要送後端的 thinking 值。
 * - auto：依字數自動切深/快（忽略開關）
 * - groq：弱模型恆快速（少字規則）
 * - kimi：看思考開關（亮=深度、暗=快速）
 * @param {string} model
 * @param {boolean} thinkOn
 * @returns {"auto"|"on"|"off"}
 */
function computeThinking(model, thinkOn) {
  if (model === "auto") return "auto";
  if (model === "groq") return "off";
  return thinkOn ? "on" : "off";
}

/** 綁定模型核心槽與思考開關，並即時同步 AppState。 */
export function initReviewControls() {
  const slot = $("modelDial");
  const btn = $("modelSlotBtn");
  const cur = $("modelCurrent");
  const syncEl = $("modelSync");
  const radios = /** @type {HTMLInputElement[]} */ (
    Array.from(document.querySelectorAll('input[name="modelPick"]'))
  );
  const thinkInput = /** @type {HTMLInputElement|null} */ ($("thinkInput"));
  const thinkWrap = $("thinkToggle");
  let syncTimer = 0;

  const setOpen = (open) => {
    slot?.classList.toggle("is-open", open);
    btn?.setAttribute("aria-expanded", String(open));
  };

  const sync = (announce) => {
    const model = radios.find((r) => r.checked)?.value || "auto";
    const thinkOn = !!(thinkInput && thinkInput.checked);
    AppState.set("reviewModel", model);
    AppState.set("reviewThinking", computeThinking(model, thinkOn));
    if (cur) cur.textContent = MODEL_NAME[model] || MODEL_NAME.auto;
    // 思考開關只在 Kimi 時生效；其餘變暗停用。
    const thinkActive = model === "kimi";
    thinkWrap?.classList.toggle("is-disabled", !thinkActive);
    if (thinkInput) thinkInput.disabled = !thinkActive;
    if (announce && syncEl) {
      syncEl.textContent = "MODEL SYNC · 模型核心同步";
      syncEl.classList.remove("is-fail");
      syncEl.classList.add("is-on");
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => syncEl.classList.remove("is-on"), 1100);
    }
  };

  btn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!slot?.classList.contains("is-open"));
  });
  radios.forEach((r) => r.addEventListener("change", () => {
    sync(true);
    setOpen(false);
    btn?.focus();
  }));
  document.addEventListener("click", (e) => {
    if (!slot?.classList.contains("is-open")) return;
    if (e.target instanceof Node && slot.contains(e.target)) return;
    setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && slot?.classList.contains("is-open")) setOpen(false);
  });
  thinkInput?.addEventListener("change", () => sync(false));
  sync(false);
}
