// @ts-nocheck
// Stage 3-B：按鈕 2026 微互動（按壓漣漪 + 磁吸 hover）。
// 全互動觸發、靜止不改變按鈕本體 → 零 vanish；transform/opacity → 零閃；reduced-motion 自動關。
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
let bound = false;

export function initButtonFx() {
  if (bound) return;
  bound = true;

  // 按壓漣漪（從點擊座標擴散，transient 子元素，按完即移除）
  document.addEventListener("pointerdown", (event) => {
    if (reduce) return;
    const btn = event.target instanceof Element ? event.target.closest(".btn") : null;
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    if (!rect.width) return;
    const size = Math.max(rect.width, rect.height) * 1.8;
    const r = document.createElement("span");
    r.className = "btn-ripple";
    r.style.width = r.style.height = `${size}px`;
    r.style.left = `${event.clientX - rect.left - size / 2}px`;
    r.style.top = `${event.clientY - rect.top - size / 2}px`;
    btn.appendChild(r);
    r.addEventListener("animationend", () => r.remove(), { once: true });
    window.setTimeout(() => { if (r.isConnected) r.remove(); }, 700);
  }, { passive: true });

  // 磁吸：按鈕往游標方向微移（桌面、非 reduced-motion）
  if (fine && !reduce) {
    document.addEventListener("pointermove", (event) => {
      const btn = event.target instanceof Element ? event.target.closest(".btn") : null;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (!rect.width) return;
      const mx = (((event.clientX - rect.left) / rect.width) - 0.5) * 6;
      const my = (((event.clientY - rect.top) / rect.height) - 0.5) * 6;
      btn.style.setProperty("--mag-x", `${mx.toFixed(2)}px`);
      btn.style.setProperty("--mag-y", `${my.toFixed(2)}px`);
    }, { passive: true });
    document.addEventListener("pointerout", (event) => {
      const btn = event.target instanceof Element ? event.target.closest(".btn") : null;
      if (btn) { btn.style.removeProperty("--mag-x"); btn.style.removeProperty("--mag-y"); }
    }, { passive: true });
  }
}
