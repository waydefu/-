// @ts-nocheck
// 大賢者鑑定系統 — UI 控制（toast / 狀態列 / 彈窗 / 遮罩 / 歷史 sheet）
// 鐵則：transform/opacity 動畫；無 contain:paint；遮罩 pointer-events 由 .is-open 控制。
const $ = (id) => document.getElementById(id);

/** 短暫通知。 */
export function toast(message) {
  const wrap = $("toasts");
  if (!wrap || !message) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  wrap.appendChild(el);
  window.setTimeout(() => {
    el.classList.add("is-out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
    window.setTimeout(() => el.remove(), 500);
  }, 2600);
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
  window.clearTimeout(m._closeTimer);
  m.classList.remove("is-closing");
  m.hidden = false;
  // 強制 reflow 後加 is-open，確保 SAO 開合動畫重新觸發
  void m.offsetWidth;
  m.classList.add("is-open");
  showScrim("modal");
  $("logoutCancelBtn")?.focus();
}

/** 關閉登出確認彈窗（SAO 式收合：垂直收→水平收，動畫結束才 hidden）。 */
export function closeLogoutModal() {
  const m = $("logoutModal");
  if (!m) return;
  m.classList.remove("is-open");
  m.classList.add("is-closing");
  hideScrim();
  window.clearTimeout(m._closeTimer);
  m._closeTimer = window.setTimeout(() => { m.classList.remove("is-closing"); m.hidden = true; }, 360);
}

/** 開啟歷史 sheet（全裝置皆為置中底部抽屜）。 */
export function openHistory() {
  const p = $("historyPanel");
  if (!p) return;
  window.clearTimeout(p._closeTimer);
  p.classList.remove("is-closing");
  void p.offsetWidth; // reflow → SAO 開合動畫重新觸發
  p.classList.add("is-open");
  $("historyToggleBtn")?.setAttribute("aria-expanded", "true");
  showScrim("history"); // 全裝置皆抽屜（部落格式單欄）→ 一律出遮罩
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
