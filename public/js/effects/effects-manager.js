// @ts-nocheck
// 大賢者鑑定系統 — 特效總管（Stage 2）
// 角色：延後（不阻塞首屏）、能力偵測、context-lost/失敗 → 保留 CSS 背景（永不黑屏）。
// 使用者要求：手機一律不降級、不做 FPS 自動停用（移除效能 gating）。
let core = null;
let calmMode = false;
let pulseT = 0;
let lifecycleBound = false;

function setVfxState(state, detail = {}) {
  document.body?.classList.remove("vfx-loading", "vfx-ready", "vfx-full", "vfx-fallback");
  if (state) document.body?.classList.add(`vfx-${state}`);
  if (state !== "loading") {
    window.dispatchEvent(new CustomEvent(`worldforge:vfx-${state}`, { detail }));
  }
}

function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

function disposeCore(reason, { fallback = false } = {}) {
  if (core) { try { core.dispose(); } catch {} core = null; }
  const canvas = document.getElementById("sageCanvas");
  if (canvas) canvas.style.opacity = "0"; // 回落到 CSS 電影背景
  if (reason) console.info("[FLG] WebGL 奇觀停用：" + reason + "（保留 CSS 背景）");
  if (fallback) setVfxState("fallback", { reason: reason || "disabled" });
}

function bindLifecycle() {
  if (lifecycleBound) return;
  lifecycleBound = true;
  document.addEventListener("visibilitychange", () => {
    if (!core) return;
    if (document.hidden) core.stop(); else core.start();
  });
  window.addEventListener("worldforge:analysis-start", () => core?.setEnergy(1));
  window.addEventListener("worldforge:analysis-complete", () => core?.setEnergy(0));
  // 登入頁互動充能：滑入 / 聚焦登入鈕 → 核心短暫提亮（儀式感）
  window.addEventListener("worldforge:pulse", () => {
    if (!core) return;
    core.setEnergy(0.7);
    window.clearTimeout(pulseT);
    pulseT = window.setTimeout(() => core?.setEnergy(0), 1100);
  });
  window.addEventListener("pagehide", () => disposeCore(""), { once: true });
}

async function load() {
  const canvas = document.getElementById("sageCanvas");
  if (!canvas) {
    setVfxState("fallback", { reason: "missing canvas" });
    return;
  }
  try {
    const { GreatSageCore } = await import("./great-sage-core.js");
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    canvas.addEventListener("webglcontextlost", () => disposeCore("context lost", { fallback: true }), { once: true });
    core = new GreatSageCore(canvas, { mobile, calm: calmMode });
    core.start();
    canvas.style.opacity = "1";   // 淡入（CSS transition）
    bindLifecycle();
    setVfxState("ready", { source: "webgl", mobile, calm: calmMode });
  } catch (error) {
    console.warn("[FLG] WebGL 奇觀層載入失敗，維持 CSS 背景：", error?.message || error);
    disposeCore(error?.message || "load failed", { fallback: true });
  }
}

/** 首屏後延後啟動；不支援 / reduced-motion → 直接維持 CSS 電影背景。 */
export function initEffects() {
  setVfxState("loading");
  if (!webglSupported()) {
    setVfxState("fallback", { reason: "webgl unsupported" });
    return;
  }
  // reduced-motion 不再整個跳過——改顯示「靜緩版」奇觀（慢轉、粒子幾乎不漂），
  // 既尊重少動需求、又讓開了 reduced-motion 的裝置仍看得到背景奇觀。
  calmMode = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 2600 });
  else window.setTimeout(load, 1200);
}
