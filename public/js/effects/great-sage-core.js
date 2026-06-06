// @ts-nocheck
// 大賢者鑑定系統 — WebGL 奇觀核心（Stage 2，全新輕量電影級）
// 安全準則：每幀 clear（alpha 0 透明，CSS 背景透出）；無 postprocessing；
// context-lost preventDefault + 停（CSS 背景即 fallback，永不黑屏）；dispose 無 leak。
// 透過 full URL 動態 import three（jsdelivr 已在 CSP script-src 白名單，免 importmap）。
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const GOLD = 0xd6a64d;
const GOLD_HOT = 0xffe6a6;

export class GreatSageCore {
  constructor(canvas, { mobile = false } = {}) {
    this.canvas = canvas;
    this.mobile = mobile;
    this.frame = 0;
    this.running = false;
    this.disposed = false;
    this.energy = 0;          // 0..1（分析時拉高）
    this.energyTarget = 0;
    this.t = 0;
    this._onResize = this.resize.bind(this);
    this._onLost = (e) => { e.preventDefault(); this.stop(); };
    this._onRestored = () => { if (!this.disposed) this.start(); };

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false });
    this.renderer.setClearColor(0x000000, 0); // 透明：CSS 電影背景透出
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8.6);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._build();
    this.resize();

    canvas.addEventListener("webglcontextlost", this._onLost, false);
    canvas.addEventListener("webglcontextrestored", this._onRestored, false);
    window.addEventListener("resize", this._onResize, { passive: true });
  }

  _build() {
    const mobile = this.mobile;
    this._disposables = [];

    // 核心：雙層 icosahedron 線框（緩慢自轉）
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: GOLD_HOT, wireframe: true, transparent: true, opacity: 0.55 });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.core);
    const shellGeo = new THREE.IcosahedronGeometry(2.1, 0);
    const shellMat = new THREE.MeshBasicMaterial({ color: GOLD, wireframe: true, transparent: true, opacity: 0.22 });
    this.shell = new THREE.Mesh(shellGeo, shellMat);
    this.group.add(this.shell);
    this._disposables.push(coreGeo, coreMat, shellGeo, shellMat);

    // 符文環（兩個傾斜圓環，反向緩轉）
    this.rings = [];
    for (let i = 0; i < 2; i++) {
      const rGeo = new THREE.TorusGeometry(3 + i * 0.7, 0.012, 8, 128);
      const rMat = new THREE.MeshBasicMaterial({ color: i === 0 ? GOLD_HOT : GOLD, transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = 1.1 + i * 0.4;
      ring.rotation.y = i * 0.5;
      this.group.add(ring);
      this.rings.push(ring);
      this._disposables.push(rGeo, rMat);
    }

    // 低密度粒子（金色資料流，additive，緩慢漂移）
    const count = mobile ? 320 : 620;
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.4 + Math.random() * 6.5;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 9;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * r;
      spd[i] = 0.1 + Math.random() * 0.5;
    }
    this.pSpeed = spd;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: GOLD_HOT, size: mobile ? 0.05 : 0.045, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);
    this._disposables.push(pGeo, pMat);
  }

  setEnergy(v) { this.energyTarget = Math.max(0, Math.min(1, v)); }

  resize() {
    if (this.disposed) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.z = (w < 720 ? 10.5 : 8.6);
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    const loop = () => {
      if (!this.running || this.disposed) return;
      this.t += 0.016;
      this.energy += (this.energyTarget - this.energy) * 0.05;
      const e = this.energy;
      this.core.rotation.y += 0.0016 + e * 0.004;
      this.core.rotation.x += 0.0008;
      this.shell.rotation.y -= 0.0011 + e * 0.003;
      this.rings[0].rotation.z += 0.0014 + e * 0.005;
      this.rings[1].rotation.z -= 0.0010 + e * 0.004;
      const p = this.particles.geometry.attributes.position;
      for (let i = 0; i < this.pSpeed.length; i++) {
        let y = p.array[i * 3 + 1] + this.pSpeed[i] * (0.004 + e * 0.012);
        if (y > 4.6) y = -4.6;
        p.array[i * 3 + 1] = y;
      }
      p.needsUpdate = true;
      this.particles.material.opacity = 0.6 + e * 0.3;
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
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
    (this._disposables || []).forEach((d) => d.dispose && d.dispose());
    this.renderer.dispose();
  }
}
