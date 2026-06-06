// @ts-nocheck
// 大賢者鑑定系統 — 特效總管（Stage 2）
// 角色：延後（不阻塞首屏）、能力偵測、FPS 降級、context-lost/失敗 → 保留 CSS 背景（永不黑屏）。
let core = null;
let fpsRaf = 0;
let calmMode = false;

function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

function disposeCore(reason) {
  if (fpsRaf) cancelAnimationFrame(fpsRaf), (fpsRaf = 0);
  if (core) { try { core.dispose(); } catch {} core = null; }
  const canvas = document.getElementById("sageCanvas");
  if (canvas) canvas.style.opacity = "0"; // 回落到 CSS 電影背景
  if (reason) console.info("[FLG] WebGL 奇觀停用：" + reason + "（保留 CSS 背景）");
}

function monitorFps() {
  let last = performance.now(), frames = 0, lowStreak = 0;
  const tick = () => {
    if (!core || core.disposed) return;
    frames += 1;
    const now = performance.now();
    if (now - last >= 1000) {
      const fps = frames; frames = 0; last = now;
      lowStreak = fps < 30 ? lowStreak + 1 : 0;
      if (lowStreak >= 5) { disposeCore("FPS 持續過低"); return; }   // 只在真的撐不住時降級
    }
    fpsRaf = requestAnimationFrame(tick);
  };
  fpsRaf = requestAnimationFrame(tick);
}

function bindLifecycle() {
  document.addEventListener("visibilitychange", () => {
    if (!core) return;
    if (document.hidden) core.stop(); else core.start();
  });
  window.addEventListener("worldforge:analysis-start", () => core?.setEnergy(1));
  window.addEventListener("worldforge:analysis-complete", () => core?.setEnergy(0));
  window.addEventListener("pagehide", () => disposeCore(""), { once: true });
}

async function load() {
  const canvas = document.getElementById("sageCanvas");
  if (!canvas) return;
  try {
    const { GreatSageCore } = await import("./great-sage-core.js");
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    core = new GreatSageCore(canvas, { mobile, calm: calmMode });
    core.start();
    canvas.style.opacity = "1";   // 淡入（CSS transition）
    bindLifecycle();
    monitorFps();
  } catch (error) {
    console.warn("[FLG] WebGL 奇觀層載入失敗，維持 CSS 背景：", error?.message || error);
    disposeCore("");
  }
}

/** 首屏後延後啟動；不支援 / reduced-motion → 直接維持 CSS 電影背景。 */
export function initEffects() {
  if (!webglSupported()) return;   // 真的不支援 WebGL 才純 CSS 背景
  // reduced-motion 不再整個跳過——改顯示「靜緩版」奇觀（慢轉、粒子幾乎不漂），
  // 既尊重少動需求、又讓開了 reduced-motion 的裝置仍看得到背景奇觀。
  calmMode = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 2600 });
  else window.setTimeout(load, 1200);
}
