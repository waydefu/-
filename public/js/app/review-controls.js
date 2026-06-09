// @ts-check
// 審稿手動控制：模型放射選單（自/深/快）+ 思考模式開關（spark-switch）。
// 唯一職責：把使用者選擇寫進 AppState.reviewModel / reviewThinking，
// 供 services/analyze-api.js 帶入請求 body 與快取鍵。不直接呼叫 API。
import { AppState } from "../core/state.js";

const $ = (id) => document.getElementById(id);
const MODEL_LABEL = { auto: "自", kimi: "深", groq: "快" };

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

/** 綁定模型放射選單與思考開關，並即時同步 AppState。 */
export function initReviewControls() {
  const radios = /** @type {HTMLInputElement[]} */ (
    Array.from(document.querySelectorAll('input[name="modelPick"]'))
  );
  const current = $("modelCurrent");
  const thinkInput = /** @type {HTMLInputElement|null} */ ($("thinkInput"));
  const thinkWrap = $("thinkToggle");
  const dial = $("modelDial");
  const dialOpen = /** @type {HTMLInputElement|null} */ ($("modelDialOpen"));

  const syncOpen = () => {
    const open = !!(dialOpen && dialOpen.checked);
    dial?.classList.toggle("is-open", open);
    dialOpen?.setAttribute("aria-expanded", String(open));
  };

  const sync = () => {
    const model = radios.find((r) => r.checked)?.value || "auto";
    const thinkOn = !!(thinkInput && thinkInput.checked);
    AppState.set("reviewModel", model);
    AppState.set("reviewThinking", computeThinking(model, thinkOn));
    if (current) current.textContent = MODEL_LABEL[model] || "自";
    // 思考開關只在 Kimi 時生效；其餘變暗停用。
    const thinkActive = model === "kimi";
    thinkWrap?.classList.toggle("is-disabled", !thinkActive);
    if (thinkInput) thinkInput.disabled = !thinkActive;
    syncOpen();
  };

  radios.forEach((r) => r.addEventListener("change", () => {
    sync();
    if (dialOpen) dialOpen.checked = false; // 選完收合放射選單
    syncOpen();
  }));
  dialOpen?.addEventListener("change", syncOpen);
  document.addEventListener("click", (e) => {
    if (!dialOpen?.checked || !dial) return;
    if (e.target instanceof Node && dial.contains(e.target)) return;
    dialOpen.checked = false;
    syncOpen();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !dialOpen?.checked) return;
    dialOpen.checked = false;
    syncOpen();
  });
  thinkInput?.addEventListener("change", sync);
  sync();
}
