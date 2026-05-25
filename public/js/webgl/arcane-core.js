// @ts-nocheck

import {
  TAU,
  BRIGHT_GOLD,
  RAPHAEL_CYAN_SOFT,
  RAPHAEL_AMBER,
  RAPHAEL_GOLD,
  RAPHAEL_GOLD_CORE,
  WARM_GOLD_NODE,
  SPIRITRON_WHITE,
  OPTICAL_TEAL,
  DEEP_LENS_BLUE,
} from './constants.js';
import { clamp, lerp } from './math-utils.js';
import { disposeObjectTree } from './dispose-utils.js';
import { makeRuneMaterial, makeParticleMaterial } from './materials.js';

class ArcaneSingularityCore {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.zOffset = 0.5;
    this.group = new THREE.Group();
    this.group.name = "Arcane Singularity Core";
    this.group.position.copy(core.group.position);
    this.group.position.z += this.zOffset;

    this.rings = [];
    this.lights = [];
    this.tickRings = [];

    try {
      if (profile.reduced) {
        this.createReduced(THREE);
      } else {
        this.createSingularityCore(THREE);
        this.createCyanRings(THREE, profile.mobile ? 3 : 6);
        this.createGoldComputationRings(THREE, profile);
        this.createTickRings(THREE, profile);
        this.createGlyphLattice(THREE, profile);
        const goldSparks = profile.mobile ? 72 : profile.lowPower ? 64 : 240;
        const cyanRefractions = profile.mobile ? 12 : profile.lowPower ? 10 : 42;
        this.createBokehField(THREE, goldSparks, cyanRefractions);
        this.createColdLights(THREE, profile);
      }
      scene.add(this.group);
    } catch (err) {
      console.warn("[FLG] ArcaneSingularityCore init failed, reverting to reduced:", err?.message || err);
      this.dispose();
      this.createReduced(THREE);
      scene.add(this.group);
    }
  }

  dispose() {
    if (this.group) {
      disposeObjectTree(this.group);
      this.group.removeFromParent?.();
    }
    this.rings = [];
    this.lights = [];
    this.tickRings = [];
    this.coreMesh = null;
    this.wireShell = null;
    this.lattice = null;
    this.dotNodes = null;
    this.cyanNodes = null;
    this.warmField = null;
    this.coolField = null;
    this.cyanLight = null;
    this.blueLight = null;
    this.goldLight = null;
    this.crossStarburst = null;
    this.glassShell = null;
  }

  createSingularityCore(THREE) {
    const geo = new THREE.IcosahedronGeometry(1.8, 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uWarp: { value: 0 },
        uColor1: { value: new THREE.Color(RAPHAEL_AMBER) },
        uColor2: { value: new THREE.Color(RAPHAEL_GOLD_CORE) },
        uRimColor: { value: new THREE.Color(SPIRITRON_WHITE) },
      },
      vertexShader: [
        "varying vec3 vNormal;",
        "varying vec3 vPosition;",
        "uniform float uTime;",
        "uniform float uWarp;",
        "void main() {",
        "  vNormal = normalize(normalMatrix * normal);",
        "  vec3 p = position;",
        "  float pulse = 1.0 + 0.04 * sin(uTime * 1.6) + 0.06 * uWarp;",
        "  p *= pulse;",
        "  vPosition = p;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision highp float;",
        "varying vec3 vNormal;",
        "varying vec3 vPosition;",
        "uniform float uTime;",
        "uniform float uEnergy;",
        "uniform float uWarp;",
        "uniform vec3 uColor1;",
        "uniform vec3 uColor2;",
        "uniform vec3 uRimColor;",
        "void main() {",
        "  float rim = 1.0 - abs(dot(vNormal, normalize(vPosition)));",
        "  float glow = pow(rim, 2.8);",
        "  float pulse = 0.5 + 0.5 * sin(uTime * 1.35 + length(vPosition) * 2.0);",
        "  float core = 1.0 - smoothstep(1.0, 2.45, length(vPosition));",
        "  float angle = atan(vPosition.y, vPosition.x);",
        "  float star = pow(abs(cos(angle * 8.0 + uTime * 0.22)), 16.0) * smoothstep(1.9, 0.18, length(vPosition.xy));",
        "  vec3 col = mix(uColor1, uColor2, 0.30 + pulse * 0.16 + uEnergy * 0.10);",
        "  col += uColor1 * (core * 0.72 + (1.0 - rim) * 0.22);",
        "  col += uColor2 * (core * 0.34 + glow * 0.10);",
        "  col += uRimColor * (core * 0.24 + star * 0.32 + glow * 0.12 + uWarp * 0.04);",
        "  col *= 0.90 + 0.18 * pulse;",
        "  float alpha = 0.28 + glow * 0.18 + core * 0.28 + star * 0.12 + uEnergy * 0.08 + uWarp * 0.10;",
        "  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 0.82));",
        "}",
      ].join("\n"),
    });
    mat.depthTest = false;
    this.coreMesh = new THREE.Mesh(geo, mat);
    this.coreMesh.renderOrder = 1;
    this.coreMesh.scale.setScalar(0.5);
    this.group.add(this.coreMesh);

    const wireGeo = new THREE.IcosahedronGeometry(2.6, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: WARM_GOLD_NODE,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    wireMat.depthTest = false;
    this.wireShell = new THREE.Mesh(wireGeo, wireMat);
    this.wireShell.renderOrder = 2;
    this.wireShell.scale.setScalar(0.55);
    this.group.add(this.wireShell);

    this.createGlassRefractionShell(THREE);
    this.createCrossStarburst(THREE);
  }

  createGlassRefractionShell(THREE) {
    const geo = new THREE.SphereGeometry(2.2, this.profile.mobile ? 28 : 40, this.profile.mobile ? 14 : 22);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uWarp: { value: 0 },
        uWarm: { value: new THREE.Color(RAPHAEL_GOLD_CORE) },
        uEdge: { value: new THREE.Color(OPTICAL_TEAL) },
        uWhite: { value: new THREE.Color(SPIRITRON_WHITE) },
      },
      vertexShader: [
        "varying vec3 vNormal;",
        "varying vec3 vWorld;",
        "void main() {",
        "  vNormal = normalize(normalMatrix * normal);",
        "  vec4 world = modelMatrix * vec4(position, 1.0);",
        "  vWorld = world.xyz;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision highp float;",
        "varying vec3 vNormal;",
        "varying vec3 vWorld;",
        "uniform float uTime;",
        "uniform float uEnergy;",
        "uniform float uWarp;",
        "uniform vec3 uWarm;",
        "uniform vec3 uEdge;",
        "uniform vec3 uWhite;",
        "void main() {",
        "  vec3 viewDir = normalize(cameraPosition - vWorld);",
        "  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.2);",
        "  float meridian = pow(abs(sin(atan(vNormal.y, vNormal.x) * 6.0 + uTime * 0.16)), 14.0);",
        "  float latitude = pow(abs(sin(vNormal.y * 9.0 - uTime * 0.12)), 10.0);",
        "  float caustic = (meridian * 0.45 + latitude * 0.28) * (0.72 + uEnergy * 0.28 + uWarp * 0.18);",
        "  vec3 col = uWarm * (caustic * 0.44) + uWhite * (fresnel * 0.34) + uEdge * (fresnel * 0.22 + caustic * 0.08);",
        "  float alpha = fresnel * 0.15 + caustic * 0.10;",
        "  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 0.22));",
        "}",
      ].join("\n"),
    });
    this.glassShell = new THREE.Mesh(geo, mat);
    this.glassShell.name = "Singularity Glass Refraction Shell";
    this.glassShell.renderOrder = 2;
    this.glassShell.scale.setScalar(this.profile.mobile ? 0.72 : 0.82);
    this.group.add(this.glassShell);
  }

  createReduced(THREE) {
    const geo = new THREE.IcosahedronGeometry(1.4, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: RAPHAEL_GOLD_CORE,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.coreMesh = new THREE.Mesh(geo, mat);
    this.coreMesh.renderOrder = 1;
    this.group.add(this.coreMesh);

    const ringMat = makeRuneMaterial(THREE, {
      color: RAPHAEL_CYAN_SOFT,
      opacity: 0.12,
      density: 24,
      seed: 7,
      thickness: 0.4,
    });
    ringMat.depthTest = false;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.028, 5, 120), ringMat);
    ring.renderOrder = 3;
    this.group.add(ring);
    this.rings.push({ mesh: ring, mat: ringMat, speed: 0, axis: "y" });

    const goldMat = makeRuneMaterial(THREE, {
      color: RAPHAEL_GOLD,
      opacity: 0.14,
      density: 20,
      seed: 17,
      thickness: 0.32,
    });
    goldMat.depthTest = false;
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.024, 5, 112), goldMat);
    goldRing.renderOrder = 4;
    goldRing.rotation.x = Math.PI / 2.6;
    this.group.add(goldRing);
    this.rings.push({ mesh: goldRing, mat: goldMat, speed: 0, axis: "z" });

    this.createCrossStarburst(THREE);
  }

  createCrossStarburst(THREE) {
    const width = this.profile.mobile ? 2.75 : this.profile.lowPower ? 3.1 : 3.65;
    const height = this.profile.mobile ? 1.35 : this.profile.lowPower ? 1.55 : 1.8;
    const opacity = this.profile.reduced ? 0.08 : this.profile.mobile ? 0.12 : this.profile.lowPower ? 0.14 : 0.19;
    const geo = new THREE.PlaneGeometry(width, height, 1, 1);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uWarp: { value: 0 },
        uOpacity: { value: opacity },
        uHot: { value: new THREE.Color(SPIRITRON_WHITE) },
        uGold: { value: new THREE.Color(RAPHAEL_GOLD_CORE) },
      },
      vertexShader: [
        "varying vec2 vUv;",
        "void main() {",
        "  vUv = uv;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision highp float;",
        "varying vec2 vUv;",
        "uniform float uTime;",
        "uniform float uEnergy;",
        "uniform float uWarp;",
        "uniform float uOpacity;",
        "uniform vec3 uHot;",
        "uniform vec3 uGold;",
        "void main() {",
        "  vec2 p = vUv - 0.5;",
        "  float horizontal = smoothstep(0.47, 0.03, abs(p.x)) * smoothstep(0.020, 0.0, abs(p.y));",
        "  float vertical = smoothstep(0.26, 0.015, abs(p.y)) * smoothstep(0.014, 0.0, abs(p.x));",
        "  float core = smoothstep(0.070, 0.0, length(p));",
        "  float halo = smoothstep(0.22, 0.0, length(p)) * 0.18;",
        "  float pulse = 0.86 + 0.14 * sin(uTime * 1.2);",
        "  float warpGlint = 1.0 + uWarp * 0.24 + uEnergy * 0.12;",
        "  float alpha = (horizontal * 0.54 + vertical * 0.42 + core * 0.78 + halo) * uOpacity * pulse * warpGlint;",
        "  vec3 col = mix(uGold, uHot, clamp(core * 1.2 + horizontal * 0.18 + vertical * 0.16, 0.0, 1.0));",
        "  col += uGold * (horizontal + vertical) * 0.10;",
        "  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 0.32));",
        "}",
      ].join("\n"),
    });
    this.crossStarburst = new THREE.Mesh(geo, mat);
    this.crossStarburst.name = "Singularity Cross Starburst";
    this.crossStarburst.position.z = 0.55;
    this.crossStarburst.renderOrder = 6;
    this.group.add(this.crossStarburst);
  }

  createCyanRings(THREE, count) {
    const colors = [RAPHAEL_GOLD_CORE, WARM_GOLD_NODE, RAPHAEL_AMBER, BRIGHT_GOLD, OPTICAL_TEAL, WARM_GOLD_NODE];
    for (let i = 0; i < count; i++) {
      const radius = 3.0 + i * 1.4;
      const tube = 0.040 - i * 0.003;
      const mat = makeRuneMaterial(THREE, {
        color: colors[i % colors.length],
        opacity: Math.max(0.14, 0.38 - i * 0.035),
        density: 32 + i * 14,
        seed: 50 + i * 23,
        thickness: 0.3 + (i % 3) * 0.1,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, Math.max(0.016, tube), 6, 180 + i * 20),
        mat
      );
      ring.rotation.set(i * 0.5, i * 0.35, i * 0.18);
      mat.depthTest = false;
      ring.renderOrder = 3;
      this.group.add(ring);
      this.rings.push({
        mesh: ring,
        mat,
        speed: (0.05 + i * 0.015) * (i % 2 ? -1 : 1),
        axis: ["x", "y", "z"][i % 3],
      });
    }
  }

  createGoldComputationRings(THREE, profile) {
    const ringCount = profile.mobile || profile.lowPower ? 1 : 2;
    const configs = [
      { radius: 3.85, tube: 0.024, opacity: 0.26, density: 64, seed: 121, speed: 0.036, axis: "z", tilt: Math.PI / 2.75 },
      { radius: 5.35, tube: 0.018, opacity: 0.18, density: 92, seed: 177, speed: -0.026, axis: "y", tilt: Math.PI / 3.4 },
    ];

    for (let i = 0; i < ringCount; i++) {
      const cfg = configs[i];
      const mat = makeRuneMaterial(THREE, {
        color: i === 0 ? RAPHAEL_GOLD_CORE : RAPHAEL_GOLD,
        opacity: cfg.opacity,
        density: cfg.density,
        seed: cfg.seed,
        thickness: 0.24 + i * 0.08,
      });
      mat.depthTest = false;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.radius, cfg.tube, 6, 180), mat);
      ring.rotation.set(cfg.tilt, i * 0.4, i * 0.22);
      ring.renderOrder = 4;
      this.group.add(ring);
      this.rings.push({
        mesh: ring,
        mat,
        speed: cfg.speed,
        axis: cfg.axis,
      });
    }
  }

  createTickRings(THREE, profile) {
    const ringCount = profile.mobile ? 2 : 3;
    const configs = [
      { radius: 4.6, ticks: 24, speed: 0.06, axis: "y", color: RAPHAEL_GOLD_CORE, opacity: 0.18 },
      { radius: 6.6, ticks: 36, speed: -0.04, axis: "x", color: WARM_GOLD_NODE, opacity: 0.14 },
      { radius: 8.8, ticks: 48, speed: 0.03, axis: "z", color: OPTICAL_TEAL, opacity: 0.09 },
    ];
    for (let r = 0; r < Math.min(ringCount, configs.length); r++) {
      const cfg = configs[r];
      const tickLen = 0.12 + r * 0.02;
      const positions = [];
      for (let i = 0; i < cfg.ticks; i++) {
        const a = (i / cfg.ticks) * TAU;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const yOff = Math.sin(i * 1.3 + r * 0.7) * 0.1;
        positions.push(
          cos * (cfg.radius - tickLen), yOff, sin * (cfg.radius - tickLen),
          cos * (cfg.radius + tickLen), yOff, sin * (cfg.radius + tickLen),
        );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });
      const mesh = new THREE.LineSegments(geo, mat);
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.tickRings.push({ mesh, speed: cfg.speed, axis: cfg.axis });
    }
  }

  createGlyphLattice(THREE, profile) {
    const lineCount = profile.reduced ? 20 : profile.mobile ? 48 : profile.lowPower ? 72 : 120;
    const lines = [];
    const baseRadius = 4.5;
    const spread = profile.mobile ? 12 : profile.lowPower ? 16 : 22;

    for (let i = 0; i < lineCount; i++) {
      const t = lineCount > 1 ? i / (lineCount - 1) : 0;
      const angle = t * TAU * 2.5;
      const radius = baseRadius + t * spread;
      const yOff = Math.sin(t * TAU * 4) * (profile.mobile ? 1.5 : 3);
      const r1 = radius * 0.85;
      const r2 = radius;

      if (i % 3 === 0) {
        const next = (i + 7) % lineCount;
        const nt = next / lineCount;
        const na = nt * TAU * 2.5;
        const nr = baseRadius + nt * spread;
        lines.push(
          Math.cos(angle) * r1, yOff + Math.sin(t * 6) * 0.5, Math.sin(angle) * r1 * 0.5,
          Math.cos(na) * nr, yOff + Math.sin(nt * 6) * 0.5, Math.sin(na) * nr * 0.5,
        );
      } else {
        lines.push(
          Math.cos(angle) * r1, yOff, Math.sin(angle) * r1 * 0.5,
          Math.cos(angle) * r2 * 1.15, yOff, Math.sin(angle) * r2 * 0.5,
        );
      }
    }

    const tickCount = profile.mobile ? 24 : profile.lowPower ? 36 : 60;
    for (let k = 0; k < tickCount; k++) {
      const a = (k / tickCount) * TAU + Math.sin(k * 0.7) * 0.06;
      const baseR = 4.2 + (k % 7) * 1.4;
      const tickLen = 0.05 + (k % 4) * 0.015;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const yOff = Math.sin(k * 2.1) * 0.12;
      lines.push(
        cos * (baseR - tickLen), yOff, sin * (baseR - tickLen),
        cos * (baseR + tickLen), yOff, sin * (baseR + tickLen),
      );
    }

    const arcCount = profile.mobile ? 2 : 4;
    for (let k = 0; k < arcCount; k++) {
      const arcR = 5.5 + k * 2.0;
      const startA = k * 1.3 + 0.2;
      const arcLen = 0.4 + k * 0.12;
      const segs = profile.mobile ? 4 : 8;
      for (let j = 0; j < segs; j++) {
        const a1 = startA + (j / segs) * arcLen;
        const a2 = startA + ((j + 1) / segs) * arcLen;
        lines.push(
          Math.cos(a1) * arcR, Math.sin(j * 2.3) * 0.08, Math.sin(a1) * arcR * 0.5,
          Math.cos(a2) * arcR, Math.sin((j + 1) * 2.3) * 0.08, Math.sin(a2) * arcR * 0.5,
        );
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const mat = new THREE.LineBasicMaterial({
      color: WARM_GOLD_NODE,
      transparent: true,
      opacity: profile.reduced ? 0.06 : 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.lattice = new THREE.LineSegments(geo, mat);
    this.lattice.renderOrder = 4;
    this.group.add(this.lattice);

    const goldDots = [];
    const cyanDots = [];
    const dotCount = profile.mobile ? 16 : profile.lowPower ? 24 : 42;
    for (let i = 0; i < dotCount; i++) {
      const t = i / dotCount;
      const angle = t * TAU * (2 + (i % 3) * 0.3);
      const radius = baseRadius + t * spread * 0.65 + (i % 5) * 0.3;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(t * TAU * 3 + i * 0.2) * (1.2 + (i % 3) * 0.3);
      const z = Math.sin(angle) * radius * 0.5;
      if (i % 2 === 0) {
        goldDots.push(x, y, z);
      } else {
        cyanDots.push(x, y, z);
      }
    }

    const createDots = (positions, color, size) => {
      if (positions.length === 0) return null;
      const dg = new THREE.BufferGeometry();
      dg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const dm = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });
      const dots = new THREE.Points(dg, dm);
      this.group.add(dots);
      return dots;
    };

    const dotSize = profile.mobile ? 0.14 : profile.lowPower ? 0.16 : 0.22;
    this.dotNodes = createDots(goldDots, WARM_GOLD_NODE, dotSize);
    this.cyanNodes = createDots(cyanDots, OPTICAL_TEAL, dotSize * 0.85);
    if (this.dotNodes) this.dotNodes.renderOrder = 5;
    if (this.cyanNodes) this.cyanNodes.renderOrder = 5;
  }

  createBokehField(THREE, goldSparkCount, cyanRefractionCount) {
    const create = (count, color, size, opacityBase, radiusBase, depthSpread) => {
      const pos = new Float32Array(count * 3);
      const scale = new Float32Array(count);
      const meta = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * TAU;
        const radius = radiusBase * (0.3 + Math.random() * 1.3);
        const y = (Math.random() - 0.5) * (depthSpread || 20);
        const z = (Math.random() - 0.5) * (depthSpread ? depthSpread * 0.8 : 16);
        pos[i * 3] = Math.cos(angle) * radius;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(angle) * radius * 0.5 + z;
        scale[i] = 0.4 + Math.random() * 2.0;
        meta.push({
          angle, radius, baseRadius: radius, y, z,
          speed: (0.008 + Math.random() * 0.04) * (Math.random() > 0.5 ? 1 : -1),
          drift: Math.random() * TAU,
        });
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
      const mat = makeParticleMaterial(THREE, color, size, opacityBase);
      const points = new THREE.Points(geo, mat);
      points.position.copy(this.core.group.position);
      this.group.add(points);
      return { points, geometry: geo, material: mat, position: pos, meta };
    };

    this.warmField = create(goldSparkCount, WARM_GOLD_NODE, 5.4, 0.36, 5.8, 10);
    this.coolField = create(cyanRefractionCount, OPTICAL_TEAL, 3.2, 0.028, 20, 30);
    if (this.warmField) { this.warmField.material.depthTest = false; this.warmField.points.renderOrder = 1; }
    if (this.coolField) { this.coolField.material.depthTest = false; this.coolField.points.renderOrder = 1; }
  }

  createColdLights(THREE, profile) {
    const mul = profile.lowPower ? 0.4 : 1;
    this.goldLight = new THREE.PointLight(WARM_GOLD_NODE, 1.35 * mul, 30);
    this.goldLight.position.set(-2, 1.5, 8);
    this.group.add(this.goldLight);
    this.lights.push(this.goldLight);
    this.cyanLight = new THREE.PointLight(RAPHAEL_CYAN_SOFT, 0.62 * mul, 30);
    this.cyanLight.position.set(6, 4, 8);
    this.group.add(this.cyanLight);
    this.lights.push(this.cyanLight);
    this.blueLight = new THREE.PointLight(DEEP_LENS_BLUE, 0.55 * mul, 42);
    this.blueLight.position.set(-5, -3, 12);
    this.group.add(this.blueLight);
    this.lights.push(this.blueLight);
  }

  updateField(field, dt, time, state) {
    if (!field) return;
    const arr = field.position;
    const center = this.core.group.position;
    const warp = state.warp;
    for (let i = 0; i < field.meta.length; i++) {
      const p = field.meta[i];
      p.angle += p.speed * dt * (1 + warp * 3);
      const attraction = warp > 0
        ? lerp(p.baseRadius, 2 + (i % 5) * 0.5, clamp(warp * 1.15, 0, 1))
        : p.baseRadius;
      p.radius = lerp(p.radius, attraction, dt * (0.3 + warp * 2));
      const drft = Math.sin(time * 0.2 + p.drift) * (0.5 + state.energy);
      arr[i * 3] = center.x + Math.cos(p.angle) * p.radius + drft * 0.3;
      arr[i * 3 + 1] = center.y + p.y + drft * 0.15 + state.energy * 0.2;
      arr[i * 3 + 2] = center.z + Math.sin(p.angle) * p.radius * 0.5;
    }
    field.geometry.attributes.position.needsUpdate = true;
    field.material.uniforms.uTime.value = time;
    field.material.uniforms.uWarp.value = warp;
    field.material.uniforms.uOpacity.value = field === this.coolField
          ? 0.026 + state.energy * 0.012 + warp * 0.025
          : 0.30 + state.energy * 0.07 + warp * 0.12;
  }

  update(dt, time, state) {
    this.group.position.copy(this.core.group.position);
    this.group.position.z += this.zOffset;
    const motionScale = this.profile.reduced ? 0 : 1;
    const phase = state.stepped?.phase ?? 'idle';
    const pulse = state.stepped?.pulse ?? 1;
    const stepIndex = state.stepped?.stepIndex ?? 0;
    const steppedTime = phase === 'idle' ? time : stepIndex + pulse;
    const phaseBoost = phase === 'idle' ? 1 : 1 + pulse * 0.28;
    const stepGlow = phase === 'idle' ? 0 : pulse * 0.045 + stepIndex * 0.004;

    if (this.coreMesh) {
      this.coreMesh.rotation.x += dt * 0.15 * motionScale;
      this.coreMesh.rotation.y += dt * 0.25 * motionScale;
      if (this.coreMesh.material.uniforms) {
        this.coreMesh.material.uniforms.uTime.value = time;
        this.coreMesh.material.uniforms.uEnergy.value = state.energy;
        this.coreMesh.material.uniforms.uWarp.value = state.warp;
      }
    }

    if (this.wireShell) {
      this.wireShell.rotation.x += dt * -0.08 * motionScale;
      this.wireShell.rotation.y += dt * 0.18 * motionScale;
    }

    if (this.glassShell?.material?.uniforms) {
      this.glassShell.rotation.y += dt * 0.045 * motionScale * phaseBoost;
      this.glassShell.rotation.z += dt * -0.025 * motionScale * phaseBoost;
      const uniforms = this.glassShell.material.uniforms;
      uniforms.uTime.value = phase === 'idle' ? time : steppedTime;
      uniforms.uEnergy.value = state.energy;
      uniforms.uWarp.value = state.warp;
    }

    if (this.crossStarburst?.material?.uniforms) {
      const uniforms = this.crossStarburst.material.uniforms;
      uniforms.uTime.value = this.profile.reduced ? 0 : steppedTime;
      uniforms.uEnergy.value = state.energy;
      uniforms.uWarp.value = state.warp;
      const baseOpacity = this.profile.reduced ? 0.08 : this.profile.mobile ? 0.12 : this.profile.lowPower ? 0.14 : 0.19;
      uniforms.uOpacity.value = baseOpacity + state.energy * 0.018 + state.warp * 0.025 + stepGlow;
    }

    for (const r of this.rings) {
      r.mesh.rotation[r.axis] += dt * r.speed * (1 + state.warp * 6) * motionScale * phaseBoost;
      if (r.mat.uniforms) {
        r.mat.uniforms.uTime.value = phase === 'idle' ? time : steppedTime;
        r.mat.uniforms.uWarp.value = state.warp;
        r.mat.uniforms.uEnergy.value = state.energy;
      }
    }

    for (const t of this.tickRings) {
      t.mesh.rotation[t.axis] += dt * t.speed * (1 + state.warp * 4) * motionScale * phaseBoost;
    }

    if (this.lattice) {
      this.lattice.rotation.y += dt * (0.04 + state.warp * 0.3) * motionScale * phaseBoost;
      this.lattice.material.opacity = 0.10 + state.energy * 0.04 + state.warp * 0.12 + stepGlow;
    }

    if (this.dotNodes) {
      this.dotNodes.rotation.y += dt * (0.03 + state.warp * 0.2) * motionScale;
    }

    if (this.cyanNodes) {
      this.cyanNodes.rotation.y += dt * (0.035 + state.warp * 0.25) * motionScale;
    }

    if (this.warmField && motionScale > 0) {
      this.updateField(this.warmField, dt, time, state);
      this.updateField(this.coolField, dt, time, state);
    }

    for (const light of this.lights) {
      if (light === this.cyanLight) {
        light.intensity = (0.24 + state.energy * 0.14 + state.warp * 0.22 + Math.sin(time * 0.7) * 0.04 * motionScale) * (this.profile.lowPower ? 0.4 : 1);
      } else if (light === this.goldLight) {
        light.intensity = (1.22 + state.energy * 0.78 + state.warp * 1.18 + Math.sin(time * 0.9) * 0.16 * motionScale) * (this.profile.lowPower ? 0.4 : 1);
      } else {
        light.intensity = (0.36 + state.energy * 0.24 + state.warp * 0.5) * (this.profile.lowPower ? 0.4 : 1);
      }
    }
  }
}

export { ArcaneSingularityCore };
