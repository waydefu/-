// @ts-nocheck

import { getAudioLevel } from './sfx.js';

let _fx = null;

const TAU = Math.PI * 2;
const GOLD = 0xe8a020;
const BRIGHT_GOLD = 0xffd47a;
const EMBER = 0xb84a18;
const RED = 0x7a140c;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

export const isWebGLAvailable = () => {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch (_) {
    return false;
  }
};

const getPerformanceProfile = (reduced) => {
  const coarse = !!window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = window.innerWidth < 780 || window.innerHeight < 620;
  const mobile = coarse || narrow;
  const memory = Number(navigator.deviceMemory || 8);
  const cores = Number(navigator.hardwareConcurrency || 8);
  const lowPower = reduced || mobile || memory <= 4 || cores <= 4;
  return {
    reduced,
    mobile,
    lowPower,
    runeLayers: reduced ? 10 : mobile ? 14 : 26,
    particleCount: reduced ? 520 : mobile ? 980 : 2400,
    dustCount: reduced ? 220 : mobile ? 420 : 880,
    fragmentCount: reduced ? 22 : mobile ? 42 : 76,
    pixelRatio: reduced ? 1 : mobile ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 1.65),
    useComposer: !reduced,
    useSao: !reduced && !mobile && cores >= 6,
    bloomStrength: reduced ? 0.12 : mobile ? 0.22 : 0.34,
    bloomRadius: mobile ? 0.28 : 0.38,
  };
};

const disposeMaterial = (material) => {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  Object.values(material).forEach((value) => {
    if (value && typeof value.dispose === "function" && value.isTexture) value.dispose();
  });
  material.dispose?.();
};

const disposeObjectTree = (root) => {
  root.traverse?.((obj) => {
    obj.geometry?.dispose?.();
    disposeMaterial(obj.material);
  });
};

