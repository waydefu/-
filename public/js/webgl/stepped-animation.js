// @ts-nocheck

const PHASE_STEPS = {
  idle: 0,
  burst: 5,
  warp: 5,
  handoff: 8,
};

const STEP_SECONDS = 0.08;

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);

class SteppedAnimationController {
  constructor({ reduced = false, reducedQuery = null } = {}) {
    this.reduced = !!reduced;
    this.query = reducedQuery || (typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null);
    this.phase = "idle";
    this.phaseStartTime = 0;
    this.completedPhase = null;
    this.lastSample = {
      delta: 0,
      time: 0,
      phase: "idle",
      pulse: 1,
      stepIndex: 0,
      reduced: this.reduced,
    };
    this.onReducedChange = (event) => this.setReduced(!!event.matches);

    if (this.query) {
      this.reduced = this.reduced || !!this.query.matches;
      if (this.query.addEventListener) {
        this.query.addEventListener("change", this.onReducedChange);
      } else if (this.query.addListener) {
        this.query.addListener(this.onReducedChange);
      }
    }
  }

  setReduced(value) {
    this.reduced = !!value;
    if (this.reduced) {
      this.phase = "idle";
      this.completedPhase = null;
    }
  }

  inferPhase(state = {}) {
    const warp = clamp01(state.warp || 0);
    const energy = clamp01(state.energy || 0);
    const handoff = !!state.handoff || !!state.operational || warp >= 0.72;
    if (handoff) return "handoff";
    if (warp >= 0.12) return "warp";
    if (energy >= 0.55 || !!state.burst) return "burst";
    return "idle";
  }

  update(delta, time, state = {}) {
    const targetPhase = this.inferPhase(state);

    if (this.reduced) {
      const maxSteps = PHASE_STEPS[targetPhase] || 1;
      this.lastSample = {
        delta,
        time,
        phase: targetPhase,
        pulse: 1,
        stepIndex: Math.max(0, maxSteps - 1),
        reduced: true,
      };
      return this.lastSample;
    }

    if (targetPhase === "idle") {
      this.phase = "idle";
      this.completedPhase = null;
    } else if (targetPhase !== this.phase && targetPhase !== this.completedPhase) {
      this.phase = targetPhase;
      this.phaseStartTime = time;
    }

    if (this.phase === "idle") {
      this.lastSample = {
        delta,
        time,
        phase: "idle",
        pulse: 0.7 + Math.sin(time * Math.PI) * 0.3,
        stepIndex: 0,
        reduced: false,
      };
      return this.lastSample;
    }

    const maxSteps = PHASE_STEPS[this.phase] || 1;
    const elapsed = Math.max(0, time - this.phaseStartTime);
    const stepIndex = Math.min(maxSteps - 1, Math.floor(elapsed / STEP_SECONDS));

    if (elapsed >= maxSteps * STEP_SECONDS) {
      this.completedPhase = this.phase;
      this.phase = "idle";
      this.lastSample = {
        delta,
        time,
        phase: "idle",
        pulse: 1,
        stepIndex: 0,
        reduced: false,
      };
      return this.lastSample;
    }

    const stepProgress = (elapsed - stepIndex * STEP_SECONDS) / STEP_SECONDS;
    this.lastSample = {
      delta,
      time,
      phase: this.phase,
      pulse: easeOutCubic(stepProgress),
      stepIndex,
      reduced: false,
    };
    return this.lastSample;
  }

  dispose() {
    if (this.query) {
      if (this.query.removeEventListener) {
        this.query.removeEventListener("change", this.onReducedChange);
      } else if (this.query.removeListener) {
        this.query.removeListener(this.onReducedChange);
      }
    }
    this.query = null;
    this.onReducedChange = null;
  }
}

export { SteppedAnimationController };
