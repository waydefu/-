// @ts-nocheck
// 大賢者鑑定系統 — UI 控制（toast / 狀態列 / 彈窗 / 遮罩 / 歷史 sheet）
// 鐵則：transform/opacity 動畫；無 contain:paint；遮罩 pointer-events 由 .is-open 控制。
const $ = (id) => document.getElementById(id);

// ── a11y 浮層共用：焦點陷阱 + 捲動鎖 + 還焦點（modal / history 共用） ──
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let scrollLockCount = 0;
function lockScroll() { if (scrollLockCount++ === 0) document.body.style.overflow = "hidden"; }
function unlockScroll() { if (scrollLockCount > 0 && --scrollLockCount === 0) document.body.style.overflow = ""; }
function trapTab(container, e) {
  if (e.key !== "Tab") return;
  const f = Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/** 短暫通知。type: info(預設)|success|error|warning；error/warning 用 role=alert 搶讀。 */
export function toast(message, type = "info") {
  const wrap = $("toasts");
  if (!wrap || !message) return;
  const el = document.createElement("div");
  el.className = "toast toast-" + type;
  el.setAttribute("role", type === "error" || type === "warning" ? "alert" : "status");

  const msg = document.createElement("span");
  msg.className = "toast-msg";
  msg.textContent = message;
  el.appendChild(msg);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "關閉通知");
  close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  el.appendChild(close);

  let removed = false;
  const dismiss = () => {
    if (removed) return; removed = true;
    window.clearTimeout(autoT);
    el.classList.add("is-out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
    window.setTimeout(() => el.remove(), 500);   // reduced-motion 動畫熔斷時的保底移除
  };
  close.addEventListener("click", dismiss);
  // error/warning 停留久一點（4.2s），其餘 2.8s
  const autoT = window.setTimeout(dismiss, (type === "error" || type === "warning") ? 4200 : 2800);
  wrap.appendChild(el);
}

/** 設定狀態列文字 + error 狀態（line 容器需有 [data-state] 與內層文字 span）。 */
export function setLine(textId, text, { error = false } = {}) {
  const node = $(textId);
  if (!node) return;
  node.textContent = text;
  const line = node.closest(".status-line");
  if (line) line.dataset.state = error ? "error" : "ok";
}

let scrimUser = null; // "modal" | "history" | null
function showScrim(owner) {
  scrimUser = owner;
  const s = $("scrim");
  if (s) { s.dataset.owner = owner; s.classList.add("is-open"); }
}
function hideScrim() {
  scrimUser = null;
  const s = $("scrim");
  if (s) { s.classList.remove("is-open"); delete s.dataset.owner; }
}

/** 開啟登出確認彈窗。 */
export function openLogoutModal() {
  const m = $("logoutModal");
  if (!m) return;
  m._lastFocus = document.activeElement;          // 記住觸發元素，關閉時還焦點
  window.clearTimeout(m._closeTimer);
  m.classList.remove("is-closing");
  m.hidden = false;
  // 強制 reflow 後加 is-open，確保 SAO 開合動畫重新觸發
  void m.offsetWidth;
  m.classList.add("is-open");
  showScrim("modal");
  lockScroll();
  m._trap = (e) => trapTab(m, e);                 // Tab 焦點陷阱（限制在彈窗內循環）
  m.addEventListener("keydown", m._trap);
  $("logoutCancelBtn")?.focus();
}

/** 關閉登出確認彈窗（SAO 式收合：垂直收→水平收，動畫結束才 hidden）。 */
export function closeLogoutModal() {
  const m = $("logoutModal");
  if (!m) return;
  m.classList.remove("is-open");
  m.classList.add("is-closing");
  hideScrim();
  if (m._trap) { m.removeEventListener("keydown", m._trap); m._trap = null; }
  unlockScroll();
  const back = m._lastFocus; m._lastFocus = null;
  if (back && back.focus) back.focus();           // 還焦點給觸發鈕
  window.clearTimeout(m._closeTimer);
  m._closeTimer = window.setTimeout(() => { m.classList.remove("is-closing"); m.hidden = true; }, 360);
}

/** 開啟歷史 sheet（全裝置皆為置中底部抽屜）。 */
export function openHistory() {
  const p = $("historyPanel");
  if (!p) return;
  p._lastFocus = document.activeElement;
  window.clearTimeout(p._closeTimer);
  p.classList.remove("is-closing");
  void p.offsetWidth; // reflow → SAO 開合動畫重新觸發
  p.classList.add("is-open");
  $("historyToggleBtn")?.setAttribute("aria-expanded", "true");
  showScrim("history"); // 全裝置皆抽屜（部落格式單欄）→ 一律出遮罩
  lockScroll();
  p._trap = (e) => trapTab(p, e);
  p.addEventListener("keydown", p._trap);
  $("historyCloseBtn")?.focus();
}

/** 關閉手機歷史 sheet。 */
export function closeHistory() {
  const p = $("historyPanel");
  if (!p) return;
  p.classList.remove("is-open");
  p.classList.add("is-closing");
  window.clearTimeout(p._closeTimer);
  p._closeTimer = window.setTimeout(() => p.classList.remove("is-closing"), 360);
  $("historyToggleBtn")?.setAttribute("aria-expanded", "false");
  if (p._trap) { p.removeEventListener("keydown", p._trap); p._trap = null; }
  unlockScroll();
  const back = p._lastFocus; p._lastFocus = null;
  if (back && back.focus) back.focus();
  if (scrimUser === "history") hideScrim();
}

/** 綁定遮罩點擊：關閉當前覆蓋層。 */
export function bindScrim() {
  $("scrim")?.addEventListener("click", () => {
    if (scrimUser === "modal") closeLogoutModal();
    else if (scrimUser === "history") closeHistory();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (scrimUser === "modal") closeLogoutModal();
    else if (scrimUser === "history") closeHistory();
  });
}
