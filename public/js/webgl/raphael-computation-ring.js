// @ts-nocheck

import {
  TAU,
  BRIGHT_GOLD,
  RAPHAEL_CYAN,
  RAPHAEL_CYAN_SOFT,
  RAPHAEL_AMBER,
  RAPHAEL_GOLD_CORE,
  WARM_GOLD_NODE,
  SPIRITRON_WHITE,
  OPTICAL_TEAL,
} from './constants.js';
import { disposeObjectTree } from './dispose-utils.js';

class RaphaelComputationRing {
  constructor(THREE, scene, profile, core) {
    this.THREE = THREE;
    this.profile = profile;
    this.core = core;
    this.group = new THREE.Group();
    this.group.name = "Raphael Computation Ring";
    this.group.renderOrder = 2;
    this.rings = [];
    this.tickGroups = [];
    this.arcLines = [];
    this.glyphs = [];

    try {
      this.createConcentricRings();
      if (!profile.reduced) {
        this.createTickRings();
        this.createBrokenArcs();
        this.createGlyphMarks();
      } else {
        this.createReducedStaticMarks();
      }
      scene.add(this.group);
    } catch (err) {
      console.warn("[FLG] RaphaelComputationRing init failed:", err?.message || err);
      this.dispose();
    }
  }

  dispose() {
    if (this.group) {
      disposeObjectTree(this.group);
      this.group.removeFromParent?.();
    }
    this.rings = [];
    this.tickGroups = [];
    this.arcLines = [];
    this.glyphs = [];
  }

  createLineMaterial(color, opacity) {
    return new this.THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
  }

  createMeshMaterial(color, opacity) {
    return new this.THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
  }

