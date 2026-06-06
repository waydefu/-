// @ts-nocheck
// Stage 3-A：LINK START 潛行隧道轉場（登入成功 → 進工作區時播放）。
// 純 CSS 動畫（motion.css），這裡只負責觸發 + 自動收尾。reduced-motion 直接跳過。
let timer = 0;
export function playLinkStart() {
  const el = document.getElementById("linkStart");
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.classList.remove("is-playing");
  void el.offsetWidth;          // reflow → 確保重新播放
  el.classList.add("is-playing");
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove("is-playing"), 2700);
}
