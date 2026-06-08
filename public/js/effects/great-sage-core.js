// @ts-nocheck
// 大賢者鑑定系統 — WebGL 奇觀核心（電影色彩 + UnrealBloom + 細緻 glyph 環 + 發光軌道環 + 發光粒子）
// 安全準則：
//  - 每幀 clear（alpha 0 透明，CSS 背景透出）；只用 additive / 透明合成（永不填黑底）。
//  - three 用 full URL import；bloom addon 動態 import 靠 importmap 解內部 'three'；失敗 → catch → 退回基礎奇觀。
//  - combine shader 輸出 base.a（透明保真）→ bloom 不可能填黑底。
//  - context-lost preventDefault + 停（CSS fallback）；dispose 無 leak。
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const GOLD = 0xd6a64d;
const GOLD_HOT = 0xffe6a6;
const ADDON_BASE = "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/";

/** 徑向光暈貼圖（中心亮 → 邊緣透明）；additive，用作中央光爆 / 發光電子。 */
function makeRadialTexture() {
  const s = 256;
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const tex = new THREE.CanvasTexture(cv);
  const ctx = cv.getContext("2d");
  if (!ctx) return tex;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,251,238,0.95)");
  g.addColorStop(0.16, "rgba(255,230,166,0.78)");
  g.addColorStop(0.5, "rgba(214,166,77,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  tex.needsUpdate = true;
  return tex;
}

/** 柔光環貼圖（寬暈 + 細亮芯，shadowBlur 製造發光）→ 軌道環不再像塑膠管。 */
function makeGlowRingTexture(css) {
  const s = 1024;  // 高解析：貼到大平面也不模糊
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ctx = cv.getContext("2d");
  if (!ctx) return tex;
  ctx.translate(s / 2, s / 2);
  ctx.lineCap = "round";
  // 細亮線（不畫大光暈；發光交給 bloom）
  ctx.shadowColor = css; ctx.shadowBlur = 6;
  ctx.strokeStyle = css; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 2; ctx.strokeStyle = "#fff6e0"; ctx.lineWidth = 1.2; // 細白芯
  ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  tex.needsUpdate = true;
  return tex;
}

