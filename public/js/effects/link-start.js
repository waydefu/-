// @ts-nocheck
// LINK START — SAGE LINK 卷宗傳送（登入成功 → 進工作區時播放）。
// 與 SAGE CORE IGNITION 同語彙：金/琥珀/白金 + 少量青綠、符文劃隧道、法陣環外湧、白金核收束。
// 純 2D canvas（無 WebGL / 無 3D perspective）→ 手機不破圖。reduced-motion 仍照播。
let raf = 0;
let timer = 0;
const DURATION = 3600;

export function playLinkStart() {
  const el = document.getElementById("linkStart");
  const cv = document.getElementById("lsCanvas");
  if (!el) return;
  el.classList.remove("is-playing");
  void el.offsetWidth; // reflow → 重新播放 lsFade / title
  el.classList.add("is-playing");
  if (cv && cv.getContext) runWarp(cv);
  // 法陣同步衝能（effects-manager 監聽 pulse → core 短暫提亮）：轉場與背景一體
  try { window.dispatchEvent(new CustomEvent("worldforge:pulse")); } catch {}
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    el.classList.remove("is-playing");
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    const ctx = cv && cv.getContext ? cv.getContext("2d") : null;
    if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
  }, DURATION);
}

function runWarp(cv) {
  if (raf) cancelAnimationFrame(raf);
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
  cv.style.width = W + "px"; cv.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  const cx = W / 2, cy = H / 2;
  const depth = Math.max(W, H);
  const N = Math.min(420, Math.max(140, Math.floor((W * H) / 4600)));
  const streaks = [];
  for (let i = 0; i < N; i++) {
    const r = Math.random();
    streaks.push({
      x: (Math.random() - 0.5) * W,
      y: (Math.random() - 0.5) * H,
      z: Math.random() * depth,
      // 黑金語彙：金 60% / 琥珀 22% / 白金 12% / 青綠 6%
      c: r < 0.60 ? "255,214,128" : r < 0.82 ? "255,166,80" : r < 0.94 ? "255,246,224" : "98,214,196",
      glyph: Math.random() < 0.30,                 // 30% 畫成「符文短劃」（斷續虛線）
      w: 0.7 + Math.random() * 1.1,
    });
  }
  const rings = [];                                 // 法陣環外湧（ignition 語彙）
  let lastRing = 0;
  const t0 = performance.now();
  const loop = (now) => {
    const elapsed = (now - t0) / 1000;
    // 三幕：0-0.8 聚合醞釀（慢）→ 0.8-2.6 傳送（加速）→ 之後收尾減速
    const accel = elapsed < 0.8 ? 2 + elapsed * 6
                : elapsed < 2.6 ? 7 + (elapsed - 0.8) * 30
                : Math.max(3, 61 - (elapsed - 2.6) * 80);
    ctx.clearRect(0, 0, W, H);

    // 白金核（隨進度增亮，被 .ls-flash 淨化閃光接走）
    const coreA = Math.min(0.5, elapsed * 0.22);
    const coreR = 26 + Math.min(1, elapsed / 2.6) * 54;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
    g.addColorStop(0, "rgba(255,246,224," + coreA.toFixed(3) + ")");
    g.addColorStop(0.35, "rgba(255,214,128," + (coreA * 0.45).toFixed(3) + ")");
    g.addColorStop(1, "rgba(255,214,128,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - coreR * 3, cy - coreR * 3, coreR * 6, coreR * 6);

    // 法陣環外湧：傳送幕每 0.22s 一道，外擴漸隱
    if (elapsed > 0.6 && elapsed < 2.7 && now - lastRing > 220) {
      lastRing = now;
      rings.push({ r: coreR * 0.7, a: 0.5 });
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const rg = rings[i];
      rg.r += (3.5 + rg.r * 0.045) * (accel / 18);
      rg.a *= 0.965;
      if (rg.a < 0.012 || rg.r > depth) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = "rgba(255,214,128," + rg.a.toFixed(3) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, rg.r, 0, 6.2832); ctx.stroke();
      // 環上四向節點光珠（法陣節點語彙）
      ctx.fillStyle = "rgba(255,246,224," + (rg.a * 1.4).toFixed(3) + ")";
      for (let k = 0; k < 4; k++) {
        const ang = k * 1.5708 + rg.r * 0.01;
        ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rg.r, cy + Math.sin(ang) * rg.r, 1.6, 0, 6.2832); ctx.fill();
      }
    }

    // 符文劃隧道（徑向 warp；glyph 粒畫成斷續短劃=文字殘影被吸入）
    for (const s of streaks) {
      const pz = s.z;
      s.z -= accel;
      if (s.z < 1) { s.z = depth; s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; continue; }
      const k = 230 / s.z, pk = 230 / pz;
      const px = s.x * k + cx, py = s.y * k + cy;
      const ppx = s.x * pk + cx, ppy = s.y * pk + cy;
      const depthT = 1 - s.z / depth;
      ctx.strokeStyle = "rgba(" + s.c + "," + (0.18 + depthT * 0.68).toFixed(3) + ")";
      ctx.lineWidth = s.w * (0.6 + depthT * 2.4);
      if (s.glyph) {
        // 斷續短劃：分 3 節，节間留空 → 符文殘影感
        const dx = (px - ppx) / 5, dy = (py - ppy) / 5;
        for (let seg = 0; seg < 5; seg += 2) {
          ctx.beginPath();
          ctx.moveTo(ppx + dx * seg, ppy + dy * seg);
          ctx.lineTo(ppx + dx * (seg + 1), ppy + dy * (seg + 1));
          ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.lineTo(px, py); ctx.stroke();
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
