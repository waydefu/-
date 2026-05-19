// @ts-check
/* ═══════════════════════════════════════════════════════════════
   FLG 登入 HUD 面板資料/圖表引擎（NEXCORE 級）
   · 真實資料：navigator / screen / Intl 時鐘（不打 IP 服務 → 隱私+免
     CSP/網路依賴；位置以時區推導並標 FALLBACK）
   · 合成動態：核心負載長條圖、資料流 sparkline、CONSOLE LOG
   · 純裝飾 overlay（pointer-events:none）；登入框仍在上層可互動
   · 所有 interval/rAF 集中追蹤，交棒/登出時 stopLoginHud 收乾淨
   ═══════════════════════════════════════════════════════════════ */

import { isMuted, toggleMuted } from './sfx.js';

let _hud = null;
const $ = (id) => document.getElementById(id);

// 時區 → 大略地標（免網路；查不到就 FALLBACK/—）
const TZ_GEO = {
  "Asia/Taipei":     ["NEW TAIPEI CITY", "TAMSUI",   "25.17", "121.44"],
  "Asia/Tokyo":      ["TOKYO",           "CHIYODA",  "35.68", "139.76"],
  "Asia/Shanghai":   ["SHANGHAI",        "PUDONG",   "31.23", "121.47"],
  "Asia/Hong_Kong":  ["HONG KONG",       "CENTRAL",  "22.28", "114.16"],
  "Asia/Singapore":  ["SINGAPORE",       "DOWNTOWN", "1.35",  "103.82"],
  "America/Los_Angeles": ["LOS ANGELES", "DTLA",     "34.05", "-118.24"],
  "America/New_York":["NEW YORK",        "MANHATTAN","40.71", "-74.01"],
  "Europe/London":   ["LONDON",          "CITY",     "51.51", "-0.13"],
};

const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };

const fillStatic = () => {
  const nav = navigator;
  // 平台 / UA
  const uaData = /** @type {any} */ (nav).userAgentData;
  const plat = (uaData?.platform || nav.platform || "UNKNOWN");
  const ua = nav.userAgent || "";
  let browser = "UNKNOWN";
  const m = ua.match(/(Edg|OPR|Chrome|Firefox|Safari)\/([\d.]+)/);
  if (m) browser = (m[1] === "Edg" ? "Edge" : m[1] === "OPR" ? "Opera" : m[1]) + " " + m[2].split(".")[0] + ".0.0.0";
  setText("lh-platform", plat);
  setText("lh-cores", String(nav.hardwareConcurrency || "—"));
  setText("lh-arch", /arm/i.test(plat + ua) ? "arm64" : "x64");
  setText("lh-lang", nav.language || "—");
  setText("lh-ua", browser);
  // 螢幕 / 視窗
  const sync = () => {
    setText("lh-sw", String(screen.width));
    setText("lh-sh", String(screen.height));
    setText("lh-ww", String(window.innerWidth));
    setText("lh-wh", String(window.innerHeight));
    setText("lh-dpr", (window.devicePixelRatio || 1).toFixed(2));
  };
  sync();
  // 位置（時區推導，標 FALLBACK）
  let tz = "—";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "—"; } catch (_) {}
  const g = TZ_GEO[tz];
  setText("lh-region", g ? g[0] : (tz.split("/").pop() || "—").toUpperCase().replace(/_/g, " "));
  setText("lh-district", g ? g[1] : "—");
  setText("lh-lat", g ? g[2] : "—");
  setText("lh-long", g ? g[3] : "—");
  const off = -new Date().getTimezoneOffset();
  setText("lh-tz", (off >= 0 ? "+" : "") + off);
  return sync;
};

