// @ts-nocheck

import { API_CONFIG, BTN_DEFAULT, BTN_LOADING, LIMITS, MSG } from './core/config.js?v=40';
import { el } from './core/dom.js';
import { AppState } from './core/state.js';
import { analyzeRateLimiter } from './services/cache.js';
import { analyzeDraft } from './services/analyze-api.js';
import { announce, showToast } from './ui/toast-center.js';
import {
  setError,
  setLoading,
  setResult,
  setResultShell,
  animateSteps,
  clearStepTimers
} from './ui/result-view.js';
import {
  renderHistory,
  addHistory,
  initHistoryDelegation,
  initHistoryActions
} from './ui/history-panel.js';
import { openDropdown, closeAll } from './ui/dropdown-menu.js';
import {
  initSpellWorker,
  runDraftSpellScan,
  scheduleDraftScan,
  clearDraftScanTimer,
  terminateSpellWorker
} from './ui/spell-scan.js';
import { initClock, clearAllIntervals } from './ui/clock-hud.js';
import {
  handleGoogleLogin,
  handleGuestLogin,
  initFirebase,
  setLoginScreenVisible
} from './ui/auth.js?v=44';
import {
  updateCharCount,
  scheduleDraftSave,
  loadDraftFromStorage,
  clearText,
  clearDraftSaveTimer
} from './ui/draft-editor.js';

/*
═════════════════════════════════════════════════════════
Fantasy Lore Guardian — app.js (orchestration only)

模組拆分後 app.js 僅負責：主分析流程 checkText、事件綁定、
程式庫就緒檢查、開機序列、頁面卸載清理。其餘職責見 ./ui/*.js：
  toast / clipboard / spell / hud / result / dropdown /
  firestore / history / draft / auth
═════════════════════════════════════════════════════════ */

/*
═════════════════════════════════════════════════════════
SECTION 16: MAIN CHECK FLOW
═════════════════════════════════════════════════════════ */
const checkText = async () => {
  if (AppState.get("isAnalyzing")) return;
  const draft = el.draftInput?.value?.trim() || "";
  if (!draft) {
    el.draftInput?.classList.add("input-error");
    el.draftInput?.focus();
    setTimeout(() => el.draftInput?.classList.remove("input-error"), 1800);
    return;
  }
  if (draft.length > LIMITS.MAX_INPUT_CHARS) {
    el.draftInput?.classList.add("input-error");
    setTimeout(() => el.draftInput?.classList.remove("input-error"), 1800);
    setError(`草稿超過 ${LIMITS.MAX_INPUT_CHARS.toLocaleString("zh-TW")} 字限制。`);
    return;
  }
  const rate = analyzeRateLimiter.tryAcquire();
  if (!rate.ok) {
    showToast(MSG.RATE_LIMIT.replace("{sec}", String(rate.waitSec)), "info", 4000);
    return;
  }
  const prevAbort = AppState.get("analyzeAbort");
  if (prevAbort) prevAbort.abort();
  const ctrl = new AbortController();
  AppState.set("analyzeAbort", ctrl);
  const reqId = AppState.get("currentReqId") + 1;
  AppState.set("currentReqId", reqId);
  AppState.set("isAnalyzing", true);
  if (el.checkBtn) {
    el.checkBtn.disabled = true;
    el.checkBtn.textContent = BTN_LOADING;
    el.checkBtn.setAttribute("aria-busy", "true");
  }
  setLoading();
  announce("法典審閱中，請稍候");
  animateSteps();
  renderHistory();
  const tid = setTimeout(() => ctrl.abort(), API_CONFIG.FETCH_TIMEOUT_MS);
  try {
    let lastRenderTime = 0;
    let _streamShellBuilt = false;
    const { result, fromCache } = await analyzeDraft(draft, ctrl.signal, reqId, (text) => {
      if (reqId !== AppState.get("currentReqId")) return;
      const now = Date.now();
      if (now - lastRenderTime < 100) return;
      lastRenderTime = now;
      // Build the result shell once; update only body.textContent during stream
      // (no markdown re-parse each 100ms — full parse happens after stream completes)
      if (!_streamShellBuilt) {
        setResultShell("法典審閱中…");
        _streamShellBuilt = true;
      }
      const body = el.result?.querySelector(".result-body");
      if (body) body.textContent = text;
    });
    if (reqId !== AppState.get("currentReqId")) return;
    setResult(result); // Final render
    if (fromCache) showToast(MSG.CACHE_HIT, "success", 3000);
    await addHistory(draft, result);
  } catch (err) {
    if (reqId !== AppState.get("currentReqId")) return;
    let msg = err?.userMessage || err?.message || "未知錯誤，請稍後再試。";
    if (err?.name === "AbortError") msg = MSG.TIMEOUT;
    else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) msg = MSG.FETCH_FAIL;
    setError(msg);
    console.error("[FLG] checkText error:", err);
  } finally {
    clearTimeout(tid);
    clearStepTimers();
    if (AppState.get("analyzeAbort") === ctrl) AppState.set("analyzeAbort", null);
    AppState.set("isAnalyzing", false);
    if (el.checkBtn) {
      el.checkBtn.disabled = false;
      el.checkBtn.textContent = BTN_DEFAULT;
      el.checkBtn.setAttribute("aria-busy", "false");
    }
    renderHistory();
  }
};

