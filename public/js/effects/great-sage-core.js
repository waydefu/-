// @ts-nocheck
// Great Sage WebGL core: rune crystal + balanced magic-circle rings.
// Keep this module self-contained and alpha-safe so the CSS fallback remains visible.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const GOLD = 0xd6a64d;
const GOLD_HOT = 0xffe6a6;
const ADDON_BASE = "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/postprocessing/";
const TAU = Math.PI * 2;
const SIGIL_TEXT = " GREAT SAGE // APPRAISAL CORE // FORMULA MATRIX // ";

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

function drawCircularText(ctx, text, radius, fontSize, color, start = -Math.PI / 2) {
  const chars = text.split("");
  const step = TAU / Math.max(1, chars.length);
  ctx.save();
  ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = fontSize * 0.22;
  for (let i = 0; i < chars.length; i++) {
    const a = start + i * step;
    ctx.save();
    ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function makeCoreSigilTexture(kind = "front") {
  const s = 768;
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ctx = cv.getContext("2d");
  if (!ctx) return tex;
  ctx.translate(s / 2, s / 2);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  const gold = "rgba(255, 226, 152, 0.72)";
  const hot = "rgba(255, 246, 224, 0.56)";
  const ember = "rgba(214, 166, 77, 0.42)";
  const coreR = kind === "rear" ? s * 0.23 : s * 0.26;
  const outerR = kind === "rear" ? s * 0.35 : s * 0.39;

  ctx.strokeStyle = ember;
  ctx.shadowColor = "rgba(214, 166, 77, 0.48)";
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2.2;
  for (const r of [coreR * 0.62, coreR, outerR]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  }

  ctx.shadowBlur = 10;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.8;
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6 + (kind === "rear" ? Math.PI / 6 : 0);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * coreR * 0.38, Math.sin(a) * coreR * 0.38);
    ctx.lineTo(Math.cos(a) * outerR * 0.92, Math.sin(a) * outerR * 0.92);
    ctx.stroke();
  }

  ctx.strokeStyle = hot;
  ctx.lineWidth = 2;
  for (let i = 0; i < 42; i++) {
    if (i % 5 === 0) continue;
    const a = i * TAU / 42;
    const len = i % 7 === 0 ? 30 : 17;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (outerR - len), Math.sin(a) * (outerR - len));
    ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    ctx.stroke();
  }

  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.shadowBlur = 18;
  for (let i = 0; i < 10; i++) {
    const start = i * 0.66 + (kind === "rear" ? 0.21 : 0);
    const span = 0.12 + (i % 3) * 0.055;
    ctx.beginPath();
    ctx.arc(0, 0, outerR + (i % 2) * 28, start, start + span);
    ctx.stroke();
  }

  drawCircularText(ctx, SIGIL_TEXT.repeat(2), outerR + 34, 22, "rgba(255, 239, 190, 0.58)", kind === "rear" ? Math.PI / 3 : -Math.PI / 2);
  tex.needsUpdate = true;
  return tex;
}

