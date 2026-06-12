// @ts-nocheck
// SAGE AUDIO — 程序化 UI 音效（WebAudio 純合成、零素材、零依賴）。
// 設計：全部音色從同一 C 調基頻族派生、共用 attack/exp-decay envelope 與 lowpass 材質 → 整套「同一種金屬/羊皮紙」質感。
// 政策：AudioContext 首次手勢 resume；靜音狀態存 localStorage('flg-sfx')；預設開、master 音量克制(0.16)。
const BASE = 261.63; // C4
let ctx = null, master = null, noiseBuf = null;
let muted = false, unlocked = false;
let lastHover = 0, lastPulse = 0;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.16;
  master.connect(ctx.destination);
  const len = Math.floor(ctx.sampleRate * 0.5);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
function unlock() {
  if (unlocked) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
}
/** 共用音色：freq(Hz)、dur(s)、type 波形、vol 相對音量、sweep 結尾頻率倍率、delay(s) */
function tone(freq, dur, { type = "sine", vol = 1, sweep = 1, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = Math.min(9000, freq * 6); lp.Q.value = 0.8;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);            // 統一短 attack
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);           // 統一指數 decay
  osc.connect(lp); lp.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
/** 共用噪聲層（紙擦/能量沙感）：bandpass 中心頻 + 同款 envelope */
function hiss(dur, vol, freq, delay = 0) {
  if (!ctx || muted || !noiseBuf) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

export const sfx = {
  hover()  { const n = performance.now(); if (n - lastHover < 90) return; lastHover = n;
             tone(BASE * 5, 0.05, { vol: 0.30 }); },                                  // E~ 高頻微 tick
  click()  { tone(BASE * 2, 0.09, { type: "triangle", vol: 0.55 }); hiss(0.04, 0.18, 2400); },
  pulse()  { const n = performance.now(); if (n - lastPulse < 600) return; lastPulse = n;
             tone(BASE, 0.5, { vol: 0.28, sweep: 1.5 }); hiss(0.35, 0.10, 900); },    // 充能嗡
  login()  { [2, 2.5, 3, 4].forEach((m, i) =>                                         // C-E-G-C 琶音（連結成功）
               tone(BASE * m, 0.55, { vol: 0.45, delay: i * 0.10 }));
             hiss(0.6, 0.12, 1800, 0.30); },
  analyzeStart() { tone(BASE * 0.5, 1.1, { type: "triangle", vol: 0.40, sweep: 4 }); // 低 hum 升調（演算啟動）
                   hiss(0.9, 0.10, 700, 0.1); },
  complete() { tone(BASE * 4, 1.2, { vol: 0.50 }); tone(BASE * 6, 1.2, { vol: 0.30, delay: 0.07 });  // 完成鐘（C+G 泛音）
               hiss(0.25, 0.10, 3200, 0.05); },
  error()  { tone(BASE, 0.16, { type: "sawtooth", vol: 0.30 });
             tone(BASE * 0.944, 0.34, { type: "sawtooth", vol: 0.30, delay: 0.14 }); }, // 小二度下行（警示）
  setMuted(m) { muted = m;
    try { localStorage.setItem("flg-sfx", m ? "off" : "on"); } catch {}
    if (master) master.gain.value = m ? 0 : 0.16; },
  isMuted() { return muted; },
};

export function initAudioFx() {
  try { muted = localStorage.getItem("flg-sfx") === "off"; } catch {}
  // 首次手勢解鎖（autoplay 政策）
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
  // 互動接線（事件代理；hover 僅指標裝置）
  document.addEventListener("pointerdown", (e) => { if (e.target.closest("button, [role='option']")) sfx.click(); }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const t = e.target.closest("button, [role='option']");
    if (t && !t.contains(e.relatedTarget)) sfx.hover();
  }, { passive: true });
  // 站內事件
  window.addEventListener("worldforge:pulse", () => sfx.pulse());
  window.addEventListener("worldforge:analysis-start", () => sfx.analyzeStart());
  window.addEventListener("worldforge:analysis-complete", () => sfx.complete());
  window.addEventListener("worldforge:auth-changed", (e) => { if (e?.detail?.user) sfx.login(); });
  // 靜音開關
  const btn = document.getElementById("sfxToggleBtn");
  const sync = () => {
    if (!btn) return;
    btn.classList.toggle("is-muted", sfx.isMuted());
    btn.setAttribute("aria-pressed", String(!sfx.isMuted()));
    btn.setAttribute("aria-label", sfx.isMuted() ? "開啟音效" : "關閉音效");
  };
  btn?.addEventListener("click", () => { sfx.setMuted(!sfx.isMuted()); sync(); if (!sfx.isMuted()) sfx.click(); });
  sync();
}