/*
═════════════════════════════════════════════════════════
SECTION 18: EVENT LISTENERS
═════════════════════════════════════════════════════════ */
const initEventListeners = () => {
  el.loginGoogleBtn?.addEventListener("click", handleGoogleLogin);
  el.loginGuestBtn?.addEventListener("click", handleGuestLogin);
  el.histTrigger?.addEventListener("click", () => openDropdown("hist"));
  el.userTrigger?.addEventListener("click", () => openDropdown("user"));
  el.navOverlay?.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
  el.checkBtn?.addEventListener("click", checkText);
  document.addEventListener("flg:reanalyze", () => {
    if (!AppState.get("isAnalyzing")) checkText();
  });
  el.clearBtn?.addEventListener("click", clearText);
  el.focusModeBtn?.addEventListener("click", () => {
    const on = document.body.classList.toggle("focus-mode");
    el.focusModeBtn?.setAttribute("aria-pressed", on ? "true" : "false");
    el.focusModeBtn?.setAttribute("aria-label", on ? "離開專注模式" : "進入專注模式");
    el.focusModeBtn.textContent = on ? "離開專注" : "專注模式";
    if (on) el.draftInput?.focus();
  });
  el.draftInput?.addEventListener("compositionstart", () => { AppState.set("ime", true); });
  el.draftInput?.addEventListener("compositionend", () => {
    AppState.set("ime", false);
    updateCharCount(el.draftInput?.value?.length || 0);
    scheduleDraftScan();
    scheduleDraftSave();
  });
  el.draftInput?.addEventListener("input", () => {
    if (AppState.get("ime")) return;
    updateCharCount(el.draftInput?.value?.length || 0);
    scheduleDraftScan();
    scheduleDraftSave();
  });
  el.draftInput?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      checkText();
    }
  });
  if (el.year) el.year.textContent = new Date().getFullYear();
};

/*
═════════════════════════════════════════════════════════
SECTION 19: LIBRARY READINESS CHECK
═════════════════════════════════════════════════════════ */
const waitForLibraries = () => {
  if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
    if (el.checkBtn) el.checkBtn.disabled = false;
  } else if (document.readyState !== "complete") {
    window.addEventListener("load", waitForLibraries, { once: true });
  } else {
    setTimeout(waitForLibraries, 100);
  }
};

/*
═════════════════════════════════════════════════════════
SECTION 20: BOOT SEQUENCE
═════════════════════════════════════════════════════════ */
window.addEventListener("beforeunload", () => {
  clearAllIntervals();
  clearStepTimers();
  clearDraftScanTimer();
  clearDraftSaveTimer();
  terminateSpellWorker();
});
/* ── Global error tracking ── */
window.addEventListener("error", (e) => {
  console.error("[FLG] Uncaught:", e.message, e.filename, e.lineno);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[FLG] Unhandled Promise:", e.reason);
});
const boot = () => {
  try {
    initClock();
    initEventListeners();
    initHistoryDelegation();
    initHistoryActions();
    loadDraftFromStorage();
    runDraftSpellScan();
    initSpellWorker();
    waitForLibraries();
    initFirebase();
    if (el.loginScreen?.classList.contains("show")) {
      setLoginScreenVisible(true);
    }
  } catch (err) {
    console.error("[FLG] Boot error:", err);
    showToast("系統啟動異常，請重新整理頁面。");
  }
};
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
