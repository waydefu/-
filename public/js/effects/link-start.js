// @ts-nocheck
// LINK START — 光速隧道 warp（canvas 放射加速光線；登入成功 → 進工作區時播放）。
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
  const N = Math.min(460, Math.max(140, Math.floor((W * H) / 4200)));
  const stars = [];
  for (let i = 0; i < N; i++) {
    stars.push({
      x: (Math.random() - 0.5) * W,
      y: (Math.random() - 0.5) * H,
      z: Math.random() * depth,
      c: Math.random() < 0.16 ? "143,208,255" : "255,220,150", // 少量青藍，其餘金
    });
  }
  const t0 = performance.now();
  const loop = (now) => {
    const elapsed = (now - t0) / 1000;
    // 加速度曲線：0→2.0s 由慢漸快，2.0s 後收尾減速
    const accel = elapsed < 3.0 ? 5 + elapsed * 18 : Math.max(3, 59 - (elapsed - 3.0) * 90);
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const pz = s.z;
      s.z -= accel;
      if (s.z < 1) { s.z = depth; s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; continue; }
      const k = 230 / s.z, pk = 230 / pz;
      const px = s.x * k + cx, py = s.y * k + cy;
      const ppx = s.x * pk + cx, ppy = s.y * pk + cy;
      const depthT = 1 - s.z / depth;        // 越近越亮越粗
      ctx.strokeStyle = "rgba(" + s.c + "," + (0.2 + depthT * 0.65).toFixed(3) + ")";
      ctx.lineWidth = 0.6 + depthT * 2.6;
      ctx.beginPath();
      ctx.moveTo(ppx, ppy);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