const makeRuneMaterial = (THREE, {
  color = GOLD,
  opacity = 0.45,
  density = 34,
  seed = 1,
  thickness = 0.55,
} = {}) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uEnergy: { value: 0 },
    uOpacity: { value: opacity },
    uDensity: { value: density },
    uSeed: { value: seed },
    uThickness: { value: thickness },
    uColor: { value: new THREE.Color(color) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorld;
    uniform float uTime;
    uniform float uWarp;
    uniform float uSeed;
    void main() {
      vUv = uv;
      vec3 p = position;
      float wave = sin(uv.x * 37.0 + uSeed * 9.13 + uTime * (0.7 + uWarp * 2.2));
      p += normal * wave * (0.012 + uWarp * 0.035);
      vec4 world = modelMatrix * vec4(p, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    varying vec3 vWorld;
    uniform float uTime;
    uniform float uWarp;
    uniform float uEnergy;
    uniform float uOpacity;
    uniform float uDensity;
    uniform float uSeed;
    uniform float uThickness;
    uniform vec3 uColor;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      float x = vUv.x;
      float y = abs(vUv.y - 0.5) * 2.0;
      float edge = smoothstep(1.0, uThickness, y);
      float cell = floor(x * uDensity + uSeed);
      float n = hash(vec2(cell, floor(uSeed * 13.0)));
      float dash = smoothstep(0.46, 0.52, fract(x * uDensity + n * 0.31 + uTime * (0.035 + uWarp * 0.12)));
      float glyph = smoothstep(0.985, 1.0, sin((x * uDensity * 1.9 + n * 6.283 + uTime * 0.22) * 3.14159));
      float cut = step(0.16 + 0.34 * n, fract(x * (uDensity * 0.37 + n * 2.0)));
      float flicker = 0.62 + 0.38 * sin(uTime * (1.2 + n * 1.8) + uSeed * 4.0);
      float alpha = edge * uOpacity * (0.18 + dash * 0.42 + glyph * 0.58 + cut * 0.12);
      alpha *= flicker * (1.0 + uEnergy * 0.55 + uWarp * 0.72);
      vec3 color = uColor * (0.46 + dash * 0.44 + glyph * 0.72) + vec3(0.42, 0.16, 0.03) * cut;
      gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
    }
  `,
});

const makeParticleMaterial = (THREE, color, size, opacity) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uColor: { value: new THREE.Color(color) },
    uTime: { value: 0 },
    uSize: { value: size },
    uOpacity: { value: opacity },
    uWarp: { value: 0 },
  },
  vertexShader: `
    attribute float aScale;
    varying float vScale;
    uniform float uSize;
    uniform float uWarp;
    void main() {
      vScale = aScale;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = uSize * aScale * (150.0 / max(18.0, -mv.z)) * (1.0 + uWarp * 0.85);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    precision highp float;
    varying float vScale;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uWarp;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float d = length(p);
      float core = smoothstep(0.48, 0.0, d);
      float hot = smoothstep(0.18, 0.0, d);
      vec3 color = uColor * (0.48 + hot * 0.85 + uWarp * 0.42);
      gl_FragColor = vec4(color, core * uOpacity * (0.55 + vScale * 0.42));
    }
  `,
});

class CameraController {
  constructor(THREE, camera, profile) {
    this.THREE = THREE;
    this.camera = camera;
    this.profile = profile;
    this.target = new THREE.Vector3(profile.mobile ? 0 : -6, profile.mobile ? 3 : 0, 0);
    this.pointer = { x: 0, y: 0 };
    this.warpOffset = 0;
  }

  resize(width, height) {
    const aspect = width / Math.max(height, 1);
    this.camera.aspect = aspect;
    this.camera.fov = this.profile.mobile ? 66 : 58;
    this.camera.position.set(
      this.profile.mobile ? 0 : -3,
      this.profile.mobile ? 7 : 2,
      aspect > 1.8 ? 60 : aspect < 0.85 ? 72 : 64,
    );
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  update(dt, time, state) {
    const breathe = Math.sin(time * 0.42) * 0.45;
    const warp = state.warp;
    this.warpOffset = lerp(this.warpOffset, warp * 16, dt * 0.85);
    this.camera.position.x += (this.pointer.x * 1.8 - this.camera.position.x * 0.015) * dt;
    this.camera.position.y += (this.pointer.y * 1.1 - this.camera.position.y * 0.01) * dt;
    this.camera.position.z -= this.warpOffset * dt;
    this.camera.lookAt(this.target.x, this.target.y + breathe * 0.08, this.target.z - warp * 8);
  }
}

class CoreEngine {
  constructor(THREE, scene, profile) {
    this.THREE = THREE;
    this.profile = profile;
    this.group = new THREE.Group();
    this.group.name = "Worldforge Core";
    this.group.position.set(profile.mobile ? 0 : -10.5, profile.mobile ? 4.5 : 0.5, -8);
    this.energy = 0;
    this.layers = [];
    this.fragments = [];
    this.lattice = null;
    this.createCore();
    scene.add(this.group);
  }

  createCore() {
    const THREE = this.THREE;
    const metal = new THREE.MeshStandardMaterial({
      color: 0x221307,
      emissive: 0x8f4a10,
      emissiveIntensity: 0.54,
      roughness: 0.38,
      metalness: 0.86,
      transparent: true,
      opacity: 0.95,
    });
    const hot = new THREE.MeshStandardMaterial({
      color: 0x3d1906,
      emissive: BRIGHT_GOLD,
      emissiveIntensity: 1.05,
      roughness: 0.32,
      metalness: 0.76,
      transparent: true,
      opacity: 0.88,
    });

    const knotA = new THREE.Mesh(new THREE.TorusKnotGeometry(5.2, 0.135, 420, 18, 3, 7), metal);
    const knotB = new THREE.Mesh(new THREE.TorusKnotGeometry(3.15, 0.085, 320, 14, 5, 9), hot);
    const knotC = new THREE.Mesh(new THREE.TorusKnotGeometry(1.82, 0.055, 260, 10, 7, 11), metal.clone());
    knotB.rotation.set(1.1, 0.25, 0.9);
    knotC.rotation.set(-0.7, 0.8, 0.25);
    this.group.add(knotA, knotB, knotC);
    this.layers.push({ obj: knotA, speed: 0.05, axis: "y", mat: metal, base: 0.54 });
    this.layers.push({ obj: knotB, speed: -0.08, axis: "x", mat: hot, base: 1.05 });
    this.layers.push({ obj: knotC, speed: 0.11, axis: "z", mat: knotC.material, base: 0.64 });

    const sealMatA = makeRuneMaterial(THREE, { color: BRIGHT_GOLD, opacity: 0.28, density: 46, seed: 15, thickness: 0.36 });
    const sealMatB = makeRuneMaterial(THREE, { color: EMBER, opacity: 0.18, density: 38, seed: 32, thickness: 0.52 });
    const sealA = new THREE.Mesh(new THREE.TorusGeometry(7.8, 0.022, 6, 260), sealMatA);
    const sealB = new THREE.Mesh(new THREE.TorusGeometry(9.7, 0.018, 6, 260), sealMatB);
    const sealC = new THREE.Mesh(new THREE.TorusGeometry(11.3, 0.012, 5, 220), sealMatA.clone());
    sealB.rotation.x = Math.PI / 2.7;
    sealC.rotation.y = Math.PI / 2.9;
    this.group.add(sealA, sealB, sealC);
    this.layers.push({ obj: sealA, speed: 0.16, axis: "z", mat: sealMatA });
    this.layers.push({ obj: sealB, speed: -0.12, axis: "y", mat: sealMatB });
    this.layers.push({ obj: sealC, speed: 0.09, axis: "x", mat: sealC.material });

    this.createLattice();
    this.createFragments();
  }

  createLattice() {
    const THREE = this.THREE;
    const nodes = [];
    const lines = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const b = ((i * 7) % count) / count * TAU;
      const r = 7.8 + Math.sin(i * 1.7) * 2.2;
      nodes.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(b) * 3.6, Math.sin(a) * r * 0.55));
    }
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const b = nodes[(i + 5) % count];
      const c = nodes[(i + 11) % count];
      lines.push(a.x, a.y, a.z, b.x, b.y, b.z, a.x, a.y, a.z, c.x, c.y, c.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const mat = new THREE.LineBasicMaterial({
      color: BRIGHT_GOLD,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lattice = new THREE.LineSegments(geo, mat);
    this.group.add(this.lattice);
    this.layers.push({ obj: this.lattice, speed: 0.035, axis: "y", mat });
  }

  createFragments() {
    const THREE = this.THREE;
    const geoA = new THREE.TetrahedronGeometry(0.32, 0);
    const geoB = new THREE.BoxGeometry(0.22, 0.9, 0.06);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2b1808,
      emissive: 0x9a4c12,
      emissiveIntensity: 0.36,
      roughness: 0.48,
      metalness: 0.78,
      transparent: true,
      opacity: 0.82,
    });
    for (let i = 0; i < this.profile.fragmentCount; i++) {
      const mesh = new THREE.Mesh(i % 3 === 0 ? geoB : geoA, mat.clone());
      const a = Math.random() * TAU;
      const r = 10 + Math.random() * 18;
      mesh.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 14, Math.sin(a) * r * 0.62);
      mesh.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      const s = 0.6 + Math.random() * 1.6;
      mesh.scale.setScalar(s);
      this.group.add(mesh);
      this.fragments.push({
        mesh,
        angle: a,
        radius: r,
        y: mesh.position.y,
        speed: (0.05 + Math.random() * 0.12) * (Math.random() > 0.5 ? 1 : -1),
        bob: Math.random() * TAU,
      });
    }
  }

  update(dt, time, state) {
    const warp = state.warp;
    const audio = getAudioLevel();
    this.energy = lerp(this.energy, state.energy + audio * 0.6 + warp * 1.3, dt * 2.4);
    const pulse = 1 + Math.sin(time * 0.92) * 0.018 + this.energy * 0.045;
    this.group.scale.setScalar((this.profile.mobile ? 0.72 : 0.94) * pulse * (1 + warp * 0.34));
    this.group.rotation.y += dt * (0.035 + warp * 0.22);
    this.group.rotation.x = Math.sin(time * 0.12) * 0.08 + warp * 0.22;
    this.layers.forEach((layer, idx) => {
      layer.obj.rotation[layer.axis] += dt * layer.speed * (1 + warp * 5.8);
      if (layer.mat?.uniforms) {
        layer.mat.uniforms.uTime.value = time;
        layer.mat.uniforms.uWarp.value = warp;
        layer.mat.uniforms.uEnergy.value = this.energy;
      } else if (layer.mat?.emissiveIntensity !== undefined) {
        layer.mat.emissiveIntensity = (layer.base || 0.5) + this.energy * 0.55 + Math.sin(time * 1.4 + idx) * 0.08;
      }
    });
    this.fragments.forEach((f, idx) => {
      f.angle += dt * f.speed * (1 + warp * 6.4);
      const radius = lerp(f.radius, warp > 0.08 ? 2.4 + (idx % 5) * 0.4 : f.radius, warp * 0.014);
      f.mesh.position.x = Math.cos(f.angle) * radius;
      f.mesh.position.z = Math.sin(f.angle) * radius * 0.62;
      f.mesh.position.y = f.y + Math.sin(time * 0.55 + f.bob) * 0.55 - warp * 0.8;
      f.mesh.rotation.x += dt * (0.18 + warp * 2.5);
      f.mesh.rotation.y += dt * (0.12 + warp * 2.1);
      f.mesh.material.emissiveIntensity = 0.26 + this.energy * 0.42 + Math.sin(time * 2 + idx) * 0.05;
    });
  }
}

class RuneSystem {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.group = new THREE.Group();
    this.group.name = "Procedural Rune System";
    this.group.position.copy(core.group.position);
    this.layers = [];
    this.createLayers();
    scene.add(this.group);
  }

  createLayers() {
    const THREE = this.THREE;
    const count = this.profile.runeLayers;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const radius = lerp(8.4, this.profile.mobile ? 28 : 36, t) + Math.sin(i * 2.31) * 1.4;
      const tube = lerp(0.006, 0.026, 1 - t);
      const color = i % 7 === 0 ? RED : i % 5 === 0 ? EMBER : i % 3 === 0 ? BRIGHT_GOLD : GOLD;
      const opacity = lerp(0.42, 0.12, t) * (i % 4 === 0 ? 1.25 : 1);
      const density = 24 + (i * 9) % 68;
      const mat = makeRuneMaterial(THREE, {
        color,
        opacity,
        density,
        seed: i * 11.73 + 5,
        thickness: 0.32 + (i % 5) * 0.08,
      });
      const geo = new THREE.TorusGeometry(radius, tube, 5 + (i % 3), 170 + (i % 5) * 20);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(
        (i % 4) * Math.PI / 7,
        (i % 5) * Math.PI / 9,
        Math.random() * TAU,
      );
      this.group.add(mesh);
      this.layers.push({
        mesh,
        mat,
        speed: (0.018 + Math.random() * 0.095) * (i % 2 ? -1 : 1),
        axis: ["x", "y", "z"][i % 3],
        wobble: Math.random() * TAU,
        baseOpacity: opacity,
      });
    }

    const spokesGeo = new THREE.BufferGeometry();
    const spokes = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU;
      const inner = 6 + (i % 7) * 0.8;
      const outer = 26 + (i % 13) * 0.7;
      spokes.push(
        Math.cos(a) * inner, Math.sin(a) * inner, Math.sin(a * 3) * 0.8,
        Math.cos(a) * outer, Math.sin(a) * outer, Math.sin(a * 5) * 1.5,
      );
    }
    spokesGeo.setAttribute("position", new THREE.Float32BufferAttribute(spokes, 3));
    const spokesMat = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spokesMesh = new THREE.LineSegments(spokesGeo, spokesMat);
    this.group.add(spokesMesh);
    this.layers.push({ mesh: spokesMesh, mat: spokesMat, speed: -0.022, axis: "z", wobble: 0, baseOpacity: 0.1 });
  }

  update(dt, time, state) {
    this.group.position.copy(this.core.group.position);
    this.group.rotation.z += dt * (0.014 + state.warp * 0.2);
    this.layers.forEach((layer, idx) => {
      layer.mesh.rotation[layer.axis] += dt * layer.speed * (1 + state.warp * 8);
      layer.mesh.position.z = Math.sin(time * (0.12 + idx * 0.002) + layer.wobble) * (0.55 + idx * 0.015);
      if (layer.mat.uniforms) {
        layer.mat.uniforms.uTime.value = time;
        layer.mat.uniforms.uWarp.value = state.warp;
        layer.mat.uniforms.uEnergy.value = state.energy;
        layer.mat.uniforms.uOpacity.value = layer.baseOpacity * (1 + state.warp * 0.55);
      } else if (layer.mat.opacity !== undefined) {
        layer.mat.opacity = layer.baseOpacity * (0.72 + Math.sin(time * 0.8 + idx) * 0.18 + state.warp * 0.45);
      }
    });
  }
}

class ParticleSystem {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.pointer = { x: 0, y: 0, active: 0 };
    this.group = new THREE.Group();
    this.group.name = "Archive Particle Field";
    this.particles = this.createParticleField(profile.particleCount, BRIGHT_GOLD, 2.3, 0.62, 44, 120);
    this.dust = this.createParticleField(profile.dustCount, EMBER, 1.25, 0.22, 70, 220);
    this.group.add(this.particles.points, this.dust.points);
    scene.add(this.group);
  }

  createParticleField(count, color, size, opacity, radiusBase, depth) {
    const THREE = this.THREE;
    const position = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const meta = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const radius = radiusBase * (0.25 + Math.random() * 1.25);
      const y = (Math.random() - 0.5) * (this.profile.mobile ? 58 : 88);
      const z = -depth * Math.random() + (Math.random() - 0.5) * 28;
      position[i * 3] = Math.cos(angle) * radius;
      position[i * 3 + 1] = y;
      position[i * 3 + 2] = Math.sin(angle) * radius * 0.45 + z;
      scale[i] = 0.35 + Math.random() * 1.4;
      meta.push({
        angle,
        radius,
        baseRadius: radius,
        y,
        z,
        speed: (0.025 + Math.random() * 0.11) * (Math.random() > 0.5 ? 1 : -1),
        drift: Math.random() * TAU,
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    const material = makeParticleMaterial(THREE, color, size, opacity);
    const points = new THREE.Points(geometry, material);
    points.position.copy(this.core.group.position);
    return { points, geometry, material, position, meta };
  }

  updateField(field, dt, time, state, strength) {
    const arr = field.position;
    const center = this.core.group.position;
    const warp = state.warp;
    for (let i = 0; i < field.meta.length; i++) {
      const p = field.meta[i];
      p.angle += p.speed * dt * (1 + warp * 7.5);
      const attraction = warp > 0 ? lerp(p.baseRadius, 3 + (i % 9) * 0.6, clamp(warp * 1.15, 0, 1)) : p.baseRadius;
      const hover = this.pointer.active * Math.sin(time * 1.5 + i) * 1.6;
      p.radius = lerp(p.radius, attraction + hover, dt * (0.5 + warp * 2.8));
      const turbulence = Math.sin(time * (0.32 + strength) + p.drift) * (1.3 + state.energy * 2.2);
      arr[i * 3] = center.x + Math.cos(p.angle) * p.radius + this.pointer.x * this.pointer.active * 3.5;
      arr[i * 3 + 1] = center.y + p.y * (1 - warp * 0.55) + turbulence + this.pointer.y * this.pointer.active * 2.2;
      arr[i * 3 + 2] = center.z + Math.sin(p.angle) * p.radius * 0.48 + p.z * (1 - warp * 0.75);
      if (warp > 0.82 && p.radius < 4.4 && Math.random() < 0.01) {
        p.baseRadius = 26 + Math.random() * 80;
        p.radius = p.baseRadius;
        p.y = (Math.random() - 0.5) * 72;
        p.z = -Math.random() * 120;
      }
    }
    field.geometry.attributes.position.needsUpdate = true;
    field.material.uniforms.uTime.value = time;
    field.material.uniforms.uWarp.value = warp;
    field.material.uniforms.uOpacity.value = field === this.dust ? 0.18 + state.energy * 0.05 : 0.54 + state.energy * 0.08;
  }

  update(dt, time, state) {
    this.updateField(this.particles, dt, time, state, 1);
    this.updateField(this.dust, dt, time, state, 0.35);
  }
}

class HUDSystem {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.group = new THREE.Group();
    this.group.name = "Holographic Archive HUD";
    this.createArchivePlanes();
    this.createCornerGlyphs();
    scene.add(this.group);
  }

  createArchivePlanes() {
    const THREE = this.THREE;
    const geo = new THREE.BufferGeometry();
    const lines = [];
    for (let i = 0; i < 56; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (this.profile.mobile ? 26 + Math.random() * 14 : 48 + Math.random() * 36);
      const y = (Math.random() - 0.5) * 54;
      const w = 2 + Math.random() * 9;
      const z = -15 - Math.random() * 60;
      lines.push(x, y, z, x + side * w, y + Math.sin(i) * 0.8, z);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const mat = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.archiveLines = new THREE.LineSegments(geo, mat);
    this.group.add(this.archiveLines);
  }

  createCornerGlyphs() {
    const THREE = this.THREE;
    const mat = makeRuneMaterial(THREE, { color: BRIGHT_GOLD, opacity: 0.12, density: 22, seed: 88, thickness: 0.48 });
    const positions = [
      [-44, 24, -35],
      [44, 24, -35],
      [-44, -24, -35],
      [44, -24, -35],
    ];
    this.cornerGlyphs = positions.map((pos, idx) => {
      const glyph = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.018, 5, 96), mat.clone());
      glyph.position.set(pos[0] * (this.profile.mobile ? 0.48 : 1), pos[1], pos[2]);
      glyph.rotation.set(idx % 2 ? 0.4 : -0.4, idx > 1 ? -0.35 : 0.35, idx * 0.7);
      this.group.add(glyph);
      return glyph;
    });
  }

  update(dt, time, state) {
    this.group.position.x = this.profile.mobile ? 0 : -4;
    this.archiveLines.rotation.y = Math.sin(time * 0.08) * 0.06;
    this.archiveLines.material.opacity = 0.08 + state.energy * 0.05 + Math.sin(time * 0.9) * 0.025;
    this.cornerGlyphs.forEach((glyph, idx) => {
      glyph.rotation.z += dt * (idx % 2 ? 0.12 : -0.09) * (1 + state.warp * 3);
      glyph.material.uniforms.uTime.value = time;
      glyph.material.uniforms.uWarp.value = state.warp;
      glyph.material.uniforms.uEnergy.value = state.energy;
    });
  }
}

class PostProcessingPipeline {
  constructor(THREE, addons, renderer, scene, camera, profile) {
    this.THREE = THREE;
    this.profile = profile;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloom = null;
    this.sao = null;
    this.cine = null;

    if (!profile.useComposer) return;

    const { EffectComposer, RenderPass, UnrealBloomPass, SAOPass, ShaderPass } = addons;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    if (profile.useSao) {
      try {
        this.sao = new SAOPass(scene, camera, false, true);
        this.sao.params.saoBias = 0.24;
        this.sao.params.saoIntensity = 0.008;
        this.sao.params.saoScale = 18;
        this.sao.params.saoKernelRadius = 12;
        this.sao.params.saoMinResolution = 0;
        this.composer.addPass(this.sao);
      } catch (err) {
        console.warn("[FLG] SAOPass disabled:", err?.message);
        this.sao = null;
      }
    }
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      profile.bloomStrength,
      profile.bloomRadius,
      0.74,
    );
    this.composer.addPass(this.bloom);
    this.cine = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uWarp: { value: 0 },
        uReduced: { value: profile.reduced ? 1 : 0 },
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
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uWarp;
        uniform float uReduced;
        uniform vec2 uResolution;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;
          vec2 d = uv - 0.5;
          float r = dot(d, d);
          float ca = (0.0012 + r * 0.006) * (1.0 - uReduced * 0.65) * (1.0 + uWarp * 0.45);
          vec3 col;
          col.r = texture2D(tDiffuse, uv + d * ca).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - d * ca * 0.75).b;
          float vignette = smoothstep(0.92, 0.16, length(d) * 1.14);
          col *= mix(0.38, 1.0, vignette);
          float grain = hash(uv * uResolution + fract(uTime * 0.61) * 173.13) - 0.5;
          col += grain * mix(0.022, 0.009, uReduced);
          col += vec3(0.045, 0.025, 0.006) * smoothstep(0.58, 0.0, length(d));
          col = mix(col, vec3(0.92, 0.64, 0.22), clamp(uWarp - 0.78, 0.0, 1.0) * 0.18);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.composer.addPass(this.cine);
  }

  resize(width, height) {
    if (!this.composer) return;
    this.composer.setSize(width, height);
    this.bloom?.setSize?.(width, height);
    this.sao?.setSize?.(width, height);
    this.cine?.uniforms.uResolution.value.set(width, height);
  }

  render(delta, time, state) {
    if (!this.composer) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.bloom.strength = this.profile.bloomStrength + state.energy * 0.14 + state.warp * 0.38;
    if (this.sao) this.sao.params.saoIntensity = 0.006 + state.energy * 0.004;
    this.cine.uniforms.uTime.value = time;
    this.cine.uniforms.uWarp.value = state.warp;
    this.composer.render(delta);
  }

  dispose() {
    try { this.cine?.material?.dispose?.(); } catch (_) {}
    try { this.bloom?.dispose?.(); } catch (_) {}
    try { this.sao?.dispose?.(); } catch (_) {}
    try { this.composer?.dispose?.(); } catch (_) {}
  }
}

class AnimationTimeline {
  constructor(reduced) {
    this.reduced = reduced;
    this.activeTweens = new Set();
    this.gsapTimeline = null;
  }

  kill() {
    this.gsapTimeline?.kill?.();
    this.gsapTimeline = null;
    this.activeTweens.forEach((cancel) => cancel());
    this.activeTweens.clear();
  }

  to(target, props, duration, ease = easeInOutCubic, onDone) {
    const gsap = window.gsap;
    if (gsap?.to) {
      const tween = gsap.to(target, {
        ...props,
        duration: duration / 1000,
        ease: "power3.inOut",
        onComplete: onDone,
      });
      const cancel = () => tween.kill();
      this.activeTweens.add(cancel);
      return cancel;
    }
    const from = {};
    Object.keys(props).forEach((key) => { from[key] = target[key]; });
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const e = ease(p);
      Object.keys(props).forEach((key) => { target[key] = lerp(from[key], props[key], e); });
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        this.activeTweens.delete(cancel);
        onDone?.();
      }
    };
    const cancel = () => cancelAnimationFrame(raf);
    this.activeTweens.add(cancel);
    raf = requestAnimationFrame(step);
    return cancel;
  }
}

class OperationalModeController {
  constructor(screen) {
    this.screen = screen;
    this.status = document.getElementById("loginOperationalStatus");
    this.ritual = document.getElementById("loginRitualStatus");
    this.timeouts = new Set();
  }

  set(text) {
    if (this.status) this.status.textContent = text;
    if (this.ritual) this.ritual.textContent = text;
  }

  begin() {
    this.screen?.classList.add("operational-mode");
    const messages = [
      "正在開啟編修儀式",
      "世界觀核心啟動中",
      "深淵法典已連線",
      "小說編修引擎待命中",
      "可開始進行小說分析",
    ];
    messages.forEach((message, idx) => {
      const id = setTimeout(() => this.set(message), idx * 820);
      this.timeouts.add(id);
    });
  }

  cleanup() {
    this.timeouts.forEach(clearTimeout);
    this.timeouts.clear();
    this.screen?.classList.remove("operational-mode");
  }
}

class SceneManager {
  constructor(canvas, modules, opts) {
    this.canvas = canvas;
    this.THREE = modules.THREE;
    this.modules = modules;
    this.opts = opts;
    this.profile = getPerformanceProfile(!!opts.reduced);
    this.state = { warp: 0, energy: 0, boot: 0 };
    this.clock = null;
    this.raf = 0;
    this.stopped = false;
    this.hidden = false;
    this.warping = false;
    this.resizeQueued = false;
    this.timeouts = new Set();
    this.timeline = new AnimationTimeline(this.profile.reduced);
    this.screen = document.getElementById("loginScreen");
    this.operational = new OperationalModeController(this.screen);

    this.scene = new this.THREE.Scene();
    this.scene.fog = new this.THREE.FogExp2(0x050201, this.profile.mobile ? 0.012 : 0.0085);
    this.camera = new this.THREE.PerspectiveCamera(58, 1, 0.1, 900);
    this.renderer = new this.THREE.WebGLRenderer({
      canvas,
      antialias: !this.profile.lowPower,
      alpha: true,
      powerPreference: this.profile.lowPower ? "default" : "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(this.profile.pixelRatio);

    this.cameraController = new CameraController(this.THREE, this.camera, this.profile);
    this.addLighting();
    this.core = new CoreEngine(this.THREE, this.scene, this.profile);
    this.runes = new RuneSystem(this.THREE, this.scene, this.profile, this.core);
    this.particles = new ParticleSystem(this.THREE, this.scene, this.profile, this.core);
    this.hud = new HUDSystem(this.THREE, this.scene, this.profile, this.core);
    this.post = new PostProcessingPipeline(this.THREE, modules, this.renderer, this.scene, this.camera, this.profile);

    this.onResize = this.onResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.onContextLost = this.onContextLost.bind(this);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);

    this.resize();
    this.clock = new this.THREE.Clock();
    window.__FLG_LOGIN_FX_METRICS__ = {
      active: true,
      disposed: false,
      version: "worldforge-core-v1",
      runeLayers: this.profile.runeLayers,
      particleCount: this.profile.particleCount + this.profile.dustCount,
      useSao: this.profile.useSao && !!this.post.sao,
      mobile: this.profile.mobile,
      reduced: this.profile.reduced,
      operational: false,
    };
    this.canvas.dataset.worldforge = "active";
    delete this.canvas.dataset.engine;
    this.canvas.dataset.runeLayers = String(this.profile.runeLayers);
    this.canvas.dataset.particleCount = String(this.profile.particleCount + this.profile.dustCount);
    this.canvas.dataset.useSao = String(this.profile.useSao && !!this.post.sao);
  }

  addLighting() {
    const THREE = this.THREE;
    this.scene.add(new THREE.AmbientLight(0x2a1606, 1.15));
    this.keyLight = new THREE.PointLight(0xffc55e, 7.5, 160);
    this.keyLight.position.set(this.profile.mobile ? 0 : -12, 10, 20);
    this.scene.add(this.keyLight);
    this.redLight = new THREE.PointLight(0x9f210d, 2.1, 180);
    this.redLight.position.set(18, -10, -12);
    this.scene.add(this.redLight);
    this.rimLight = new THREE.DirectionalLight(0xffdf9a, 0.75);
    this.rimLight.position.set(-12, 18, 22);
    this.scene.add(this.rimLight);
  }

  start() {
    this.loop();
  }

  onPointerMove(event) {
    const x = event.clientX / Math.max(window.innerWidth, 1) * 2 - 1;
    const y = -(event.clientY / Math.max(window.innerHeight, 1) * 2 - 1);
    this.cameraController.pointer.x = x;
    this.cameraController.pointer.y = y;
    this.particles.pointer.x = x;
    this.particles.pointer.y = y;
    this.particles.pointer.active = 1;
    this.state.energy = Math.max(this.state.energy, 0.18);
  }

  onResize() {
    if (this.resizeQueued) return;
    this.resizeQueued = true;
    requestAnimationFrame(() => {
      this.resizeQueued = false;
      if (!this.stopped) this.resize();
    });
  }

  onVisibility() {
    this.hidden = document.hidden;
  }

  onContextLost(event) {
    event.preventDefault();
    this.opts.onLost?.();
    stopLoginFx();
  }

  resize() {
    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);
    this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.cameraController.resize(width, height);
    this.post.resize(width, height);
  }

  loop() {
    if (this.stopped) return;
    this.raf = requestAnimationFrame(() => this.loop());
    if (this.hidden) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    this.state.energy = lerp(this.state.energy, getAudioLevel() * 0.55 + this.state.warp * 0.92, delta * 1.8);
    this.cameraController.update(delta, time, this.state);
    this.core.update(delta, time, this.state);
    this.runes.update(delta, time, this.state);
    this.particles.pointer.active = lerp(this.particles.pointer.active, 0, delta * 1.1);
    this.particles.update(delta, time, this.state);
    this.hud.update(delta, time, this.state);
    this.keyLight.intensity = 6.4 + Math.sin(time * 1.2) * 0.6 + this.state.energy * 2.6 + this.state.warp * 5.8;
    this.redLight.intensity = 1.4 + this.state.energy * 1.2 + this.state.warp * 2.2;
    this.post.render(delta, time, this.state);
  }

  warp(onDone) {
    if (this.stopped) {
      onDone?.();
      return;
    }
    if (this.warping) return;
    this.warping = true;
    this.operational.begin();
    if (window.__FLG_LOGIN_FX_METRICS__) window.__FLG_LOGIN_FX_METRICS__.operational = true;

    const done = (() => {
      let called = false;
      return () => {
        if (called) return;
        called = true;
        onDone?.();
      };
    })();

    this.timeline.to(this.state, { warp: 1, energy: 1.3 }, this.profile.reduced ? 1200 : 5200, easeInOutCubic);
    const id = setTimeout(done, this.profile.reduced ? 1400 : 6200);
    this.timeouts.add(id);
  }

  cleanup() {
    if (this.stopped) return;
    this.stopped = true;
    this.timeline.kill();
    this.timeouts.forEach(clearTimeout);
    this.timeouts.clear();
    this.operational.cleanup();
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.post.dispose();
    disposeObjectTree(this.scene);
    try { this.renderer.renderLists?.dispose?.(); } catch (_) {}
    try { this.renderer.dispose(); } catch (_) {}
    try { this.renderer.forceContextLoss?.(); } catch (_) {}
    delete this.canvas.dataset.worldforge;
    delete this.canvas.dataset.engine;
    delete this.canvas.dataset.runeLayers;
    delete this.canvas.dataset.particleCount;
    delete this.canvas.dataset.useSao;
    if (window.__FLG_LOGIN_FX_METRICS__) {
      window.__FLG_LOGIN_FX_METRICS__.active = false;
      window.__FLG_LOGIN_FX_METRICS__.disposed = true;
    }
  }
}

export const startLoginFx = async (canvas, opts = {}) => {
  if (!canvas || !isWebGLAvailable()) return false;
  try {
    stopLoginFx();
    const THREE = await import(/* @vite-ignore */ "three");
    const [
      { EffectComposer },
      { RenderPass },
      { UnrealBloomPass },
      { SAOPass },
      { ShaderPass },
    ] = await Promise.all([
      import(/* @vite-ignore */ "three/addons/postprocessing/EffectComposer.js"),
      import(/* @vite-ignore */ "three/addons/postprocessing/RenderPass.js"),
      import(/* @vite-ignore */ "three/addons/postprocessing/UnrealBloomPass.js"),
      import(/* @vite-ignore */ "three/addons/postprocessing/SAOPass.js"),
      import(/* @vite-ignore */ "three/addons/postprocessing/ShaderPass.js"),
    ]);
    _fx = new SceneManager(canvas, {
      THREE,
      EffectComposer,
      RenderPass,
      UnrealBloomPass,
      SAOPass,
      ShaderPass,
    }, opts);
    _fx.start();
    return true;
  } catch (err) {
    console.warn("[FLG] loginfx failed, static login fallback:", err?.message || err);
    try { stopLoginFx(); } catch (_) {}
    return false;
  }
};

export const warpLoginFx = (onDone) => {
  const fx = _fx;
  if (!fx || fx.stopped) {
    try { onDone?.(); } catch (_) {}
    return;
  }
  fx.warp(() => {
    try { onDone?.(); } catch (_) {}
  });
};

export const stopLoginFx = () => {
  const fx = _fx;
  _fx = null;
  if (!fx) return;
  try { fx.cleanup(); } catch (err) { console.warn("[FLG] loginfx cleanup:", err?.message || err); }
};
