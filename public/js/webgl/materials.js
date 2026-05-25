// @ts-nocheck

import { RAPHAEL_CYAN_SOFT } from './constants.js';

export const makeRuneMaterial = (THREE, {
  color = RAPHAEL_CYAN_SOFT,
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

export const makeParticleMaterial = (THREE, color, size, opacity) => new THREE.ShaderMaterial({
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
