// @ts-nocheck

import {
  TAU,
  RAPHAEL_CYAN_SOFT,
  WARM_GOLD_NODE,
  SPIRITRON_WHITE,
} from './constants.js';
import { clamp, lerp } from './math-utils.js';
import { disposeObjectTree } from './dispose-utils.js';

const fract = (value) => value - Math.floor(value);
const pseudo = (index, salt = 0) => fract(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453);

class MagiculeParticleField {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.reduced = !!profile.reduced;
    this.count = this.getParticleCount();
    this.group = new THREE.Group();
    this.group.name = "Magicule Spiritron Particle Field";
    this.group.renderOrder = 6;
    this.meta = [];
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.scales = new Float32Array(this.count);
    this.geometry = null;
    this.material = null;
    this.points = null;

    try {
      this.createParticles();
      if (this.core?.group) this.group.position.copy(this.core.group.position);
      scene.add(this.group);
    } catch (err) {
      console.warn("[FLG] MagiculeParticleField init failed:", err?.message || err);
      this.dispose();
    }
  }

  getParticleCount() {
    if (this.profile.reduced) return 200;
    if (this.profile.mobile) return 850;
    if (this.profile.lowPower) return 500;
    return 2200;
  }

  colorForIndex(index) {
    const THREE = this.THREE;
    const bucket = index % 20;
    if (bucket < 12) return new THREE.Color(WARM_GOLD_NODE);
    if (bucket < 18) return new THREE.Color(SPIRITRON_WHITE);
    return new THREE.Color(RAPHAEL_CYAN_SOFT);
  }

  createParticles() {
    const THREE = this.THREE;
    const maxRadius = this.profile.mobile ? 28 : 44;
    const minRadius = this.profile.mobile ? 4.6 : 6.2;
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < this.count; i++) {
      const ringT = i / Math.max(1, this.count - 1);
      const baseTheta = i * golden;
      const radius = minRadius + Math.sqrt(ringT) * (maxRadius - minRadius);
      const phase = pseudo(i, 2) * TAU;
      const z = -15 + pseudo(i, 3) * 20;
      const yBand = this.profile.mobile ? 10 : 16;
      const y = (pseudo(i, 4) - 0.5) * yBand;
      const speed = (0.014 + (i % 7) * 0.003) * (i % 2 ? -1 : 1);
      const scale = this.profile.mobile ? 0.4 + pseudo(i, 5) * 0.5 : 0.45 + pseudo(i, 5) * 0.55;
      const theta = baseTheta + phase;
      const spiral = clamp(radius * Math.exp(0.18 * ((theta % TAU) - Math.PI)), minRadius, maxRadius);

      this.positions[i * 3] = Math.cos(theta) * spiral;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = Math.sin(theta) * spiral * 0.42 + z;
      this.scales[i] = scale;

      const color = this.colorForIndex(i);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.meta.push({
        baseTheta,
        phase,
        radius,
        y,
        z,
        speed,
        scale,
        anchor: i % 20 === 19,
      });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute("aScale", new THREE.BufferAttribute(this.scales, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: this.profile.mobile ? 2.4 : 3.7 },
        uOpacity: { value: this.profile.reduced ? 0.18 : this.profile.mobile ? 0.34 : 0.42 },
        uWarp: { value: 0 },
        uEnergy: { value: 0 },
      },
      vertexShader: `
        attribute float aScale;
        varying vec3 vColor;
        varying float vScale;
        uniform float uSize;
        uniform float uWarp;
        void main() {
          vColor = color;
          vScale = aScale;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * aScale * (100.0 / max(18.0, -mv.z)) * (1.0 + uWarp * 0.34);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vScale;
        uniform float uOpacity;
        uniform float uWarp;
        uniform float uEnergy;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float pt = smoothstep(0.5, 0.3, d);            // 硬邊小光點
          vec3 color = vColor * (0.58 + uEnergy * 0.2);  // 較暗 → bloom 不暈成大球
          float alpha = pt * uOpacity * (0.72 + vScale * 0.2) * (1.0 + uWarp * 0.2);
          gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.85));
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.renderOrder = 6;
    this.group.add(this.points);
  }

  update(dt, time, state = {}) {
    if (this.core?.group) this.group.position.copy(this.core.group.position);

    const warp = clamp(state.warp || 0, 0, 1);
    const energy = clamp(state.energy || 0, 0, 1);
    if (this.material) {
      this.material.uniforms.uWarp.value = warp;
      this.material.uniforms.uEnergy.value = energy;
    }

    if (this.reduced) return;

    const pointer = state.pointer || {};
    const pointerActive = clamp(pointer.active || 0, 0, 1);
    const pointerX = (pointer.x || 0) * (this.profile.mobile ? 8 : 12);
    const pointerY = (pointer.y || 0) * (this.profile.mobile ? 5 : 7);
    const phase = state.stepped?.phase ?? 'idle';
    const pulse = state.stepped?.pulse ?? 1;
    const stepIndex = state.stepped?.stepIndex ?? 0;
    const rawWarpConverge = warp > 0.4 ? clamp((warp - 0.4) / 0.6, 0, 1) : 0;
    const maxSteps = phase === 'handoff' ? 8 : 5;
    const steppedConverge = phase === 'warp' || phase === 'handoff'
      ? clamp((stepIndex + pulse) / maxSteps, 0, 1)
      : rawWarpConverge;
    const warpConverge = phase === 'warp' || phase === 'handoff' ? steppedConverge : rawWarpConverge;
    const phaseBoost = phase === 'idle' ? 1 : 1 + pulse * 0.18 + stepIndex * 0.025;

    for (let i = 0; i < this.meta.length; i++) {
      const p = this.meta[i];
      const theta = p.baseTheta + p.phase + time * p.speed * (1 + energy * 0.45 + warp * 2.2) * phaseBoost;
      const cycle = ((theta % TAU) + TAU) % TAU;
      const spiralRadius = clamp(p.radius * Math.exp(0.18 * (cycle - Math.PI)), 2.2, this.profile.mobile ? 32 : 52);
      const orbitY = p.y + Math.sin(theta * 0.7 + p.phase) * (0.28 + energy * 0.55);
      const orbitZ = Math.sin(theta) * spiralRadius * 0.42 + p.z;
      let x = Math.cos(theta) * spiralRadius;
      let y = orbitY;
      let z = orbitZ;

      if (pointerActive > 0) {
        const dx = pointerX - x;
        const dy = pointerY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) {
          const pull = (1 - dist / 6) * 0.3 * pointerActive;
          x += dx * pull;
          y += dy * pull;
        }
      }

      if (warpConverge > 0) {
        const anchor = p.anchor ? 0.28 : 1;
        const targetRadius = 0.72 + (i % 11) * 0.11;
        const targetTheta = p.baseTheta + time * (0.18 + (i % 5) * 0.025);
        x = lerp(x, Math.cos(targetTheta) * targetRadius, warpConverge);
        y = lerp(y, (i % 7 - 3) * 0.08, warpConverge * anchor);
        z = lerp(z, -1.2 + (i % 9) * 0.13, warpConverge);
      }

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = clamp(z, -15, 5);
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      disposeObjectTree(this.group);
      this.group.removeFromParent?.();
    }
    this.meta = [];
    this.geometry = null;
    this.material = null;
    this.points = null;
  }
}

export { MagiculeParticleField };
