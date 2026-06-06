// @ts-nocheck
// 大賢者鑑定系統 — App 進入點與控制器（Stage 1 基礎重生）
// 功能邏輯沿用 core/services/utils；無 WebGL 耦合（Stage 2 再以 effects-manager 漸進增強）。
import { LIMITS, MSG, UI_CONFIG } from "./core/config.js";
import { AppState } from "./core/state.js";
import { analyzeDraft, isApiError } from "./services/analyze-api.js";
import { splitAnalysisSections, renderMarkdownLite } from "./utils/result-sections.js";
import { fb, initAuth, signInWithGoogle, signOutUser } from "./app/auth.js";
import {
  toast, setLine, openLogoutModal, closeLogoutModal,
  openHistory, closeHistory, bindScrim
} from "./app/ui.js";
import { initEffects } from "./effects/effects-manager.js";
import { initButtonFx } from "./effects/interactions.js";
import { playLinkStart } from "./effects/link-start.js";

const $ = (id) => document.getElementById(id);
const uid = () => AppState.get("currentUser")?.uid || "guest";
const draftKey = () => `${UI_CONFIG.DRAFT_KEY}_${uid()}`;
const historyKey = () => `${UI_CONFIG.STORAGE_KEY}_${uid()}`;
const fmtTime = (ts) => {
  try {
    return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(ts || Date.now()));
  } catch { return "封存時間未知"; }
};

const state = { analyzing: false, historyItems: [], activeHistoryId: "", pendingDeleteId: "", draftTimer: 0 };

/* ════════ 結果渲染 ════════ */
function createResultSection(kind, title, eyebrow, content) {
  const section = document.createElement("section");
  section.className = "result-section";
  section.dataset.section = kind;

  const head = document.createElement("div");
  head.className = "result-section-head";
  const wrap = document.createElement("div");
  const eb = document.createElement("span");
  eb.className = "result-section-eyebrow";
  eb.textContent = eyebrow;
  const h3 = document.createElement("h3");
  h3.className = "result-section-title";
  h3.textContent = title;
  wrap.append(eb, h3);

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn btn-ghost result-section-copy";
  copy.dataset.copySection = kind;
  copy.innerHTML = '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span class="btn-label">複製本段</span>';

  head.append(wrap, copy);

  const body = document.createElement("div");
  body.className = "result-section-body";
  body.innerHTML = renderMarkdownLite(content || "此段暫無回傳內容。");

  section.append(head, body);
  return section;
}

function renderResult(box, raw) {
  if (!box) return;
  const parsed = splitAnalysisSections(raw);
  box.replaceChildren();
  if (parsed.fallback) {
    box.append(createResultSection("all", "完整鑑定卷宗", "ARCANE DOSSIER", parsed.fallback));
    return;
  }
  if (parsed.rewrite) box.append(createResultSection("rewrite", "修改後全文", "REWRITTEN MANUSCRIPT", parsed.rewrite));
  if (parsed.summary) box.append(createResultSection("summary", "審查摘要", "EDITORIAL REVIEW", parsed.summary));
  if (!box.childElementCount) {
    const p = document.createElement("p");
    p.className = "result-empty";
    p.textContent = "分析完成，但核心尚未回傳文字。";
    box.append(p);
  }
}

