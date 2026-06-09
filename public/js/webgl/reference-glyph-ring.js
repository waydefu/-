// @ts-nocheck

import {
  TAU,
  BRIGHT_GOLD,
  RAPHAEL_AMBER,
  RAPHAEL_CYAN_SOFT,
  RAPHAEL_GOLD_CORE,
  WARM_GOLD_NODE,
  SPIRITRON_WHITE,
} from './constants.js';
import { clamp } from './math-utils.js';
import { disposeObjectTree } from './dispose-utils.js';

const GLYPH_TEXT = [
  'ANALYTICAL APPRAISAL',
  'PARALLEL CALCULATION',
  'MAGICULE FLOW',
  'FORMULA MATRIX',
  'ALL CREATION INDEX',
  'SPIRITRON TRACE',
  'MULTILAYER BARRIER',
  'SYSTEM COORDINATES',
];

const colorToCss = (hex, alpha = 1) => {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawCircularText = (ctx, text, radius, fontSize, color, startAngle, span, blur = 0) => {
  const chars = text.split('');
  const step = span / Math.max(1, chars.length);
  ctx.save();
  ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const angle = startAngle + i * step;
    ctx.save();
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
};

const drawRing = (ctx, radius, color, width, alpha = 1, dash = null) => {
  ctx.save();
  ctx.strokeStyle = colorToCss(color, alpha);
  ctx.lineWidth = width;
  ctx.shadowColor = colorToCss(color, alpha);
  ctx.shadowBlur = width * 2.5;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
};

const drawTicks = (ctx, radius, count, length, color, width, alpha, skipEvery = 0) => {
  ctx.save();
  ctx.strokeStyle = colorToCss(color, alpha);
  ctx.lineWidth = width;
  ctx.shadowColor = colorToCss(color, alpha);
  ctx.shadowBlur = width * 2;
  for (let i = 0; i < count; i++) {
    if (skipEvery && i % skipEvery === 0) continue;
    const angle = (i / count) * TAU;
    const inner = radius - length * (i % 8 === 0 ? 0.68 : 0.38);
    const outer = radius + length * (i % 8 === 0 ? 0.68 : 0.38);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
};

const drawBrokenArcs = (ctx, radius, count, color, alpha, width = 5) => {
  ctx.save();
  ctx.strokeStyle = colorToCss(color, alpha);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.shadowColor = colorToCss(color, alpha);
  ctx.shadowBlur = width * 3.6;
  for (let i = 0; i < count; i++) {
    const start = i * 0.63 + (i % 3) * 0.14;
    const span = 0.13 + (i % 5) * 0.055;
    ctx.beginPath();
    ctx.arc(0, 0, radius + (i % 4) * 20, start, start + span);
    ctx.stroke();
  }
  ctx.restore();
};

class ReferenceGlyphRing {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.group = new THREE.Group();
    this.group.name = 'Reference Optical Glyph Ring';
    this.layers = [];

    try {
      this.createLayers();
      if (this.core?.group) this.group.position.copy(this.core.group.position);
      scene.add(this.group);
    } catch (err) {
      console.warn('[FLG] ReferenceGlyphRing init failed:', err?.message || err);
      this.dispose();
    }
  }

  textureSize() {
    if (this.profile.reduced) return 768;
    if (this.profile.mobile || this.profile.lowPower) return 1024;
    return 2048;
  }

  createTexture(kind) {
    const size = this.textureSize();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const center = size / 2;
    ctx.translate(center, center);
    ctx.globalCompositeOperation = 'lighter';

    const scale = size / 2048;
    const mainRadius = 660 * scale;
    const innerRadius = 430 * scale;
    const outerRadius = 790 * scale;

    if (kind === 'main') {
      drawRing(ctx, mainRadius - 86 * scale, RAPHAEL_AMBER, 4.8 * scale, 0.42, [30 * scale, 20 * scale]);
      drawRing(ctx, mainRadius, WARM_GOLD_NODE, 7.2 * scale, 0.56);
      drawRing(ctx, mainRadius + 76 * scale, BRIGHT_GOLD, 4.6 * scale, 0.34, [18 * scale, 26 * scale]);
      drawTicks(ctx, mainRadius - 42 * scale, 150, 34 * scale, RAPHAEL_GOLD_CORE, 2.4 * scale, 0.34, 11);
      drawTicks(ctx, mainRadius + 42 * scale, 174, 28 * scale, WARM_GOLD_NODE, 2.1 * scale, 0.30, 13);
      drawBrokenArcs(ctx, mainRadius - 20 * scale, 44, RAPHAEL_AMBER, 0.30, 3.6 * scale);

      const text = ` ${GLYPH_TEXT.join('  //  ')}  // `;
      drawCircularText(ctx, text.repeat(2), mainRadius + 12 * scale, 48 * scale, colorToCss(WARM_GOLD_NODE, 0.82), -Math.PI / 2, TAU * 1.02, 18 * scale);
      drawCircularText(ctx, text.repeat(2), mainRadius - 92 * scale, 31 * scale, colorToCss(RAPHAEL_GOLD_CORE, 0.56), Math.PI / 2, -TAU * 1.02, 9 * scale);
      drawCircularText(ctx, text.repeat(2), mainRadius + 118 * scale, 22 * scale, colorToCss(SPIRITRON_WHITE, 0.30), Math.PI * 0.15, TAU * 1.02, 7 * scale);
    }

    if (kind === 'inner') {
      drawRing(ctx, innerRadius - 48 * scale, SPIRITRON_WHITE, 3.5 * scale, 0.42);
      drawRing(ctx, innerRadius, RAPHAEL_GOLD_CORE, 5 * scale, 0.62, [20 * scale, 12 * scale]);
      drawRing(ctx, innerRadius + 76 * scale, WARM_GOLD_NODE, 4.8 * scale, 0.44);
      drawTicks(ctx, innerRadius + 34 * scale, 96, 24 * scale, SPIRITRON_WHITE, 2.3 * scale, 0.28, 0);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * TAU + Math.PI / 6;
        ctx.save();
        ctx.rotate(angle);
        ctx.strokeStyle = colorToCss(RAPHAEL_GOLD_CORE, 0.30);
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = colorToCss(RAPHAEL_GOLD_CORE, 0.28);
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        ctx.moveTo(Math.cos(0) * (innerRadius - 120 * scale), Math.sin(0) * (innerRadius - 120 * scale));
        ctx.lineTo(Math.cos(0) * (innerRadius + 120 * scale), Math.sin(0) * (innerRadius + 120 * scale));
        ctx.stroke();
        ctx.restore();
      }
    }

    if (kind === 'edge') {
      drawRing(ctx, outerRadius - 54 * scale, WARM_GOLD_NODE, 4.2 * scale, 0.34, [22 * scale, 32 * scale]);
      drawRing(ctx, outerRadius + 18 * scale, RAPHAEL_GOLD_CORE, 3.8 * scale, 0.26);
      drawRing(ctx, outerRadius + 70 * scale, SPIRITRON_WHITE, 2.4 * scale, 0.15, [12 * scale, 38 * scale]);
      drawTicks(ctx, outerRadius - 18 * scale, 132, 42 * scale, WARM_GOLD_NODE, 2.4 * scale, 0.28, 7);
      drawTicks(ctx, outerRadius + 54 * scale, 84, 24 * scale, SPIRITRON_WHITE, 1.8 * scale, 0.16, 6);
      drawTicks(ctx, outerRadius + 34 * scale, 48, 18 * scale, RAPHAEL_CYAN_SOFT, 1.4 * scale, 0.10, 4);
      drawBrokenArcs(ctx, outerRadius - 24 * scale, 28, RAPHAEL_AMBER, 0.24, 3.2 * scale);
      drawBrokenArcs(ctx, outerRadius + 42 * scale, 12, RAPHAEL_CYAN_SOFT, 0.10, 2.2 * scale);
    }

    const texture = new this.THREE.CanvasTexture(canvas);
    texture.colorSpace = this.THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  createLayer(kind, diameter, opacity, z, speed) {
    const texture = this.createTexture(kind);
    const mat = new this.THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      blending: this.THREE.AdditiveBlending,
      side: this.THREE.DoubleSide,
    });
    const mesh = new this.THREE.Mesh(new this.THREE.PlaneGeometry(diameter, diameter), mat);
    mesh.position.z = z;
    mesh.renderOrder = kind === 'edge' ? 5 : 7;
    mesh.userData = { baseOpacity: opacity, speed };
    this.group.add(mesh);
    this.layers.push(mesh);
  }

  createLayers() {
    const mobileScale = this.profile.mobile ? 0.72 : this.profile.lowPower ? 0.86 : 1;
    if (this.profile.reduced) {
      this.createLayer('main', 18 * mobileScale, 0.42, 0.2, 0);
      return;
    }
    this.createLayer('edge', 27.2 * mobileScale, this.profile.mobile ? 0.44 : 0.56, -0.3, -0.010);
    this.createLayer('main', 21.4 * mobileScale, this.profile.mobile ? 0.52 : 0.62, 0.15, 0.016);
    this.createLayer('inner', 13.2 * mobileScale, this.profile.mobile ? 0.34 : 0.42, 0.35, -0.024);
  }

  update(dt, time, state = {}) {
    if (this.core?.group) this.group.position.copy(this.core.group.position);
    const energy = clamp(state.energy || 0, 0, 1);
    const warp = clamp(state.warp || 0, 0, 1);
    const motionScale = this.profile.reduced ? 0 : (state.handoff ? 0.36 : 1);
    const phase = state.stepped?.phase ?? 'idle';
    const pulse = state.stepped?.pulse ?? 1;
    const stepIndex = state.stepped?.stepIndex ?? 0;
    const stepped = phase === 'idle' ? Math.floor(time * 6) / 6 : stepIndex + pulse;
    const phaseBoost = phase === 'idle' ? 1 : 1 + pulse * 0.42;
    const stepGlow = phase === 'idle' ? 0 : pulse * 0.08 + stepIndex * 0.006;
    for (const layer of this.layers) {
      layer.rotation.z += dt * layer.userData.speed * (1 + warp * 3.2) * motionScale * phaseBoost;
      layer.material.opacity = layer.userData.baseOpacity * (0.86 + energy * 0.18 + Math.sin(stepped + layer.position.z * 4.0) * 0.035 + warp * 0.18 + stepGlow);
      layer.scale.setScalar(1 + warp * 0.04 + energy * 0.012);
    }
  }

  dispose() {
    if (this.group) {
      disposeObjectTree(this.group);
      this.group.removeFromParent?.();
    }
    this.layers = [];
  }
}

export { ReferenceGlyphRing };
