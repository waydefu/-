// @ts-nocheck
// 大賢者鑑定系統 — WebGL 奇觀核心（SAGE CORE IGNITION 引擎殼）
// 視覺本體在 ./sage-vfx.js（與 poc/vfx-lab.html 共用同一真源；規格見 docs/SAGE_CORE_IGNITION_SPEC.md + REFINE_PASS2）。
// 本檔職責：保持既有契約（constructor/start/stop/dispose/setEnergy + vfx-full 細節事件）、
// 動態載入 three addons、自適應 render scale（唯一效能旋鈕）、站內事件 → 階段映射。
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const ADDON = "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/";

export class GreatSageCore {
  constructor(canvas, { mobile = false, calm = false } = {}) {
    this.canvas = canvas;
    this.mobile = mobile;
    this.calm = calm;
    this.running = false;
    this.disposed = false;
    this.vfx = null;
    this.frameId = 0;
    this.bloomReady = false;
    this._initPromise = null;
    this._detailDone = new Set();
    this._detailPending = 4;
    this._fullDispatched = false;
    this._glyphMarked = false;
    this._last = performance.now();
    // 自適應 render scale（FPS 監測；專案唯一允許的效能旋鈕，不關特效）
    this._scale = 1; this._frames = 0; this._fpsT = performance.now();
    this._onResize = () => { this.vfx?.setSize(window.innerWidth, window.innerHeight); };
    this._onLost = (e) => { e.preventDefault(); this.stop(); };
    this._onRestored = () => { if (!this.disposed) this.start(); };
    this._onAnalysisStart = () => this.vfx?.setPhase("computing");
    this._onAnalysisComplete = () => this.vfx?.setPhase("complete");
    canvas.addEventListener("webglcontextlost", this._onLost, false);
    canvas.addEventListener("webglcontextrestored", this._onRestored, false);
    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("worldforge:analysis-start", this._onAnalysisStart);
    window.addEventListener("worldforge:analysis-complete", this._onAnalysisComplete);
  }

  _markDetailLoaded(name) {
    if (this.disposed || this._detailDone.has(name)) return;
    this._detailDone.add(name);
    this._detailPending = Math.max(0, this._detailPending - 1);
    if (!this._detailPending && !this._fullDispatched) {
      this._fullDispatched = true;
      window.dispatchEvent(new CustomEvent("worldforge:vfx-full", {
        detail: { bloomReady: this.bloomReady, details: Array.from(this._detailDone) },
      }));
    }
  }

  async _init() {
    const [gpuMod, ecMod, rpMod, ubMod, spMod, opMod, factory] = await Promise.all([
      import(ADDON + "misc/GPUComputationRenderer.js"),
      import(ADDON + "postprocessing/EffectComposer.js"),
      import(ADDON + "postprocessing/RenderPass.js"),
      import(ADDON + "postprocessing/UnrealBloomPass.js"),
      import(ADDON + "postprocessing/ShaderPass.js"),
      import(ADDON + "postprocessing/OutputPass.js"),
      import("./sage-vfx.js"),
    ]);
    if (this.disposed) return;
    this.vfx = factory.buildSageVfx({
      THREE,
      GPUComputationRenderer: gpuMod.GPUComputationRenderer,
      EffectComposer: ecMod.EffectComposer,
      RenderPass: rpMod.RenderPass,
      UnrealBloomPass: ubMod.UnrealBloomPass,
      ShaderPass: spMod.ShaderPass,
      OutputPass: opMod.OutputPass,
      canvas: this.canvas,
      quality: "ultra",          // 使用者令：先不降級（QUALITY 等級已預留，要降只改這裡）
      calm: this.calm,
      afterIgnition: "operational",
    });
    this.vfx.setSize(window.innerWidth, window.innerHeight);
    this.bloomReady = true;
    this._markDetailLoaded("bloom");        // 後製管線（bloom + 電影 pass）就緒
    this._markDetailLoaded("magicule");     // GPGPU 魔力粒子場就緒
    this._markDetailLoaded("computation");  // 法陣/狀態機就緒
    this.vfx.setPhase("ignition");          // 進站點火儀式 → operational 待運
  }

  /** effects-manager 契約：analysis-start→1、analysis-complete→0、登入 pulse→0.7。 */
  setEnergy(v) {
    if (!this.vfx) return;
    if (v >= 0.95) this.vfx.setPhase("computing");
    else if (v > 0.3) this.vfx.nudge(0.30);           // 登入鈕脈衝：短暫提亮 + 衝擊波
    else if (this.vfx.phaseName() === "computing") this.vfx.setPhase("complete");
  }

  resize() { this._onResize(); }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    if (!this._initPromise) {
      this._initPromise = this._init().catch((e) => {
        console.warn("[FLG] SAGE VFX 初始化失敗：", e?.message || e);
        throw e;
      });
    }
    this._last = performance.now();
    const loop = () => {
      if (!this.running || this.disposed) return;
      const now = performance.now();
      const dt = Math.min(0.033, (now - this._last) / 1000);
      this._last = now;
      if (this.vfx) {
        this.vfx.frame(dt);
        if (!this._glyphMarked) { this._glyphMarked = true; this._markDetailLoaded("glyph"); } // 首幀渲染成功
        // 自適應 render scale：嚴重掉幀降、回穩升（floor 0.6）
        this._frames++;
        if (now - this._fpsT >= 1000) {
          const fps = (this._frames * 1000) / (now - this._fpsT);
          this._frames = 0; this._fpsT = now;
          let ns = this._scale;
          if (fps < 36 && ns > 0.6) ns = Math.max(0.6, ns - 0.12);
          else if (fps > 56 && ns < 1) ns = Math.min(1, ns + 0.08);
          if (ns !== this._scale) { this._scale = ns; this.vfx.setRenderScale(ns); }
        }
      }
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this._onLost);
    this.canvas.removeEventListener("webglcontextrestored", this._onRestored);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("worldforge:analysis-start", this._onAnalysisStart);
    window.removeEventListener("worldforge:analysis-complete", this._onAnalysisComplete);
    try { this.vfx?.dispose(); } catch {}
    this.vfx = null;
  }
}
