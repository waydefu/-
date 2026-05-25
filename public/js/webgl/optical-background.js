// @ts-nocheck

import {
  TAU,
  WARM_GOLD_NODE,
  RAPHAEL_AMBER,
  SPIRITRON_WHITE,
  OPTICAL_TEAL,
  OPTICAL_TEAL_DEEP,
  DEEP_LENS_BLUE,
} from './constants.js';
import { clamp, lerp } from './math-utils.js';
import { disposeObjectTree } from './dispose-utils.js';
import { makeRuneMaterial, makeParticleMaterial } from './materials.js';

class ArcaneOpticalBackground {
  constructor(THREE, scene, profile) {
    this.THREE = THREE;
    this.profile = profile;
    this.group = new THREE.Group();
    this.group.name = "Arcane Optical Background";

    this.bokehLayers = [];
    this.halos = [];
    this.hazeMesh = null;

    try {
      if (!profile.reduced) {
        this.createBokehField(THREE, profile);
        this.createLensHalos(THREE, profile);
        if (!profile.lowPower && !profile.mobile) {
          this.createRadialHaze(THREE, profile);
        }
      }
      scene.add(this.group);
    } catch (err) {
      console.warn("[FLG] ArcaneOpticalBackground init failed:", err?.message || err);
      this.dispose();
    }
  }

  dispose() {
    if (this.group) {
      disposeObjectTree(this.group);
      this.group.removeFromParent?.();
    }
    this.bokehLayers = [];
    this.halos = [];
    this.hazeMesh = null;
  }

  createBokehField(THREE, profile) {
    const tealCount = profile.mobile ? 64 : profile.lowPower ? 58 : 252;
    const amberCount = profile.mobile ? 30 : profile.lowPower ? 24 : 84;
    if (tealCount + amberCount === 0) return;

    const total = tealCount + amberCount;
    const pos = new Float32Array(total * 3);
    const scale = new Float32Array(total);
    const layer = new Float32Array(total);
    const meta = [];
    const spread = profile.mobile ? 55 : 65;
    const depth = profile.mobile ? 30 : 50;

    for (let i = 0; i < total; i++) {
      const isTeal = i < tealCount;
      layer[i] = isTeal ? 0 : 1;
      const angle = Math.random() * TAU;
      const r = (isTeal ? 0 : 13) + Math.random() * (isTeal ? spread * 0.92 : spread * 0.72);
      const y = (Math.random() - 0.5) * spread * 0.7;
      const z = (Math.random() - 0.5) * depth;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * r * 0.35 + z;
      scale[i] = 0.6 + Math.random() * 1.8;
      meta.push({
        angle,
        radius: r,
        baseRadius: r,
        y,
        z,
        speed: (0.003 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1),
        drift: Math.random() * TAU,
        isTeal,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    geo.setAttribute("aLayer", new THREE.BufferAttribute(layer, 1));

    const size = profile.mobile ? 7 : profile.lowPower ? 7 : 14;
    const opacityBase = profile.mobile ? 0.04 : profile.lowPower ? 0.038 : 0.064;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uWarp: { value: 0 },
        uSize: { value: size },
        uOpacity: { value: opacityBase },
        uColor1: { value: new THREE.Color(OPTICAL_TEAL) },
        uColor2: { value: new THREE.Color(WARM_GOLD_NODE) },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aLayer;
        varying float vScale;
        varying float vLayer;
        uniform float uSize;
        uniform float uWarp;
        void main() {
          vScale = aScale;
          vLayer = aLayer;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * aScale * (180.0 / max(20.0, -mv.z)) * (1.0 + uWarp * 0.5);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vScale;
        varying float vLayer;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uOpacity;
        uniform float uWarp;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float core = smoothstep(0.48, 0.0, d);
          float glow = smoothstep(0.42, 0.0, d);
          vec3 col = mix(uColor1, uColor2, vLayer * 0.66);
          vec3 edgeCore = mix(uColor1 * 0.82 + uColor2 * 0.18, uColor1 * 0.24 + uColor2 * 0.76, vLayer);
          col = mix(col, edgeCore, glow * 0.30);
          col += uColor2 * glow * 0.18 * vLayer;
          col += uColor1 * glow * 0.72 * (1.0 - vLayer);
          float edgeLift = mix(2.45, 0.78, vLayer);
          float alpha = core * uOpacity * (0.68 + vScale * 0.48) * edgeLift * (1.0 + uWarp * 0.24);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.30));
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    points.renderOrder = -2;
    this.group.add(points);
    this.bokehLayers.push({ points, geometry: geo, material: mat, position: pos, meta, tealCount });
  }

  createRadialHaze(THREE) {
    const geo = new THREE.RingGeometry(0.5, 35, 64);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.034 },
        uDeep: { value: new THREE.Color(DEEP_LENS_BLUE) },
        uCyan: { value: new THREE.Color(OPTICAL_TEAL) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uDeep;
        uniform vec3 uCyan;
        void main() {
          vec2 c = vUv - 0.5;
          float d = length(c) * 2.0;
          float glow = smoothstep(1.0, 0.0, d);
          float ring = smoothstep(0.28, 0.0, abs(d - 0.45)) * 0.34;
          float outer = smoothstep(0.16, 0.0, abs(d - 0.78)) * 0.22;
          vec3 col = mix(uCyan * 0.48, uDeep, smoothstep(0.2, 1.1, d));
          col += uCyan * (ring + outer) * 0.82;
          float pulse = 0.85 + 0.15 * sin(uTime * 0.15);
          float alpha = glow * uOpacity * pulse;
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.06));
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, -25);
    mesh.renderOrder = -3;
    this.group.add(mesh);
    this.hazeMesh = mesh;
  }

