// @ts-nocheck

import {
  TAU,
  BRIGHT_GOLD,
  RAPHAEL_AMBER,
  RAPHAEL_CYAN_SOFT,
  RAPHAEL_GOLD_CORE,
  WARM_GOLD_NODE,
  SPIRITRON_WHITE,
  OPTICAL_TEAL,
} from './constants.js';
import { clamp } from './math-utils.js';
import { disposeObjectTree } from './dispose-utils.js';

const fract = (value) => value - Math.floor(value);
const pseudo = (index, salt = 0) => fract(Math.sin(index * 91.417 + salt * 37.219) * 47453.5453);

class GoldBokehField {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.reduced = !!profile.reduced;
    this.group = new THREE.Group();
    this.group.name = 'Reference Gold Bokeh Field';
    this.group.renderOrder = 5;
    this.meta = [];

    try {
      this.createField();
      if (this.core?.group) this.group.position.copy(this.core.group.position);
      scene.add(this.group);
    } catch (err) {
      console.warn('[FLG] GoldBokehField init failed:', err?.message || err);
      this.dispose();
    }
  }

  counts() {
    if (this.profile.reduced) return { bokeh: 22, sparks: 30, teal: 10 };
    if (this.profile.mobile) return { bokeh: 58, sparks: 92, teal: 42 };
    if (this.profile.lowPower) return { bokeh: 84, sparks: 136, teal: 68 };
    return { bokeh: 190, sparks: 250, teal: 176 };
  }

  colorForType(type, i) {
    const THREE = this.THREE;
    if (type === 2) return new THREE.Color(i % 2 ? OPTICAL_TEAL : RAPHAEL_CYAN_SOFT);
    if (type === 1) return new THREE.Color(i % 3 === 0 ? SPIRITRON_WHITE : RAPHAEL_GOLD_CORE);
    const palette = [WARM_GOLD_NODE, RAPHAEL_AMBER, BRIGHT_GOLD, RAPHAEL_GOLD_CORE];
    return new THREE.Color(palette[i % palette.length]);
  }

  createField() {
    const THREE = this.THREE;
    const counts = this.counts();
    this.count = counts.bokeh + counts.sparks + counts.teal;
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.scales = new Float32Array(this.count);
    this.types = new Float32Array(this.count);

    let cursor = 0;
    const addParticle = (type, localIndex) => {
      const i = cursor++;
      this.types[i] = type;
      const seed = i + type * 1000;
      const band = pseudo(seed, 1);
      const edgeBias = type === 0 ? Math.pow(pseudo(seed, 2), 0.62) : Math.pow(pseudo(seed, 2), 0.82);
      const angle = pseudo(seed, 3) * TAU;
      const sidePush = type === 0 && localIndex % 5 === 0 ? (localIndex % 2 ? 1.1 : -1.1) : 0;
      const radius = type === 0
        ? 5.4 + edgeBias * (this.profile.mobile ? 19 : 31)
        : type === 1
          ? 4.2 + edgeBias * (this.profile.mobile ? 22 : 36)
          : 9.5 + edgeBias * (this.profile.mobile ? 22 : 42);
      const ySpread = this.profile.mobile ? 17 : 24;
      const x = Math.cos(angle) * radius + sidePush * (this.profile.mobile ? 4 : 9);
      const y = (band - 0.5) * ySpread + Math.sin(angle * 2.0) * (type === 0 ? 2.0 : 0.8);
      const z = type === 0 && localIndex % 6 === 0
        ? -2 + pseudo(seed, 4) * 7
        : -12 + pseudo(seed, 4) * (type === 0 ? 18 : 22);
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = clamp(z, -15, 5);
      this.scales[i] = type === 0
        ? 1.75 + pseudo(seed, 5) * 4.25
        : type === 1
          ? 0.46 + pseudo(seed, 5) * 1.18
          : 0.64 + pseudo(seed, 5) * 1.18;
      const color = this.colorForType(type, i);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      this.meta.push({
        type,
        baseX: x,
        baseY: y,
        baseZ: z,
        angle,
        radius,
        speed: (0.002 + pseudo(seed, 6) * 0.008) * (pseudo(seed, 7) > 0.5 ? 1 : -1),
        drift: pseudo(seed, 8) * TAU,
      });
    };

    for (let i = 0; i < counts.bokeh; i++) addParticle(0, i);
    for (let i = 0; i < counts.sparks; i++) addParticle(1, i);
    for (let i = 0; i < counts.teal; i++) addParticle(2, i);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(this.scales, 1));
    this.geometry.setAttribute('aType', new THREE.BufferAttribute(this.types, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: this.profile.mobile ? 9.6 : this.profile.lowPower ? 14.0 : 21.0 },
        uOpacity: { value: this.profile.reduced ? 0.10 : this.profile.mobile ? 0.18 : 0.25 },
        uEnergy: { value: 0 },
        uWarp: { value: 0 },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aType;
        varying vec3 vColor;
        varying float vScale;
        varying float vType;
        uniform float uSize;
        uniform float uWarp;
        void main() {
          vColor = color;
          vScale = aScale;
          vType = aType;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float typeBoost = aType > 1.5 ? 0.86 : mix(1.0, 0.42, step(0.5, aType));
          gl_PointSize = uSize * aScale * typeBoost * (170.0 / max(18.0, -mv.z)) * (1.0 + uWarp * 0.18);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vScale;
        varying float vType;
        uniform float uOpacity;
        uniform float uEnergy;
        uniform float uWarp;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float bokeh = smoothstep(0.5, 0.0, d);
          float core = smoothstep(0.16, 0.0, d);
          float ring = smoothstep(0.24, 0.19, abs(d - 0.22));
          float spark = max(core, ring * 0.36);
          float isSpark = step(0.5, vType);
          float isTeal = step(1.5, vType);
          vec3 color = vColor * (0.54 + core * 1.1 + uEnergy * 0.18);
          color += vec3(1.0, 0.88, 0.52) * core * (1.0 - isTeal) * 0.42;
          color += vec3(0.18, 0.92, 1.0) * core * isTeal * 0.58;
          float alpha = mix(bokeh * (0.40 + vScale * 0.08), spark * (0.72 + vScale * 0.12), isSpark);
          alpha *= uOpacity * mix(1.08, 2.15, isTeal) * (1.0 + uWarp * 0.20);
          gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.82));
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.renderOrder = 5;
    this.group.add(this.points);
  }

  update(dt, time, state = {}) {
    if (this.core?.group) this.group.position.copy(this.core.group.position);
    const energy = clamp(state.energy || 0, 0, 1);
    const warp = clamp(state.warp || 0, 0, 1);
    if (this.material) {
      this.material.uniforms.uEnergy.value = energy;
      this.material.uniforms.uWarp.value = warp;
    }
    if (this.reduced || !this.geometry) return;
    for (let i = 0; i < this.meta.length; i++) {
      const p = this.meta[i];
      const radius = p.radius * (1 - warp * (p.type === 0 ? 0.08 : 0.16));
      const angle = p.angle + time * p.speed * (1 + energy * 0.4 + warp * 2.0);
      const drift = Math.sin(time * 0.16 + p.drift) * (p.type === 0 ? 0.55 : 0.18);
      this.positions[i * 3] = Math.cos(angle) * radius + drift * 0.6;
      this.positions[i * 3 + 1] = p.baseY + Math.sin(time * 0.11 + p.drift) * (p.type === 0 ? 0.45 : 0.18);
      this.positions[i * 3 + 2] = clamp(p.baseZ + Math.sin(angle) * (p.type === 0 ? 0.8 : 0.35), -15, 5);
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

export { GoldBokehField };
