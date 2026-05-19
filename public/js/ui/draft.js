// @ts-check

import { LIMITS, UI_CONFIG } from '../config.js';
import { el } from '../dom.js';
import { AppState } from '../state.js';
import { runDraftSpellScan } from './spell.js';
import { renderHistory } from './history.js';

let _draftSaveTimer = null;

export const updateCharCount = (n) => {
  if (!el.charCount) return;
  const max = LIMITS.MAX_INPUT_CHARS;
  el.charCount.textContent = `${n.toLocaleString("zh-TW")} / ${max.toLocaleString("zh-TW")}`;
  el.charCount.classList.toggle("warn", n > max * 0.85 && n <= max);
  el.charCount.classList.toggle("over", n > max);
};

// 草稿 per-uid 隔離：各帳號各自 key，切換不互相覆蓋、切回來還在；登出不刪
const draftKey = () => `${UI_CONFIG.DRAFT_KEY}::${AppState.get("fbAuth")?.currentUser?.uid || "anon"}`;

export const scheduleDraftSave = () => {
  if (_draftSaveTimer) clearTimeout(_draftSaveTimer);
  _draftSaveTimer = setTimeout(() => {
    _draftSaveTimer = null;
    try {
      localStorage.setItem(draftKey(), el.draftInput?.value ?? "");
    } catch (_) {}
  }, UI_CONFIG.DRAFT_DEBOUNCE_MS);
};

/** Clear the pending draft-save timer (called on page unload). */
export const clearDraftSaveTimer = () => {
  if (_draftSaveTimer) {
    clearTimeout(_draftSaveTimer);
    _draftSaveTimer = null;
  }
};

// 載入「當前帳號」的草稿。force=true（帳號真的切換）才無條件覆蓋成該帳號內容；
// 非強制時，不用空值蓋掉使用者正在編輯/已顯示的草稿（防 auth 重觸發誤清）。
export const loadDraftFromStorage = (force = false) => {
  try {
    const k = draftKey();
    let saved = localStorage.getItem(k);
    if (saved === null) {
      // 一次性 migration：per-uid key 無 → 撿 per-uid 改造前的舊全域單一草稿，遷入本帳號後刪除舊鍵
      const legacy = localStorage.getItem(UI_CONFIG.DRAFT_KEY);
      if (legacy) {
        saved = legacy;
        try { localStorage.setItem(k, legacy); localStorage.removeItem(UI_CONFIG.DRAFT_KEY); } catch (_) {}
      }
    }
    saved = saved || "";
    if (!el.draftInput) return;
    if (!force && saved === "" && el.draftInput.value) return;
    el.draftInput.value = saved;
    updateCharCount(saved.length);
    runDraftSpellScan();
  } catch (_) {}
};

const clearDraftStorage = () => {
  try { localStorage.removeItem(draftKey()); } catch (_) {}
};

export const clearText = () => {
  if (el.draftInput) el.draftInput.value = "";
  updateCharCount(0);
  runDraftSpellScan();
  clearDraftStorage();
  AppState.set("activeId", null);
  renderHistory();
  if (el.result) {
    el.result.innerHTML = `<span style="color:var(--text-4)">✦ 輸入草稿後按下「檢查」即可開始分析…</span>`;
  }
  el.draftInput?.focus();
};