export class GreatSageCore {
  constructor(canvas, { mobile = false, calm = false } = {}) {
    this.canvas = canvas;
    this.mobile = mobile;
    this.calm = calm;
    this.frame = 0;
    this.running = false;
    this.disposed = false;
    this.energy = 0;
    this.energyTarget = 0;
    this.t = 0;
    this.bloomReady = false;
    this._onResize = this.resize.bind(this);
    this._onLost = (e) => { e.preventDefault(); this.stop(); };
    this._onRestored = () => { if (!this.disposed) this.start(); };
    this.px = 0; this.py = 0; this.pxT = 0; this.pyT = 0;
    this._onPointer = (ev) => {
      this.pxT = ((ev.clientX / window.innerWidth) - 0.5) * 0.5;
      this.pyT = ((ev.clientY / window.innerHeight) - 0.5) * 0.5;
    };

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false });
    this.renderer.setClearColor(0x000000, 0);
    // 自適應 DPR：基準上限 + 動態縮放（嚴重掉幀才降，防手機 context-lost；不動特效）
    this._basePR = Math.min(window.devicePixelRatio || 1, mobile ? 2.0 : 2.5);
    this._renderScale = 1; this._frames = 0; this._fpsT = performance.now();
    this.renderer.setPixelRatio(this._basePR);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8.6);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._build();
    this.resize();
    this._initBloom();      // bloom 後製（addon 動態載入）
    this._initGlyphRing();  // 細緻符文環
    this._initMagicule();   // shader 發光粒子場
    this._initCompRing();   // 大賢者計算環（同心環 + 刻線 + 破弧 + 符文標記）

    canvas.addEventListener("webglcontextlost", this._onLost, false);
    canvas.addEventListener("webglcontextrestored", this._onRestored, false);
    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("pointermove", this._onPointer, { passive: true });
  }

  _build() {
    this._disposables = [];

    // 奇點核心（取自 arcane-core 精華：shader rim-glow + 脈動 + 星芒，additive）+ 線框外殼
    const coreGeo = new THREE.IcosahedronGeometry(1.8, 2);
    const coreMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uEnergy: { value: 0 }, uWarp: { value: 0 },
        uColor1: { value: new THREE.Color(0xff9b3d) },
        uColor2: { value: new THREE.Color(0xfff3b0) },
        uRimColor: { value: new THREE.Color(0xf8fbff) },
      },
      vertexShader:
        "varying vec3 vNormal; varying vec3 vPosition; uniform float uTime; uniform float uWarp;" +
        "void main(){ vNormal = normalize(normalMatrix * normal); vec3 p = position;" +
        " float pulse = 1.0 + 0.04*sin(uTime*1.6) + 0.06*uWarp; p *= pulse; vPosition = p;" +
        " gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }",
      fragmentShader:
        "precision highp float; varying vec3 vNormal; varying vec3 vPosition;" +
        "uniform float uTime; uniform float uEnergy; uniform float uWarp; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uRimColor;" +
        "void main(){ float rim = 1.0 - abs(dot(vNormal, normalize(vPosition))); float glow = pow(rim, 2.8);" +
        " float pulse = 0.5 + 0.5*sin(uTime*1.35 + length(vPosition)*2.0); float core = 1.0 - smoothstep(1.0, 2.45, length(vPosition));" +
        " float angle = atan(vPosition.y, vPosition.x); float star = pow(abs(cos(angle*8.0 + uTime*0.22)), 16.0) * smoothstep(1.9, 0.18, length(vPosition.xy));" +
        " vec3 col = mix(uColor1, uColor2, 0.30 + pulse*0.16 + uEnergy*0.10); col += uColor1*(core*0.72 + (1.0-rim)*0.22);" +
        " col += uColor2*(core*0.34 + glow*0.10); col += uRimColor*(core*0.24 + star*0.32 + glow*0.12 + uWarp*0.04); col *= 0.58 + 0.12*pulse;" +
        " float alpha = 0.15 + glow*0.12 + core*0.16 + star*0.1 + uEnergy*0.06 + uWarp*0.08;" +
        " gl_FragColor = vec4(clamp(col,0.0,1.0), clamp(alpha,0.0,0.5)); }",
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.scale.setScalar(0.5);
    this.group.add(this.core);
    const shellGeo = new THREE.IcosahedronGeometry(2.6, 1);
    const shellMat = new THREE.MeshBasicMaterial({ color: 0xffb84d, wireframe: true, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
    this.shell = new THREE.Mesh(shellGeo, shellMat);
    this.shell.scale.setScalar(0.55);
    this.group.add(this.shell);
    this._disposables.push(coreGeo, coreMat, shellGeo, shellMat);

    // 中央光爆（additive 徑向光暈 sprite）
    const glowTex = makeRadialTexture();
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.set(5.4, 5.4, 1);
    this.group.add(this.glow);
    this._disposables.push(glowTex, glowMat);

    // 發光軌道環：CanvasTexture 柔光環（非塑膠）+ 不同傾斜軸 + 發光電子（一道青藍）
    this.orbits = [];
    const orbitDefs = [
      { d: 8.4, ax: [1.4, 0.0, 0.0], css: "#ffd47a", spd: 0.004 },     // 繞 X（水平橢圓）
      { d: 9.2, ax: [0.0, 1.4, 0.0], css: "#2f6fd0", spd: -0.005 },    // 繞 Y（垂直橢圓，深藍）
      { d: 7.8, ax: [0.95, 0.0, 0.95], css: "#e8a020", spd: 0.0045 },  // XZ 斜
      { d: 8.8, ax: [0.0, 0.95, 0.95], css: "#ffe6a6", spd: -0.0038 }, // YZ 斜
    ];
    for (const o of orbitDefs) {
      const rtex = makeGlowRingTexture(o.css);
      rtex.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); // 斜視角不糊
      const geo = new THREE.PlaneGeometry(o.d, o.d);
      const mat = new THREE.MeshBasicMaterial({ map: rtex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.set(o.ax[0], o.ax[1], o.ax[2]);
      const etex = makeRadialTexture();
      const eMat = new THREE.SpriteMaterial({ map: etex, color: new THREE.Color(o.css), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
      const electron = new THREE.Sprite(eMat);
      electron.scale.set(0.5, 0.5, 1);
      ring.add(electron);
      this.group.add(ring);
      this.orbits.push({ ring, electron, r: o.d * 0.42, spd: o.spd, phase: Math.random() * 6.283 });
      this._disposables.push(rtex, geo, mat, etex, eMat);
    }
  }

  async _initBloom() {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
        import(ADDON_BASE + "EffectComposer.js"),
        import(ADDON_BASE + "RenderPass.js"),
        import(ADDON_BASE + "UnrealBloomPass.js"),
      ]);
      if (this.disposed) return;
      const w = window.innerWidth, h = window.innerHeight;
      this.baseTarget = new THREE.WebGLRenderTarget(1, 1, { samples: this.mobile ? 0 : 2 });
      this.bloomComposer = new EffectComposer(this.renderer);
      this.bloomComposer.renderToScreen = false;
      const rp = new RenderPass(this.scene, this.camera);
      rp.clearAlpha = 0;
      this.bloomComposer.addPass(rp);
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.5, 0.6);
      this.bloomComposer.addPass(this.bloomPass);
      this.combineMat = new THREE.ShaderMaterial({
        uniforms: { baseTexture: { value: null }, bloomTexture: { value: null } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader:
          "uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;" +
          "void main(){ vec4 b = texture2D(baseTexture, vUv); vec3 bl = texture2D(bloomTexture, vUv).rgb;" +
          " vec3 c = b.rgb + bl; c = pow(max(c, 0.0), vec3(0.4545)); gl_FragColor = vec4(c, b.a); }",
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
      });
      this.fsGeo = new THREE.PlaneGeometry(2, 2);
      this.fsScene = new THREE.Scene();
      this.fsScene.add(new THREE.Mesh(this.fsGeo, this.combineMat));
      this.fsCam = new THREE.Camera();
      this.bloomReady = true;
      this.resize();
    } catch (e) {
      console.info("[FLG] Bloom 未啟用（保留基礎奇觀）：" + (e?.message || e));
    }
  }

  // 細緻 glyph 符文環（已 recolor 金；scale 0.34、降亮顯細節）
  async _initGlyphRing() {
    try {
      const { ReferenceGlyphRing } = await import("../webgl/reference-glyph-ring.js");
      if (this.disposed) return;
      const profile = { reduced: false, mobile: this.mobile, lowPower: false };
      this.glyphInst = new ReferenceGlyphRing(THREE, this.group, profile, null);
      if (this.glyphInst?.group) {
        this.glyphInst.group.scale.setScalar(0.34);
        this.glyphInst.group.rotation.x = -0.34;
      }
      this.glyphInst?.layers?.forEach((l) => { if (l.userData) l.userData.baseOpacity *= 0.55; });
    } catch (e) {
      console.info("[FLG] Glyph 環未啟用：" + (e?.message || e));
    }
  }

  // shader 發光粒子場（soft core + hot 中心輝光；取代 sprite 塑膠點）
  async _initMagicule() {
    try {
      const { MagiculeParticleField } = await import("../webgl/magicule-particles.js");
      if (this.disposed) return;
      const profile = { reduced: false, mobile: this.mobile, lowPower: false };
      this.mpInst = new MagiculeParticleField(THREE, this.group, profile, null);
      if (this.mpInst?.material) {
        this.mpInst.material.uniforms.uOpacity.value = this.mobile ? 0.5 : 0.6;  // 小光點需足夠 alpha
        this.mpInst.material.uniforms.uSize.value = this.mobile ? 0.5 : 0.6;     // 一粒的小光點
      }
    } catch (e) {
      console.info("[FLG] 發光粒子未啟用：" + (e?.message || e));
    }
  }

  // 大賢者計算環（同心環 + 刻線環 + 破弧 + 符文標記；分析計算視覺語彙）
  async _initCompRing() {
    try {
      const { RaphaelComputationRing } = await import("../webgl/raphael-computation-ring.js");
      if (this.disposed) return;
      const profile = { reduced: false, mobile: this.mobile, lowPower: false };
      this.compInst = new RaphaelComputationRing(THREE, this.group, profile, null);
      if (this.compInst?.group) this.compInst.group.scale.setScalar(0.32); // 縮入視野
    } catch (e) {
      console.info("[FLG] 計算環未啟用：" + (e?.message || e));
    }
  }

  setEnergy(v) { this.energyTarget = Math.max(0, Math.min(1, v)); }

  resize() {
    if (this.disposed) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.z = (w < 720 ? 10.5 : 8.6);
    this.camera.updateProjectionMatrix();
    if (this.bloomReady) {
      const dpr = this.renderer.getPixelRatio();
      this.baseTarget.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
      this.bloomComposer.setPixelRatio?.(dpr);
      this.bloomComposer.setSize(w, h);
    }
  }

  _renderBloom() {
    const r = this.renderer;
    r.setRenderTarget(this.baseTarget);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, this.camera);
    this.bloomComposer.render();
    this.combineMat.uniforms.baseTexture.value = this.baseTarget.texture;
    this.combineMat.uniforms.bloomTexture.value = this.bloomComposer.renderTarget2.texture;
    r.setRenderTarget(null);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.fsScene, this.fsCam);
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    const loop = () => {
      if (!this.running || this.disposed) return;
      this.t += 0.016;
      // 自適應 DPR：每秒檢查 FPS，嚴重掉幀降 render scale、回穩才升（唯一效能旋鈕，不動特效）
      this._frames++;
      const nowMs = performance.now();
      if (nowMs - this._fpsT >= 1000) {
        const fps = (this._frames * 1000) / (nowMs - this._fpsT);
        this._frames = 0; this._fpsT = nowMs;
        let ns = this._renderScale;
        if (fps < 38 && ns > 0.6) ns = Math.max(0.6, ns - 0.12);
        else if (fps > 56 && ns < 1) ns = Math.min(1, ns + 0.08);
        if (ns !== this._renderScale) { this._renderScale = ns; this.renderer.setPixelRatio(this._basePR * ns); this.resize(); }
      }
      this.energy += (this.energyTarget - this.energy) * 0.05;
      const e = this.energy;
      const m = this.calm ? 0.28 : 1;
      this.core.rotation.y += (0.0016 + e * 0.004) * m;
      this.core.rotation.x += 0.0008 * m;
      this.shell.rotation.y -= (0.0011 + e * 0.003) * m;
      if (this.core.material.uniforms) { this.core.material.uniforms.uTime.value = this.t; this.core.material.uniforms.uEnergy.value = e; }
      const gp = 5.4 + Math.sin(this.t * 1.6) * 0.2 + e * 0.9;
      this.glow.scale.set(gp, gp, 1);
      this.glow.material.opacity = 0.2 + e * 0.08;
      for (const o of this.orbits) {
        o.ring.rotation.z += o.spd * m;                              // 各環沿自身傾斜軸旋轉
        o.phase += (0.014 + e * 0.025) * m;
        o.electron.position.set(Math.cos(o.phase) * o.r, Math.sin(o.phase) * o.r, 0); // 發光電子繞行
      }
      if (this.glyphInst) this.glyphInst.update(0.04, this.t, { energy: e });
      if (this.mpInst) this.mpInst.update(0.016, this.t, { energy: e });
      if (this.compInst) this.compInst.update(0.016, this.t, { energy: e, warp: 0 });
      this.px += (this.pxT - this.px) * 0.045;
      this.py += (this.pyT - this.py) * 0.045;
      this.group.rotation.y = this.px;
      this.group.rotation.x = this.py;
      if (this.bloomPass) this.bloomPass.strength = 0.3 + e * 0.4; // 分析時能量衝擊（收斂，不過曝）

      if (this.bloomReady) {
        this._renderBloom();
      } else {
        this.renderer.setRenderTarget(null);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this._onLost);
    this.canvas.removeEventListener("webglcontextrestored", this._onRestored);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("pointermove", this._onPointer);
    (this._disposables || []).forEach((d) => d.dispose && d.dispose());
    try { this.baseTarget?.dispose(); } catch {}
    try { this.bloomComposer?.dispose(); } catch {}
    try { this.bloomPass?.dispose(); } catch {}
    try { this.combineMat?.dispose(); } catch {}
    try { this.fsGeo?.dispose(); } catch {}
    try { this.glyphInst?.dispose(); } catch {}
    try { this.mpInst?.dispose(); } catch {}
    try { this.compInst?.dispose(); } catch {}
    this.renderer.dispose();
  }
}