const clockTick = () => {
  const n = new Date();
  const p = (x) => String(x).padStart(2, "0");
  setText("lh-date", `${n.getFullYear()} / ${p(n.getMonth() + 1)} / ${p(n.getDate())}`);
  setText("lh-time", `${p(n.getHours())} : ${p(n.getMinutes())} : ${p(n.getSeconds())}`);
  setText("lh-ts", String(Math.floor(n.getTime() / 1000)));
  setText("lh-utc", `${p(n.getUTCHours())} : ${p(n.getUTCMinutes())} : ${p(n.getUTCSeconds())}`);
  const c = $("lh-clock"); if (c) c.textContent =
    `${n.getFullYear()}/${p(n.getMonth() + 1)}/${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
};

// 「Mana Frequency」流動頻譜帶（上下鏡像平滑曲線 + 掃描線）
// —— 取代 admin 風 bar chart，貼合 Arcane 世界觀。
const drawBars = (cv, data) => {
  const ctx = cv.getContext("2d"); if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 220, h = cv.clientHeight || 90;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cy = h / 2, n = data.length;
  const X = (i) => i / (n - 1) * w;
  const A = (i) => data[i] * (h * 0.42);
  const edge = (sign) => {
    ctx.moveTo(0, cy + sign * A(0));
    for (let i = 0; i < n - 1; i++) {
      const xc = (X(i) + X(i + 1)) / 2;
      const yc = (cy + sign * A(i) + cy + sign * A(i + 1)) / 2;
      ctx.quadraticCurveTo(X(i), cy + sign * A(i), xc, yc);
    }
    ctx.lineTo(w, cy + sign * A(n - 1));
  };
  // 填充帶（上緣 + 下鏡像）
  ctx.beginPath(); edge(-1);
  for (let i = n - 1; i > 0; i--) {
    const xc = (X(i) + X(i - 1)) / 2;
    const yc = (cy + A(i) + cy + A(i - 1)) / 2;
    ctx.quadraticCurveTo(X(i), cy + A(i), xc, yc);
  }
  ctx.closePath();
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "rgba(255,204,85,0.04)");
  grd.addColorStop(0.5, "rgba(232,160,32,0.26)");
  grd.addColorStop(1, "rgba(255,204,85,0.04)");
  ctx.fillStyle = grd; ctx.fill();
  // 上緣亮線
  ctx.beginPath(); edge(-1);
  ctx.strokeStyle = "rgba(255,204,85,0.6)"; ctx.lineWidth = 1.1; ctx.stroke();
  // 緩動掃描線
  const sx = ((Date.now() * 0.00018) % 1) * w;
  ctx.fillStyle = "rgba(255,230,150,0.35)";
  ctx.fillRect(sx, 0, 1, h);
};

const drawSpark = (cv, data) => {
  const ctx = cv.getContext("2d"); if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 220, h = cv.clientHeight || 46;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const mx = Math.max(...data), mn = Math.min(...data), nrm = (v) => (v - mn) / (mx - mn || 1);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w, y = (1 - nrm(v)) * (h - 6) + 3;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = "rgba(255,204,85,0.85)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  const gr = ctx.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "rgba(232,160,32,0.22)"); gr.addColorStop(1, "rgba(232,160,32,0)");
  ctx.fillStyle = gr; ctx.fill();
};

const LOGS = [
  "Core initialization complete.", "Encryption module loaded.",
  "Firewall active.", "Guardian protocol engaged.", "Lore database synced.",
  "Inference channel open.", "Awaiting user authentication...",
];

export const startLoginHud = (opts = {}) => {
  stopLoginHud();
  const reduced = !!opts.reduced;
  const intervals = new Set();
  const onResize = fillStatic();
  clockTick();
  intervals.add(setInterval(clockTick, 1000));
  window.addEventListener("resize", onResize);

  const barCv = $("lh-bars"), spkCv = $("lh-spark"), logBox = $("lh-log");
  const bars = Array.from({ length: 12 }, () => Math.random() * .6 + .25);
  const spark = Array.from({ length: 44 }, () => Math.random() * .5 + .35);
  if (barCv) drawBars(barCv, bars);
  if (spkCv) drawSpark(spkCv, spark);
  if (!reduced) {
    intervals.add(setInterval(() => {
      for (let i = 0; i < bars.length; i++) {
        bars[i] += (Math.random() - .5) * .25;
        bars[i] = Math.max(.12, Math.min(.98, bars[i]));
      }
      if (barCv) drawBars(barCv, bars);
      spark.push(Math.max(.1, Math.min(1, spark[spark.length - 1] + (Math.random() - .5) * .3)));
      spark.shift();
      if (spkCv) drawSpark(spkCv, spark);
    }, 900));
  }
  if (logBox) {
    let li = 0;
    const pushLog = () => {
      const n = new Date(), p = (x) => String(x).padStart(2, "0");
      const row = document.createElement("div");
      row.className = "lh-logrow";
      row.textContent = `[${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}] ${LOGS[li++ % LOGS.length]}`;
      logBox.appendChild(row);
      while (logBox.children.length > 6) logBox.removeChild(logBox.firstChild);
    };
    for (let k = 0; k < 5; k++) pushLog();
    if (!reduced) intervals.add(setInterval(pushLog, 3200));
  }

  // 靜音切換鈕（唯一可互動 HUD 元件）
  const muteBtn = $("lh-mute");
  let onMute = null;
  if (muteBtn) {
    const sync = () => {
      const m = isMuted();
      muteBtn.textContent = m ? "✕ MUTED" : "♪ AUDIO";
      muteBtn.classList.toggle("muted", m);
    };
    sync();
    onMute = () => { toggleMuted(); sync(); };
    muteBtn.addEventListener("click", onMute);
  }

  _hud = {
    cleanup() {
      intervals.forEach(clearInterval); intervals.clear();
      window.removeEventListener("resize", onResize);
      if (muteBtn && onMute) muteBtn.removeEventListener("click", onMute);
    },
  };
};

export const stopLoginHud = () => {
  const h = _hud; _hud = null;
  if (h) { try { h.cleanup(); } catch (_) {} }
};