/* ════════ 分析進度（cinematic steps；無 WebGL） ════════ */
const STEPS = ["語感鑑定中", "世界觀同步中", "角色邏輯掃描中", "敘事節奏校準中"];
function startProgress(box) {
  box.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = "analysis-progress";
  wrap.setAttribute("role", "status");
  wrap.setAttribute("aria-live", "polite");
  const ol = document.createElement("ol");
  ol.className = "steps";
  const lis = STEPS.map((label) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="tick" aria-hidden="true">◇</span><span>${label}</span>`;
    ol.appendChild(li);
    return li;
  });
  wrap.appendChild(ol);
  box.appendChild(wrap);
  let i = 0;
  const mark = () => {
    lis.forEach((li, idx) => {
      li.dataset.active = String(idx === i);
      li.dataset.done = String(idx < i);
      if (idx < i) li.querySelector(".tick").textContent = "◆";
    });
  };
  mark();
  const timer = window.setInterval(() => { i = Math.min(i + 1, STEPS.length - 1); mark(); }, 1100);
  return {
    complete() { i = STEPS.length; lis.forEach((li) => { li.dataset.done = "true"; li.dataset.active = "false"; li.querySelector(".tick").textContent = "◆"; }); },
    dispose() { window.clearInterval(timer); }
  };
}

/* ════════ 草稿 ════════ */
function updateDiagnostics() {
  const field = $("draftField");
  const len = (field?.value || "").length;
  const cc = $("charCount");
  if (cc) {
    cc.textContent = `${len.toLocaleString("zh-TW")} / ${LIMITS.MAX_INPUT_CHARS.toLocaleString("zh-TW")}`;
    cc.classList.toggle("warn", len > LIMITS.MAX_INPUT_CHARS * 0.85 && len <= LIMITS.MAX_INPUT_CHARS);
    cc.classList.toggle("over", len > LIMITS.MAX_INPUT_CHARS);
  }
}
function saveDraft() {
  try {
    localStorage.setItem(draftKey(), $("draftField")?.value || "");
    setLine("draftSync", "草稿記憶已同步");
  } catch { setLine("draftSync", "草稿記憶同步受阻", { error: true }); }
}
function restoreDraft() {
  const field = $("draftField");
  if (!field) return;
  try {
    const saved = localStorage.getItem(draftKey());
    if (saved && !field.value) field.value = saved;
    setLine("draftSync", saved ? "草稿記憶已同步" : "草稿記憶待命中");
  } catch { setLine("draftSync", "草稿記憶同步受阻", { error: true }); }
  updateDiagnostics();
}
function clearDraft() {
  const field = $("draftField");
  if (!field) return;
  field.value = "";
  const box = $("analysisResult");
  if (box) { box.replaceChildren(); const p = document.createElement("p"); p.className = "result-empty"; p.textContent = "鑑定卷宗尚未展開。完成一次分析後，這裡會顯示「修改後全文」與「審查摘要」。"; box.append(p); }
  updateDiagnostics();
  saveDraft();
  setLine("resultStatusText", "鑑定書庫待命，準備解析手稿");
  toast("手稿內容已清除");
  field.focus();
}

/* ════════ 歷史 ════════ */
function renderHistory() {
  const list = $("historyList");
  if (!list) return;
  list.replaceChildren();
  if (!state.historyItems.length) {
    state.activeHistoryId = "";
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "尚無鑑定紀錄。完成一次分析後，系統會自動封存於此。";
    list.appendChild(empty);
    return;
  }
  if (state.activeHistoryId && !state.historyItems.some((e) => e.id === state.activeHistoryId)) state.activeHistoryId = "";
  const frag = document.createDocumentFragment();
  state.historyItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-entry";
    row.setAttribute("role", "listitem");

    const open = document.createElement("button");
    open.type = "button";
    open.className = "history-item" + (item.id === state.activeHistoryId ? " is-active" : "");
    if (item.id === state.activeHistoryId) open.setAttribute("aria-current", "true");
    open.innerHTML = `<span class="history-time">${fmtTime(item.ts)}</span><span class="history-preview">${escapeHtml(item.preview || (item.draft || "").replace(/\s+/g, " ").slice(0, 86) || "未命名手稿")}</span>`;
    open.addEventListener("click", () => loadHistoryItem(item.id));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-ghost btn-danger btn-icon history-delete";
    const confirming = state.pendingDeleteId === item.id;
    del.textContent = confirming ? "確定" : "×";
    del.setAttribute("aria-label", confirming ? "再次確認刪除此筆鑑定紀錄" : "刪除此筆鑑定紀錄");
    del.addEventListener("click", () => deleteHistoryItem(item.id));

    row.append(open, del);
    frag.appendChild(row);
  });
  list.appendChild(frag);
}

async function refreshHistory(showStatus = true) {
  const list = $("historyList");
  if (!list) return;
  let items = [];
  try { items = JSON.parse(localStorage.getItem(historyKey()) || "[]"); } catch { items = []; }
  state.historyItems = Array.isArray(items) ? items.slice(0, LIMITS.MAX_HISTORY) : [];
  renderHistory();
  const user = AppState.get("currentUser");
  if (fb.db && user) {
    try {
      const snap = await fb.db.collection("users").doc(user.uid).collection("history").orderBy("ts", "desc").limit(LIMITS.MAX_HISTORY).get();
      state.historyItems = snap.docs.map((d) => d.data());
      localStorage.setItem(historyKey(), JSON.stringify(state.historyItems));
      renderHistory();
    } catch { if (showStatus) toast("鑑定紀錄同步受阻，已顯示本機封存"); }
  }
}

function loadHistoryItem(id) {
  const item = state.historyItems.find((e) => e.id === id);
  if (!item) return;
  state.activeHistoryId = id;
  renderHistory();
  const field = $("draftField");
  if (field) field.value = item.draft || "";
  renderResult($("analysisResult"), item.result || "此卷宗沒有保存鑑定結果。");
  saveDraft();
  updateDiagnostics();
  setLine("resultStatusText", "已載入封存鑑定卷宗");
  toast("鑑定紀錄已載入");
  closeHistory();
  field?.focus();
}

async function deleteHistoryItem(id) {
  if (state.pendingDeleteId !== id) {
    state.pendingDeleteId = id;
    renderHistory();
    toast("再次點擊以刪除此卷宗");
    return;
  }
  state.pendingDeleteId = "";
  state.historyItems = state.historyItems.filter((e) => e.id !== id);
  if (state.activeHistoryId === id) state.activeHistoryId = "";
  try { localStorage.setItem(historyKey(), JSON.stringify(state.historyItems)); } catch {}
  renderHistory();
  const user = AppState.get("currentUser");
  if (fb.db && user) {
    try { await fb.db.collection("users").doc(user.uid).collection("history").doc(id).delete(); }
    catch { toast("雲端卷宗刪除受阻，本機已更新"); }
  }
}

async function clearAllHistory() {
  if (!state.historyItems.length) { toast("沒有可清空的卷宗"); return; }
  const btn = $("historyClearAllBtn");
  const label = btn?.querySelector(".btn-label");
  const resetBtn = () => { btn?.classList.remove("is-confirming"); if (label) label.textContent = "全部刪除"; };
  // 兩擊確認，3 秒未確認自動還原
  if (!state.pendingClearAll) {
    state.pendingClearAll = true;
    btn?.classList.add("is-confirming");
    if (label) label.textContent = "確認清空？";
    toast("再次點擊以清空全部卷宗");
    window.clearTimeout(state.clearAllTimer);
    state.clearAllTimer = window.setTimeout(() => { state.pendingClearAll = false; resetBtn(); }, 3000);
    return;
  }
  state.pendingClearAll = false;
  window.clearTimeout(state.clearAllTimer);
  resetBtn();
  const ids = state.historyItems.map((e) => e.id);
  state.historyItems = [];
  state.activeHistoryId = "";
  state.pendingDeleteId = "";
  try { localStorage.setItem(historyKey(), JSON.stringify([])); } catch {}
  renderHistory();
  toast("已清空全部鑑定卷宗");
  const user = AppState.get("currentUser");
  if (fb.db && user && ids.length) {
    try {
      const batch = fb.db.batch();
      ids.forEach((id) => batch.delete(fb.db.collection("users").doc(user.uid).collection("history").doc(id)));
      await batch.commit();
    } catch { toast("雲端清空受阻，本機已清空"); }
  }
}

async function persistHistory({ draft, result, ts }) {
  const user = AppState.get("currentUser");
  const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  const item = {
    id, ts,
    draft: (draft || "").slice(0, LIMITS.MAX_DRAFT_STORE),
    result: (result || "").slice(0, LIMITS.MAX_RESULT_CHARS),
    preview: (draft || "").replace(/\s+/g, " ").slice(0, 86)
  };
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey()) || "[]");
    localStorage.setItem(historyKey(), JSON.stringify([item, ...saved].slice(0, LIMITS.MAX_HISTORY)));
  } catch (e) { console.warn("[FLG] 本機歷史略過：", e); }
  if (fb.db && user) {
    try { await fb.db.collection("users").doc(user.uid).collection("history").doc(id).set(item); }
    catch (e) { console.warn("[FLG] Firestore 歷史略過：", e); }
  }
  refreshHistory(false);
}

/* ════════ 分析 ════════ */
async function runAnalysis() {
  if (state.analyzing) return;
  const field = $("draftField");
  const box = $("analysisResult");
  const btn = $("analyzeBtn");
  const draft = (field?.value || "").trim();
  if (!draft) { setLine("resultStatusText", "請先貼上需要校準的小說手稿", { error: true }); toast("手稿尚未注入鑑定核心"); field?.focus(); return; }
  if (draft.length > LIMITS.MAX_INPUT_CHARS) { setLine("resultStatusText", `手稿超過 ${LIMITS.MAX_INPUT_CHARS.toLocaleString("zh-TW")} 字，請縮短段落`, { error: true }); toast("手稿超出核心承載上限"); return; }

  state.analyzing = true;
  window.dispatchEvent(new CustomEvent("worldforge:analysis-start"));
  btn?.classList.add("is-loading");
  btn?.setAttribute("disabled", "true");
  const reqId = (AppState.get("currentReqId") || 0) + 1;
  AppState.set("currentReqId", reqId);
  const ctrl = new AbortController();
  const startedAt = Date.now();
  setLine("resultStatusText", "正在解析手稿並建立鑑定卷宗");
  const progress = startProgress(box);
  const timeout = window.setTimeout(() => ctrl.abort(), 180000);
  try {
    const { result, fromCache } = await analyzeDraft(draft, ctrl.signal, reqId, () => {});
    if (reqId !== AppState.get("currentReqId")) return;
    progress.complete();
    renderResult(box, result || "分析完成，但核心尚未回傳文字。");
    setLine("resultStatusText", fromCache ? "已讀取封存鑑定卷宗" : "魔導鑑定卷宗已完成");
    toast(fromCache ? MSG.CACHE_HIT : "鑑定完成");
    persistHistory({ draft, result, ts: startedAt });
  } catch (error) {
    const message = error?.name === "AbortError" ? MSG.TIMEOUT : (isApiError(error) ? (error?.userMessage || MSG.FETCH_FAIL) : MSG.FETCH_FAIL);
    if (!isApiError(error) && error?.message) console.warn("[FLG] 分析失敗：", error.message);
    renderResult(box, message);
    setLine("resultStatusText", "鑑定中斷，請重試", { error: true });
    toast("鑑定中斷，請重試");
  } finally {
    progress.dispose();
    window.clearTimeout(timeout);
    state.analyzing = false;
    window.dispatchEvent(new CustomEvent("worldforge:analysis-complete"));
    btn?.classList.remove("is-loading");
    btn?.removeAttribute("disabled");
  }
}

/* ════════ 複製 ════════ */
async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}
async function copySection(kind, btn) {
  const sec = $("analysisResult")?.querySelector(`[data-section="${CSS.escape(kind)}"] .result-section-body`);
  const text = (sec?.innerText || sec?.textContent || "").trim();
  if (!text) { toast("此段尚無可複製內容"); return; }
  const ok = await copyText(text);
  toast(ok ? "已複製到剪貼簿" : "剪貼簿寫入失敗，請手動選取");
  // Stage 3-C：複製鈕回饋強化（成功→「已複製 ✓」綠態，1.4s 後還原）
  if (ok && btn) {
    const label = btn.querySelector(".btn-label");
    const prev = label ? label.textContent : "";
    btn.classList.add("is-copied");
    if (label) label.textContent = "已複製 ✓";
    window.clearTimeout(btn._copiedTimer);
    btn._copiedTimer = window.setTimeout(() => {
      btn.classList.remove("is-copied");
      if (label) label.textContent = prev || "複製本段";
    }, 1400);
  }
}

/* ════════ 工具 ════════ */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ════════ 認證狀態 → 切換登入/App ════════ */
function applyAuthState(user) {
  document.body.classList.toggle("is-authed", !!user);
  if (user) { restoreDraft(); refreshHistory(false); setLine("sysStatusText", "鑑定核心已連線"); }
  else { setLine("authStatus", ""); }
}

/* ════════ 綁定（一次性，無重複） ════════ */
function bind() {
  bindScrim();

  $("googleLoginBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.classList.add("is-loading"); btn.setAttribute("disabled", "true");
    setLine("authStatus", "Google 授權通道開啟中…");
    try { await signInWithGoogle(); playLinkStart(); }
    catch (err) {
      const closed = err?.code === "auth/popup-closed-by-user";
      setLine("authStatus", closed ? "已取消登入，請再試一次" : "Google 授權失敗，請稍後再試", { error: !closed });
    } finally { btn.classList.remove("is-loading"); btn.removeAttribute("disabled"); }
  });

  $("analyzeBtn")?.addEventListener("click", runAnalysis);
  $("clearBtn")?.addEventListener("click", clearDraft);

  const field = $("draftField");
  field?.addEventListener("input", () => {
    updateDiagnostics();
    window.clearTimeout(state.draftTimer);
    state.draftTimer = window.setTimeout(saveDraft, UI_CONFIG.DRAFT_DEBOUNCE_MS);
  });
  field?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runAnalysis(); }
  });

  // 結果分段複製（事件委派）
  $("analysisResult")?.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest("[data-copy-section]") : null;
    if (btn) copySection(btn.dataset.copySection || "all", btn);
  });

  // 歷史 sheet（手機）
  $("historyToggleBtn")?.addEventListener("click", () => {
    const open = $("historyPanel")?.classList.contains("is-open");
    if (open) closeHistory(); else openHistory();
  });
  $("historyCloseBtn")?.addEventListener("click", closeHistory);
  $("historyClearAllBtn")?.addEventListener("click", clearAllHistory);

  // 登出
  $("logoutBtn")?.addEventListener("click", openLogoutModal);
  $("logoutCancelBtn")?.addEventListener("click", closeLogoutModal);
  $("logoutConfirmBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.classList.add("is-loading"); btn.setAttribute("disabled", "true");
    try { await signOutUser(); } catch {}
    closeLogoutModal();
    btn.classList.remove("is-loading"); btn.removeAttribute("disabled");
    toast("已封存並登出");
  });

  window.addEventListener("worldforge:auth-changed", (e) => applyAuthState(e.detail?.user || null));
}

/* ════════ 啟動 ════════ */
function boot() {
  AppState.set("currentReqId", 0);
  bind();
  restoreDraft();
  // 認證狀態統一走 worldforge:auth-changed 事件（bind 已掛 listener），避免雙重觸發。
  initAuth();
  // Stage 2：WebGL 奇觀層延後啟動（不阻塞首屏；失敗/不支援/低效能自動回 CSS 背景）。
  initEffects();
  // Stage 3-B：按鈕 2026 微互動（漣漪 + 磁吸；互動才觸發、零閃零 vanish）。
  initButtonFx();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
