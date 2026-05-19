// @ts-check

import { CONFIG, LIMITS, MSG } from '../config.js';
import { el } from '../dom.js';
import { AppState, historyData, selectedIds } from '../state.js';
import { withFirestoreTimeout } from '../cache.js';
import { showToast } from './toast.js';
import { renderHistory } from './history.js';

/** 目前 session 快取所屬的 uid（null = 未登入 / 開機初始） */
let _sessionUid = null;

/** 設定當前 session uid（auth onAuthStateChanged 登入/登出時呼叫） */
export const setSessionUid = (uid) => { _sessionUid = uid; };

/** 每個使用者獨立的 sessionStorage key，杜絕跨帳號資料外洩 */
const sessionKeyFor = (uid) => `${CONFIG.STORAGE_KEY}_${uid || "guest"}`;

// 一次性清除舊的「全域」key（修正前殘留的他人資料，隱私）
try { sessionStorage.removeItem(CONFIG.STORAGE_KEY); } catch (_) {}

export const saveSession = () => {
  try {
    sessionStorage.setItem(sessionKeyFor(_sessionUid), JSON.stringify(historyData));
  } catch (_) {
    // sessionStorage 不可用時靜默忽略
  }
};

export const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(sessionKeyFor(_sessionUid));
    historyData.length = 0;
    if (raw) historyData.push(...JSON.parse(raw));
  } catch (_) {
    historyData.length = 0;
  }
};

/** 清空所有與使用者綁定的記憶體狀態（換帳號 / 登出時呼叫） */
export const clearUserData = () => {
  historyData.length = 0;
  selectedIds.clear();
  AppState.set("activeId", null);
};

const userHistRef = () => {
  const db = AppState.get("db");
  const user = AppState.get("currentUser");
  if (!db || !user || !AppState.get("firestoreReady")) return null;
  return db.collection("users").doc(user.uid).collection("history");
};

export const setSyncStatus = (state, msg) => {
  if (!el.panelSync) return;
  el.panelSync.className = `panel-sync ${state}`;
  el.panelSync.textContent = msg;
};

export const loadHistoryFromFirestore = async () => {
  const ref = userHistRef();
  if (!ref) {
    loadSession();
    renderHistory();
    return;
  }
  setSyncStatus("syncing", MSG.SYNC_LOADING);
  try {
    const snap = await withFirestoreTimeout(
      ref.orderBy("ts", "desc").limit(LIMITS.MAX_HISTORY).get()
    );
    historyData.length = 0;
    historyData.push(...snap.docs.map((d) => d.data()));
    saveSession();
    setSyncStatus("ok", MSG.SYNC_OK);
    renderHistory();
  } catch (err) {
    console.warn("[FLG] Firestore read failed:", err?.code, err?.message);
    setSyncStatus("err", MSG.SYNC_ERR);
    showToast(MSG.OFFLINE_TOAST, "info");
    loadSession();
    renderHistory();
  }
};

export const saveItemToFirestore = async (item) => {
  const ref = userHistRef();
  if (!ref) return;
  const RESULT_TRUNC_SUFFIX = "\n\n…（已截斷）";
  // 截斷後長度須嚴格 < Firestore rules 上限（draft 8192 / result 81920 字元，且含後綴），否則 set() 被 rules 靜默拒絕、雲端同步失敗
  const safeDraft = item.draft.length > LIMITS.MAX_DRAFT_STORE
    ? item.draft.substring(0, LIMITS.MAX_DRAFT_STORE - 16)
    : item.draft;
  const safeResult = item.result.length > LIMITS.MAX_RESULT_CHARS
    ? item.result.substring(0, LIMITS.MAX_RESULT_CHARS - RESULT_TRUNC_SUFFIX.length - 16) + RESULT_TRUNC_SUFFIX
    : item.result;
  const safeItem = {
    ...item,
    draft: safeDraft,
    result: safeResult,
    preview: safeDraft.slice(0, 60).replace(/\n/g, " ")
  };
  setSyncStatus("syncing", MSG.SYNC_SAVING);
  try {
    await withFirestoreTimeout(ref.doc(safeItem.id).set(safeItem));
    setSyncStatus("ok", MSG.SYNC_OK);
  } catch (err) {
    setSyncStatus("err", MSG.SYNC_SAVE_ERR);
    showToast(MSG.SAVE_ERR_TOAST.replace("{code}", err?.code || err?.message));
  }
};

export const deleteItemFromFirestore = async (id) => {
  const ref = userHistRef();
  if (!ref) return;
  try {
    await ref.doc(id).delete();
  } catch (err) {
    console.warn("[FLG] delete failed:", err?.message);
  }
};

export const deleteItemsFromFirestore = async (ids) => {
  const ref = userHistRef();
  if (!ref || !ids.length) return;
  const BATCH = 499;
  try {
    const db = AppState.get("db");
    if (!db) return;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = db.batch();
      ids.slice(i, i + BATCH).forEach((id) => batch.delete(ref.doc(id)));
      await batch.commit();
    }
  } catch (err) {
    console.warn("[FLG] batch delete failed:", err?.message);
  }
};
