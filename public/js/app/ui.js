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
function showScrim(owner) { scrimUser = owner; $("scrim")?.classList.add("is-open"); }
function hideScrim() { scrimUser = null; $("scrim")?.classList.remove("is-open"); }

/** 開啟登出確認彈窗。 */
export function openLogoutModal() {
  const m = $("logoutModal");
  if (!m) return;
  m.hidden = false;
  // 強制 reflow 後加 is-open，確保進場 transition 觸發
  void m.offsetWidth;
  m.classList.add("is-open");
  showScrim("modal");
  $("logoutCancelBtn")?.focus();
}

/** 關閉登出確認彈窗。 */
export function closeLogoutModal() {
  const m = $("logoutModal");
  if (!m) return;
  m.classList.remove("is-open");
  hideScrim();
  window.setTimeout(() => { if (!m.classList.contains("is-open")) m.hidden = true; }, 280);
}

/** 開啟手機歷史 sheet（桌機側欄常駐，不需此）。 */
export function openHistory() {
  const p = $("historyPanel");
  if (!p) return;
  p.classList.add("is-open");
  $("historyToggleBtn")?.setAttribute("aria-expanded", "true");
  if (window.matchMedia("(max-width: 1079px)").matches) showScrim("history");
}

/** 關閉手機歷史 sheet。 */
export function closeHistory() {
  const p = $("historyPanel");
  if (!p) return;
  p.classList.remove("is-open");
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