  createConcentricRings() {
    const THREE = this.THREE;
    const count = this.profile.reduced ? 2 : this.profile.mobile || this.profile.lowPower ? 5 : 9;
    const palette = [
      RAPHAEL_GOLD_CORE,
      WARM_GOLD_NODE,
      RAPHAEL_AMBER,
      BRIGHT_GOLD,
      WARM_GOLD_NODE,
      RAPHAEL_GOLD_CORE,
      WARM_GOLD_NODE,
      OPTICAL_TEAL,
      RAPHAEL_CYAN_SOFT,
    ];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const radius = 5.2 + t * (this.profile.mobile ? 10.5 : 18.5);
      const tube = 0.012 + (1 - t) * 0.02;
      const color = palette[i % palette.length];
      const mat = this.createMeshMaterial(color, 0.13 + (1 - t) * 0.10);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 4, this.profile.mobile ? 128 : 224), mat);
      ring.renderOrder = 2;
      ring.rotation.set(i * 0.17, i * 0.11, i * 0.37);
      ring.userData = {
        speed: (0.018 + i * 0.006) * (i % 2 ? -1 : 1),
        baseOpacity: mat.opacity,
        phase: i * 0.58,
      };
      this.group.add(ring);
      this.rings.push(ring);
    }
  }

  createTickRings() {
    const THREE = this.THREE;
    const configs = this.profile.mobile || this.profile.lowPower
      ? [{ radius: 8.2, ticks: 48 }, { radius: 12.8, ticks: 64 }]
      : [{ radius: 7.2, ticks: 72 }, { radius: 12.4, ticks: 96 }, { radius: 18.6, ticks: 128 }];

    configs.forEach((cfg, ringIndex) => {
      const verts = [];
      for (let i = 0; i < cfg.ticks; i++) {
        if (i % 7 === 0) continue;
        const a = (i / cfg.ticks) * TAU;
        const len = i % 8 === 0 ? 0.62 : i % 3 === 0 ? 0.42 : 0.24;
        const inner = cfg.radius - len * 0.5;
        const outer = cfg.radius + len * 0.5;
        verts.push(
          Math.cos(a) * inner, Math.sin(a) * inner, 0,
          Math.cos(a) * outer, Math.sin(a) * outer, 0,
        );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const color = ringIndex === 0 ? RAPHAEL_GOLD_CORE : ringIndex === configs.length - 1 ? OPTICAL_TEAL : WARM_GOLD_NODE;
      const mat = this.createLineMaterial(color, ringIndex === 0 ? 0.28 : ringIndex === configs.length - 1 ? 0.14 : 0.24);
      const ticks = new THREE.LineSegments(geo, mat);
      ticks.renderOrder = 3;
      ticks.rotation.set(ringIndex * 0.22, ringIndex * 0.12, ringIndex * 0.19);
      ticks.userData = {
        speed: (0.012 + ringIndex * 0.009) * (ringIndex % 2 ? -1 : 1),
        baseOpacity: mat.opacity,
        phase: ringIndex * 0.9,
      };
      this.group.add(ticks);
      this.tickGroups.push(ticks);
    });
  }

  createBrokenArcs() {
    const THREE = this.THREE;
    const count = this.profile.mobile || this.profile.lowPower ? 9 : 18;
    for (let i = 0; i < count; i++) {
      const radius = 6.4 + (i % 6) * 2.35 + Math.floor(i / 6) * 0.8;
      const start = (i * 0.73) % TAU;
      const span = 0.22 + (i % 4) * 0.12;
      const steps = 14;
      const verts = [];
      for (let j = 0; j < steps; j++) {
        const a = start + (span * j) / (steps - 1);
        verts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const coolArc = i % 8 === 5;
      const color = coolArc ? OPTICAL_TEAL : i % 3 === 0 ? RAPHAEL_AMBER : WARM_GOLD_NODE;
      const mat = this.createLineMaterial(color, coolArc ? 0.14 : 0.24);
      const arc = new THREE.Line(geo, mat);
      arc.rotation.set(i * 0.09, i * 0.13, i * 0.31);
      arc.renderOrder = 3;
      arc.userData = {
        speed: (0.024 + (i % 5) * 0.005) * (i % 2 ? -1 : 1),
        baseOpacity: mat.opacity,
        phase: i * 0.41,
      };
      this.group.add(arc);
      this.arcLines.push(arc);
    }
  }

  createGlyphMarks() {
    const THREE = this.THREE;
    const count = this.profile.mobile || this.profile.lowPower ? 24 : 54;
    const geo = new THREE.BoxGeometry(0.12, 0.68, 0.018);
    for (let i = 0; i < count; i++) {
      const radius = 9.2 + (i % 4) * 3.4;
      const angle = (i / count) * TAU;
      const color = i % 12 === 0 ? SPIRITRON_WHITE : i % 9 === 0 ? RAPHAEL_CYAN_SOFT : i % 3 === 0 ? RAPHAEL_AMBER : WARM_GOLD_NODE;
      const opacity = i % 12 === 0 ? 0.24 : i % 9 === 0 ? 0.12 : 0.22;
      const mat = this.createMeshMaterial(color, opacity);
      const glyph = new THREE.Mesh(geo, mat);
      glyph.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      glyph.rotation.z = angle + Math.PI / 2;
      glyph.rotation.x = (i % 3 - 1) * 0.16;
      glyph.renderOrder = 4;
      glyph.userData = {
        speed: (0.014 + (i % 6) * 0.003) * (i % 2 ? -1 : 1),
        baseOpacity: mat.opacity,
        phase: i * 0.27,
      };
      this.group.add(glyph);
      this.glyphs.push(glyph);
    }
  }

  createReducedStaticMarks() {
    const THREE = this.THREE;
    const geo = new THREE.RingGeometry(7.8, 7.86, 96);
    const mat = this.createMeshMaterial(WARM_GOLD_NODE, 0.065);
    const ring = new THREE.Mesh(geo, mat);
    ring.renderOrder = 2;
    this.group.add(ring);
    this.rings.push(ring);
  }

  update(dt, time, state) {
    if (this.core?.group) {
      this.group.position.copy(this.core.group.position);
      this.group.scale.setScalar((this.profile.mobile ? 0.82 : 1.05) * (1 + state.warp * 0.16));
    }

    const energy = Math.min(1, state.energy || 0);
    const warp = Math.min(1, state.warp || 0);
    const phase = state.stepped?.phase ?? 'idle';
    const pulse = state.stepped?.pulse ?? 1;
    const stepIndex = state.stepped?.stepIndex ?? 0;
    const stepped = phase === 'idle' ? Math.floor(time * 8) / 8 : stepIndex + pulse;
    const stepBoost = phase === 'idle' ? 0 : pulse * 0.18 + stepIndex * 0.018;
    const phaseBoost = phase === 'idle' ? 1 : 1 + pulse * 0.62;
    const motionScale = state.handoff ? 0.42 : 1;

    for (const ring of this.rings) {
      ring.rotation.z += dt * (ring.userData.speed || 0.006) * (1 + warp * 3.2) * phaseBoost * motionScale;
      ring.material.opacity = (ring.userData.baseOpacity || 0.05) * (0.8 + energy * 0.45 + warp * 0.55 + stepBoost);
    }

    for (const ticks of this.tickGroups) {
      ticks.rotation.z += dt * ticks.userData.speed * (1 + warp * 4) * phaseBoost * motionScale;
      ticks.material.opacity = ticks.userData.baseOpacity * (0.72 + energy * 0.45 + Math.sin(stepped * 3 + ticks.userData.phase) * 0.12 + stepBoost);
    }

    for (const arc of this.arcLines) {
      arc.rotation.z += dt * arc.userData.speed * (1 + warp * 5.2) * phaseBoost * motionScale;
      arc.material.opacity = arc.userData.baseOpacity * (0.58 + energy * 0.55 + Math.sin(stepped * 4 + arc.userData.phase) * 0.22 + stepBoost);
    }

    for (const glyph of this.glyphs) {
      glyph.rotation.z += dt * glyph.userData.speed * (1 + warp * 2.4) * phaseBoost * motionScale;
      glyph.material.opacity = glyph.userData.baseOpacity * (0.65 + energy * 0.5 + Math.sin(stepped * 5 + glyph.userData.phase) * 0.18 + stepBoost);
    }
  }
}

export { RaphaelComputationRing };