  createLensHalos(THREE, profile) {
    if (profile.mobile || profile.lowPower) return;

    const configs = [
      { radius: 18, tube: 0.014, color: SPIRITRON_WHITE, opacity: 0.028, speed: 0.01, axis: "z" },
      { radius: 23, tube: 0.018, color: WARM_GOLD_NODE, opacity: 0.052, speed: 0.008, axis: "y" },
      { radius: 32, tube: 0.012, color: RAPHAEL_AMBER, opacity: 0.038, speed: -0.005, axis: "x" },
      { radius: 39, tube: 0.008, color: OPTICAL_TEAL_DEEP, opacity: 0.016, speed: -0.003, axis: "z" },
      { radius: 46, tube: 0.006, color: OPTICAL_TEAL, opacity: 0.018, speed: 0.002, axis: "y" },
    ];

    for (const cfg of configs) {
      const mat = makeRuneMaterial(THREE, {
        color: cfg.color,
        opacity: cfg.opacity,
        density: 12,
        seed: 99,
        thickness: 0.2,
      });
      mat.depthTest = false;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.radius, cfg.tube, 5, 120),
        mat
      );
      ring.renderOrder = -1;
      ring.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.3);
      this.group.add(ring);
      this.halos.push({ mesh: ring, mat, speed: cfg.speed, axis: cfg.axis });
    }
  }

  updateBokeh(dt, time, state) {
    for (const layer of this.bokehLayers) {
      const arr = layer.position;
      const warp = state.warp;
      for (let i = 0; i < layer.meta.length; i++) {
        const p = layer.meta[i];
        p.angle += p.speed * dt * (1 + warp * 2);
        const drft = Math.sin(time * 0.08 + p.drift) * 0.25;
        const r = p.baseRadius + drft * (p.isTeal ? 0.3 : 0.5);
        arr[i * 3] = Math.cos(p.angle) * r;
        arr[i * 3 + 1] = p.y + Math.sin(time * 0.1 + p.drift) * 0.3;
        arr[i * 3 + 2] = Math.sin(p.angle) * r * 0.35 + p.z;
      }
      layer.geometry.attributes.position.needsUpdate = true;
      layer.material.uniforms.uTime.value = time;
      layer.material.uniforms.uWarp.value = warp;
      layer.material.uniforms.uOpacity.value = 0.082 + state.energy * 0.024 + warp * 0.022;
    }
  }

  update(dt, time, state) {
    if (this.bokehLayers.length > 0) {
      this.updateBokeh(dt, time, state);
    }

    for (const h of this.halos) {
      h.mesh.rotation[h.axis] += dt * h.speed * (1 + state.warp * 3);
      if (h.mat.uniforms) {
        h.mat.uniforms.uTime.value = time;
        h.mat.uniforms.uWarp.value = state.warp;
        h.mat.uniforms.uEnergy.value = state.energy;
      }
    }

    if (this.hazeMesh) {
      this.hazeMesh.material.uniforms.uTime.value = time;
    }
  }
}

export { ArcaneOpticalBackground };