function computeFrameProfile(w, h) {
  const aspect = w / Math.max(1, h);
  const mobile = w < 720;
  const wide = aspect > 1.55;
  return {
    cameraZ: mobile ? 10.4 : wide ? 9.65 : 9.25,
    groupScale: mobile ? 0.95 : wide ? 0.78 : 0.84,
    groupX: 0,
    groupY: mobile ? 0.08 : 0.0,
  };
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
    this._detailDone = new Set();
    this._detailPending = 4;
    this._fullDispatched = false;
    this._onResize = this.resize.bind(this);
    this._onLost = (e) => { e.preventDefault(); this.stop(); };
    this._onRestored = () => { if (!this.disposed) this.start(); };
    this.px = 0; this.py = 0; this.pxT = 0; this.pyT = 0;
    this._onPointer = (ev) => {
      this.pxT = ((ev.clientX / window.innerWidth) - 0.5) * 0.28;
      this.pyT = ((ev.clientY / window.innerHeight) - 0.5) * 0.24;
    };

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false });
    this.renderer.setClearColor(0x000000, 0);
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
    this._initBloom();
    this._initGlyphRing();
    this._initMagicule();
    this._initCompRing();
    this._initGsap();

    canvas.addEventListener("webglcontextlost", this._onLost, false);
    canvas.addEventListener("webglcontextrestored", this._onRestored, false);
    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("pointermove", this._onPointer, { passive: true });
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

  _build() {
    this._disposables = [];
    this.coreSigils = [];

    const coreGeo = new THREE.SphereGeometry(1.72, 64, 32);
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
        " float pulse = 1.0 + 0.025*sin(uTime*1.5) + 0.05*uWarp; p *= pulse; vPosition = p;" +
        " gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }",
      fragmentShader:
        "precision highp float; varying vec3 vNormal; varying vec3 vPosition;" +
        "uniform float uTime; uniform float uEnergy; uniform float uWarp; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uRimColor;" +
        "void main(){ vec3 n = normalize(vNormal); vec3 p = normalize(vPosition); float rim = pow(1.0 - abs(dot(n,p)), 2.25);" +
        " float radius = length(vPosition.xy); float dist = length(vPosition); float angle = atan(vPosition.y, vPosition.x);" +
        " float pulse = 0.5 + 0.5*sin(uTime*1.35 + radius*3.0); float core = 1.0 - smoothstep(0.72, 2.05, dist);" +
        " float ring = pow(1.0 - abs(sin(radius*8.2 - uTime*1.05)), 16.0) * (1.0 - smoothstep(0.22, 1.72, radius));" +
        " float spokes = pow(abs(cos(angle*6.0 + uTime*0.10)), 28.0) * (1.0 - smoothstep(0.2, 1.68, radius));" +
        " float lattice = pow(abs(cos(angle*12.0 - uTime*0.07)), 24.0) * (1.0 - smoothstep(0.18, 1.20, radius));" +
        " float seal = ring*0.34 + spokes*0.18 + lattice*0.08; vec3 col = mix(uColor1, uColor2, 0.28 + pulse*0.14 + uEnergy*0.12);" +
        " col += uColor1*(core*0.52 + (1.0-rim)*0.12); col += uColor2*(core*0.30 + seal*0.32); col += uRimColor*(rim*0.22 + seal*0.14 + uWarp*0.04);" +
        " col *= 0.55 + 0.10*pulse; float alpha = 0.12 + rim*0.13 + core*0.15 + seal*0.13 + uEnergy*0.06 + uWarp*0.08;" +
        " gl_FragColor = vec4(clamp(col,0.0,1.0), clamp(alpha,0.0,0.48)); }",
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.scale.setScalar(0.56);
    this.group.add(this.core);
    this._disposables.push(coreGeo, coreMat);

    const glowTex = makeRadialTexture();
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.set(4.8, 4.8, 1);
    this.group.add(this.glow);
    this._disposables.push(glowTex, glowMat);

    const sigilGeo = new THREE.PlaneGeometry(4.3, 4.3);
    this._disposables.push(sigilGeo);
    [
      { kind: "rear", z: -0.24, scale: 1.08, opacity: 0.17, speed: -0.0024, order: 4 },
      { kind: "front", z: 0.18, scale: 0.86, opacity: 0.23, speed: 0.0032, order: 9 },
    ].forEach((cfg) => {
      const tex = makeCoreSigilTexture(cfg.kind);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(sigilGeo, mat);
      mesh.position.z = cfg.z;
      mesh.scale.setScalar(cfg.scale);
      mesh.renderOrder = cfg.order;
      mesh.userData = { speed: cfg.speed, baseOpacity: cfg.opacity };
      this.group.add(mesh);
      this.coreSigils.push(mesh);
      this._disposables.push(tex, mat);
    });
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
      this.baseTarget = new THREE.WebGLRenderTarget(1, 1, { samples: this.mobile ? 0 : 4 });
      this.bloomComposer = new EffectComposer(this.renderer);
      this.bloomComposer.renderToScreen = false;
      const rp = new RenderPass(this.scene, this.camera);
      rp.clearAlpha = 0;
      this.bloomComposer.addPass(rp);
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.48, 0.58);
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
      console.info("[FLG] Bloom fallback: " + (e?.message || e));
    } finally {
      this._markDetailLoaded("bloom");
    }
  }

  async _initGlyphRing() {
    try {
      const { ReferenceGlyphRing } = await import("../webgl/reference-glyph-ring.js");
      if (this.disposed) return;
      const profile = { reduced: false, mobile: this.mobile, lowPower: false };
      this.glyphInst = new ReferenceGlyphRing(THREE, this.group, profile, null);
      if (this.glyphInst?.group) {
        this.glyphInst.group.scale.setScalar(0.34);
        this.glyphInst.group.rotation.x = -0.28;
      }
      this.glyphInst?.layers?.forEach((l) => { if (l.userData) l.userData.baseOpacity *= 0.72; });
    } catch (e) {
      console.info("[FLG] Glyph layer fallback: " + (e?.message || e));
    } finally {
      this._markDetailLoaded("glyph");
    }
  }

  async _initMagicule() {
    try {
      const { MagiculeParticleField } = await import("../webgl/magicule-particles.js");
      if (this.disposed) return;
      const profile = { reduced: false, mobile: this.mobile, lowPower: false };
      this.mpInst = new MagiculeParticleField(THREE, this.group, profile, null);
      if (this.mpInst?.material) {
        this.mpInst.material.uniforms.uOpacity.value = this.mobile ? 0.45 : 0.54;
        this.mpInst.material.uniforms.uSize.value = this.mobile ? 0.5 : 0.6;
      }
    } catch (e) {
      console.info("[FLG] Particle layer fallback: " + (e?.message || e));
    } finally {
      this._markDetailLoaded("magicule");
    }
  }

  async _initCompRing() {
    try {
      const { RaphaelComputationRing } = await import("../webgl/raphael-computation-ring.js");
      if (this.disposed) return;
      const profile = { reduced: false, mobile: this.mobile, lowPower: false };
      this.compInst = new RaphaelComputationRing(THREE, this.group, profile, null);
      if (this.compInst?.group) this.compInst.group.scale.setScalar(0.34);
    } catch (e) {
      console.info("[FLG] Computation ring fallback: " + (e?.message || e));
    } finally {
      this._markDetailLoaded("computation");
    }
  }

  async _initGsap() {
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm");
      if (this.disposed) return;
      const gsap = mod.gsap || mod.default || mod;
      if (!gsap?.to) return;
      this.gsap = gsap;
      const baseZ = this.camera.position.z;
      this.camera.position.z = baseZ + 5.8;
      gsap.to(this.camera.position, { z: baseZ, duration: 2.8, ease: "power3.out" });
      gsap.fromTo(this.camera.rotation, { z: 0.08 }, { z: 0, duration: 3.0, ease: "power2.out" });
      gsap.to(this.camera.position, { x: 0.06, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2.8 });
      gsap.to(this.camera.position, { y: 0.04, duration: 11, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2.8 });
    } catch (e) {
      console.info("[FLG] GSAP fallback: " + (e?.message || e));
    }
  }

  setEnergy(v) { this.energyTarget = Math.max(0, Math.min(1, v)); }

  resize() {
    if (this.disposed) return;
    const w = window.innerWidth, h = window.innerHeight;
    const frame = computeFrameProfile(w, h);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.z = frame.cameraZ;
    this.camera.updateProjectionMatrix();
    this.group.position.set(frame.groupX, frame.groupY, 0);
    this.group.scale.setScalar(frame.groupScale);
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
    let last = performance.now();
    const loop = (now = performance.now()) => {
      if (!this.running || this.disposed) return;
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
      last = now;
      const frameFactor = dt * 60;
      this.t += dt;
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

      const energyEase = 1 - Math.pow(1 - 0.05, frameFactor);
      this.energy += (this.energyTarget - this.energy) * energyEase;
      const e = this.energy;
      const m = this.calm ? 0.28 : 1;
      this.core.rotation.y += (0.0015 + e * 0.0035) * m * frameFactor;
      this.core.rotation.x += 0.0007 * m * frameFactor;
      if (this.core.material.uniforms) { this.core.material.uniforms.uTime.value = this.t; this.core.material.uniforms.uEnergy.value = e; }
      const gp = 4.8 + Math.sin(this.t * 1.45) * 0.16 + e * 0.72;
      this.glow.scale.set(gp, gp, 1);
      this.glow.material.opacity = 0.18 + e * 0.07;
      for (const sigil of this.coreSigils) {
        sigil.rotation.z += sigil.userData.speed * m * frameFactor;
        sigil.material.opacity = sigil.userData.baseOpacity * (0.86 + Math.sin(this.t * 2.2 + sigil.position.z * 6) * 0.06 + e * 0.22);
      }

      if (this.glyphInst) this.glyphInst.update(0.04 * frameFactor, this.t, { energy: e });
      if (this.mpInst) this.mpInst.update(dt, this.t, { energy: e });
      if (this.compInst) this.compInst.update(dt, this.t, { energy: e, warp: 0 });
      const pointerEase = 1 - Math.pow(1 - 0.045, frameFactor);
      this.px += (this.pxT - this.px) * pointerEase;
      this.py += (this.pyT - this.py) * pointerEase;
      this.group.rotation.y = this.px;
      this.group.rotation.x = this.py;
      if (this.bloomPass) this.bloomPass.strength = 0.32 + e * 0.34;

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
    try { this.gsap?.killTweensOf(this.camera.position); this.gsap?.killTweensOf(this.camera.rotation); } catch {}
    this.renderer.dispose();
  }
}
