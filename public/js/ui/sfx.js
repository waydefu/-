// @ts-check

/* WebAudio：純合成，無音檔資產。
   - playBootChime：登入手勢內的開機掃頻+叮
   - ambient：黑暗神聖低頻 drone（持續，登入畫面期間）
   - AnalyserNode：boot/ambient 都經 master→analyser→destination，
     getAudioLevel() 回 0..1 平滑低頻能量 → 供 loginfx 做 audio-reactive
   autoplay policy：AudioContext 需使用者手勢才出聲 → ambient 用 armAmbient
   掛一次性手勢監聽延後啟動；靜音鈕（localStorage 持久）尊重使用者。 */

let _ctx = null, _master = null, _analyser = null, _freq = null;
let _ambient = null, _armed = null, _level = 0;
let _muted = false;
try { _muted = localStorage.getItem("flg_muted") === "1"; } catch (_) {}

const getCtx = () => {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();
  return _ctx;
};

// master → analyser → destination（boot 與 ambient 都接 master，能被分析）
const ensureGraph = () => {
  const ctx = getCtx();
  if (!ctx) return null;
  if (!_master) {
    _master = ctx.createGain();
    _master.gain.value = _muted ? 0.0001 : 1;
    _analyser = ctx.createAnalyser();
    _analyser.fftSize = 256;
    _analyser.smoothingTimeConstant = 0.82;
    _freq = new Uint8Array(_analyser.frequencyBinCount);
    _master.connect(_analyser);
    _analyser.connect(ctx.destination);
  }
  return ctx;
};

/** 0..1 平滑低頻能量；loginfx 每幀呼叫做核心/粒子/bloom 脈動。無音訊時回 0。 */
export const getAudioLevel = () => {
  if (!_analyser || !_freq || _muted) { _level *= 0.9; return _level; }
  _analyser.getByteFrequencyData(_freq);
  let s = 0;
  const n = Math.min(24, _freq.length); // 低頻段
  for (let i = 0; i < n; i++) s += _freq[i];
  const v = s / (n * 255);
  _level += (v - _level) * 0.2; // 再平滑一層
  return _level;
};

/** JARVIS 風開機掃頻 + 收尾叮。必須在使用者手勢內呼叫。 */
export const playBootChime = () => {
  try {
    if (_muted) return;
    const ctx = ensureGraph();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
    g.connect(_master);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(320, t0);
    lp.frequency.exponentialRampToValueAtTime(5200, t0 + 0.5);
    lp.Q.value = 6;
    lp.connect(g);
    [0, 6].forEach((detune) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.detune.value = detune;
      o.frequency.setValueAtTime(170, t0);
      o.frequency.exponentialRampToValueAtTime(720, t0 + 0.45);
      o.connect(lp); o.start(t0); o.stop(t0 + 0.9);
    });
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(70, t0);
    sub.frequency.exponentialRampToValueAtTime(150, t0 + 0.4);
    sub.connect(g); sub.start(t0); sub.stop(t0 + 0.7);
    const ding = ctx.createOscillator();
    const dg = ctx.createGain();
    ding.type = "sine";
    ding.frequency.setValueAtTime(990, t0 + 0.42);
    ding.frequency.exponentialRampToValueAtTime(1480, t0 + 0.62);
    dg.gain.setValueAtTime(0.0001, t0 + 0.42);
    dg.gain.exponentialRampToValueAtTime(0.09, t0 + 0.46);
    dg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95);
    ding.connect(dg); dg.connect(_master);
    ding.start(t0 + 0.42); ding.stop(t0 + 1.0);
  } catch (_) {}
};

const buildAmbient = () => {
  const ctx = ensureGraph();
  if (!ctx || _ambient) return;
  if (ctx.state === "suspended") ctx.resume();
  const t0 = ctx.currentTime;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t0);
  bus.gain.exponentialRampToValueAtTime(0.05, t0 + 6); // 緩緩浮起，極低音量
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 3;
  lp.connect(bus); bus.connect(_master);
  // 慢 LFO 掃濾波（呼吸感）
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 0.06; lfoG.gain.value = 240;
  lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(t0);
  // 暗色小調 drone：根音 + 五度 + 八度，微失諧漂移
  const oscs = [];
  [55, 82.5, 110, 164.81].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i < 2 ? "sine" : "triangle";
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 8;
    const og = ctx.createGain();
    og.gain.value = i === 3 ? 0.18 : 0.5;
    o.connect(og); og.connect(lp); o.start(t0);
    oscs.push(o);
  });
  _ambient = { bus, lp, lfo, oscs };
};

const clearArm = () => {
  if (_armed) {
    window.removeEventListener("pointerdown", _armed, true);
    window.removeEventListener("keydown", _armed, true);
    _armed = null;
  }
};

/** 啟動 ambient。autoplay 未解鎖時掛一次性手勢監聽延後啟動。靜音則不啟。 */
export const armAmbient = () => {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "running") { buildAmbient(); return; }
  if (_armed) return;
  _armed = () => { clearArm(); try { buildAmbient(); } catch (_) {} };
  window.addEventListener("pointerdown", _armed, true);
  window.addEventListener("keydown", _armed, true);
};

/** 停 ambient（交棒/登出）：緩降後停振盪，釋放節點。 */
export const stopAmbient = () => {
  clearArm();
  const a = _ambient; _ambient = null;
  if (!a || !_ctx) return;
  try {
    const t = _ctx.currentTime;
    a.bus.gain.cancelScheduledValues(t);
    a.bus.gain.setValueAtTime(Math.max(a.bus.gain.value, 0.0001), t);
    a.bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    a.oscs.forEach((o) => { try { o.stop(t + 0.7); } catch (_) {} });
    try { a.lfo.stop(t + 0.7); } catch (_) {}
    setTimeout(() => { try { a.bus.disconnect(); a.lp.disconnect(); } catch (_) {} }, 800);
  } catch (_) {}
};

export const isMuted = () => _muted;

/** 切換靜音（持久 localStorage）。靜音＝整個 master 壓到近零並停 ambient。 */
export const toggleMuted = () => {
  _muted = !_muted;
  try { localStorage.setItem("flg_muted", _muted ? "1" : "0"); } catch (_) {}
  if (_master && _ctx) {
    const t = _ctx.currentTime;
    _master.gain.cancelScheduledValues(t);
    _master.gain.setValueAtTime(_master.gain.value, t);
    _master.gain.linearRampToValueAtTime(_muted ? 0.0001 : 1, t + 0.25);
  }
  if (_muted) stopAmbient(); else armAmbient();
  return _muted;
};
