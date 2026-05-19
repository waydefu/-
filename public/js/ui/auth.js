// @ts-check

import { FIREBASE_CONFIG, MSG } from '../config.js';
import { el } from '../dom.js';
import { AppState } from '../state.js';
import { showToast } from './toast.js';
import { closeAll } from './dropdown.js';
import { renderHistory } from './history.js';
import {
  loadSession,
  clearUserData,
  setSyncStatus,
  loadHistoryFromFirestore,
  setSessionUid
} from './firestore.js';
import { resetResultPanel } from './result.js';
import { startLoginFx, warpLoginFx, stopLoginFx } from './loginfx.js';
import { startLoginHud, stopLoginHud } from './loginhud.js';
import { loadDraftFromStorage } from './draft.js';
import { playBootChime, armAmbient, stopAmbient } from './sfx.js';

// 登入畫面 3D 背景：登出/未登入顯示登入畫面時啟動；WebGL 不可用 → 靜態
// 登入畫面（功能完全不受影響）。重登會先收舊的再重啟（可重播）。
let _fxStarting = false;
const startLoginBg = async () => {
  if (_fxStarting) return;
  _fxStarting = true;
  try {
    stopLoginFx();
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    startLoginHud({ reduced }); // HUD 面板獨立於 3D，WebGL 不可用也照顯示
    armAmbient(); // 黑暗神聖 ambient（autoplay 未解鎖時掛一次性手勢延後啟動）
    // 換上全新 canvas：上次 stopLoginFx 對舊 canvas 做了 forceContextLoss，
    // 同一 canvas 再 new WebGLRenderer 會失敗 → 登出重登只剩 HUD。
    let cv = el.loginGl;
    if (cv && cv.parentNode) {
      const fresh = /** @type {HTMLCanvasElement} */ (cv.cloneNode(false));
      cv.parentNode.replaceChild(fresh, cv);
      el.loginGl = fresh;
      cv = fresh;
    }
    if (!cv) return;
    if (cv.style.display === "none") cv.style.display = "";
    const ok = await startLoginFx(cv, {
      reduced,
      onLost: () => { if (el.loginGl) el.loginGl.style.display = "none"; },
    });
    if (!ok && el.loginGl) el.loginGl.style.display = "none"; // 回退純靜態
  } catch (_) {
    if (el.loginGl) el.loginGl.style.display = "none";
  } finally {
    _fxStarting = false;
  }
};

let _loginFocusReturn = null;
let _loginFocusTrapHandler = null;

const setLoginErr = (msg = "") => {
  if (el.loginErr) el.loginErr.textContent = msg;
};

const getLoginFocusables = () => {
  if (!el.loginScreen) return [];
  return Array.from(
    el.loginScreen.querySelectorAll(
      '.login-box button:not([disabled]), .login-box [href], .login-box input, .login-box select, .login-box textarea, .login-box [tabindex]:not([tabindex="-1"])'
    )
  );
};

const activateLoginFocusTrap = () => {
  _loginFocusReturn = document.activeElement;
  const focusables = getLoginFocusables();
  if (focusables.length) focusables[0].focus();
  if (_loginFocusTrapHandler) return;
  _loginFocusTrapHandler = (e) => {
    if (e.key !== "Tab" || !el.loginScreen?.classList.contains("show")) return;
    const items = getLoginFocusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", _loginFocusTrapHandler);
};

const deactivateLoginFocusTrap = (restoreFocus = true) => {
  if (_loginFocusTrapHandler) {
    document.removeEventListener("keydown", _loginFocusTrapHandler);
    _loginFocusTrapHandler = null;
  }
  if (restoreFocus && _loginFocusReturn?.focus) {
    try {
      _loginFocusReturn.focus();
    } catch (_) {}
  }
  _loginFocusReturn = null;
};

export const setLoginScreenVisible = (visible, restoreFocusOnClose = true) => {
  if (!el.loginScreen) return;
  el.loginScreen.setAttribute("aria-hidden", visible ? "false" : "true");
  if (visible) activateLoginFocusTrap();
  else deactivateLoginFocusTrap(restoreFocusOnClose);
};

const buildAvFallback = (name) => {
  const div = document.createElement("div");
  div.className = "user-avatar-fb";
  div.textContent = name.charAt(0).toUpperCase();
  div.setAttribute("aria-hidden", "true");
  return div;
};

const renderUserTrigger = () => {
  if (!el.userTrigger) return;
  while (el.userTrigger.firstChild) {
    el.userTrigger.removeChild(el.userTrigger.firstChild);
  }
  const chevron = document.createElement("span");
  chevron.className = "user-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";
  if (!AppState.get("firebaseReady") || !AppState.get("currentUser")) {
    const wrap = document.createElement("span");
    wrap.className = "login-compact";
    const dot = document.createElement("span");
    dot.className = "google-dot";
    dot.setAttribute("aria-hidden", "true");
    const txt = document.createElement("span");
    txt.className = "login-txt";
    txt.textContent = "登入";
    wrap.appendChild(dot);
    wrap.appendChild(txt);
    el.userTrigger.appendChild(wrap);
    el.userTrigger.setAttribute("aria-label", "登入 Google 帳號");
  } else {
    const user = AppState.get("currentUser");
    const name = user.displayName || "使用者";
    const photo = user.photoURL;
    let av;
    if (photo) {
      av = document.createElement("img");
      av.className = "user-avatar";
      av.alt = `${name}的頭像`;
      av.setAttribute("referrerpolicy", "no-referrer");
      av.setAttribute("src", photo);
      av.onerror = () => {
        const fallback = buildAvFallback(name);
        av.replaceWith(fallback);
      };
    } else {
      av = buildAvFallback(name);
    }
    const nm = document.createElement("span");
    nm.className = "user-name-short";
    nm.textContent = name;
    el.userTrigger.appendChild(av);
    el.userTrigger.appendChild(nm);
    el.userTrigger.setAttribute("aria-label", "帳號選單");
  }
  el.userTrigger.appendChild(chevron);
};

const renderUserPanel = () => {
  if (!el.userPanel) return;
  el.userPanel.innerHTML = "";
  if (!AppState.get("firebaseReady")) return;
  const panelUser = AppState.get("currentUser");
  if (panelUser) {
    const name = panelUser.displayName || "使用者";
    const info = document.createElement("div");
    info.className = "up-info";
    const n = document.createElement("div");
    n.className = "up-name";
    n.textContent = name;
    const e = document.createElement("div");
    e.className = "up-email";
    e.textContent = panelUser.email || "";
    info.appendChild(n);
    info.appendChild(e);
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "up-action";
    logoutBtn.textContent = "登出";
    logoutBtn.setAttribute("aria-label", "登出 Google 帳號");
    logoutBtn.addEventListener("click", () => {
      if (logoutBtn.dataset.confirming) {
        AppState.get("fbAuth")?.signOut();
        closeAll();
        return;
      }
      logoutBtn.dataset.confirming = "1";
      logoutBtn.textContent = "確定登出？";
      logoutBtn.style.color = "var(--red-soft)";
      setTimeout(() => {
        if (logoutBtn.isConnected) {
          delete logoutBtn.dataset.confirming;
          logoutBtn.textContent = "登出";
          logoutBtn.style.color = "";
        }
      }, 2500);
    });
    el.userPanel.appendChild(info);
    el.userPanel.appendChild(logoutBtn);
  } else {
    const loginInfo = document.createElement("div");
    loginInfo.className = "up-login-info";
    loginInfo.textContent = "登入後自動儲存歷史紀錄，跨裝置同步。";
    const loginBtn = document.createElement("button");
    loginBtn.className = "up-login-btn";
    loginBtn.setAttribute("aria-label", "使用 Google 帳號登入");
    const dot = document.createElement("div");
    dot.className = "google-dot";
    dot.setAttribute("aria-hidden", "true");
    const txt = document.createElement("span");
    txt.textContent = "使用 Google 登入";
    loginBtn.appendChild(dot);
    loginBtn.appendChild(txt);
    loginBtn.addEventListener("click", async () => {
      const auth = AppState.get("fbAuth");
      if (!auth) return;
      try {
        await googleSignIn(auth);
      } catch (err) {
        const code = err?.code || "";
        if (!isUserCancel(code)) {
          showToast("登入失敗：" + (err?.message || "未知錯誤"));
        }
      }
    });
    el.userPanel.appendChild(loginInfo);
    el.userPanel.appendChild(loginBtn);
  }
};

const isUserCancel = (code) =>
  code === "auth/popup-closed-by-user" || code === "auth/user-cancelled";

/**
 * 統一 Google 登入路徑：全平台 popup-only。
 * 不用 signInWithRedirect——在現行 authDomain=firebaseapp.com（跨來源）下，
 * 手機 Chrome 第三方儲存分割會吃掉 redirect 狀態 → 一直彈回登入頁。
 * 根治＝authDomain 改同源 .web.app（需先在 Google Cloud OAuth client 與
 * Firebase Auth 授權網域開通，Console 端動作）；開通前 popup 是相對可用路徑。
 * popup 必須在使用者手勢內「同步」開窗，故先發起再放音效。
 */
const googleSignIn = async (auth) => {
  const provider = new firebase.auth.GoogleAuthProvider();
  const pending = auth.signInWithPopup(provider);
  playBootChime();
  await pending; // 成功由 onAuthStateChanged 接手；錯誤往上拋給呼叫端顯示
};

export const handleGoogleLogin = async () => {
  const auth = AppState.get("fbAuth");
  if (!auth) { setLoginErr(MSG.NO_FIREBASE); return; }
  setLoginErr("");
  if (el.loginGoogleBtn) {
    el.loginGoogleBtn.disabled = true;
    el.loginGoogleBtn.style.opacity = "0.6";
  }
  try {
    await googleSignIn(auth);
  } catch (err) {
    const code = err?.code || "";
    setLoginErr(isUserCancel(code) ? "" : "登入失敗：" + (err?.message || "未知錯誤"));
    if (el.loginGoogleBtn) {
      el.loginGoogleBtn.disabled = false;
      el.loginGoogleBtn.style.opacity = "";
    }
  }
};

export const handleGuestLogin = async () => {
  const auth = AppState.get("fbAuth");
  if (!auth) { setLoginErr(MSG.NO_FIREBASE); return; }
  playBootChime(); // 必須在此 click 手勢內，否則 autoplay policy 擋下
  setLoginErr("");
  if (el.loginGuestBtn) {
    el.loginGuestBtn.disabled = true;
    el.loginGuestBtn.style.opacity = "0.6";
  }
  try {
    await auth.signInAnonymously();
  } catch (err) {
    setLoginErr("訪客登入失敗：" + (err?.message || "未知錯誤"));
    if (el.loginGuestBtn) {
      el.loginGuestBtn.disabled = false;
      el.loginGuestBtn.style.opacity = "";
    }
  }
};

export const initFirebase = () => {
  try {
    if (typeof firebase === "undefined") {
      renderUserTrigger();
      renderUserPanel();
      loadSession();
      renderHistory();
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    const firestore = firebase.firestore();
    const auth = firebase.auth();
    AppState.set("db", firestore);
    AppState.set("fbAuth", auth);
    AppState.set("firebaseReady", true);
    AppState.set("firestoreReady", true);
    // 完成 redirect 登入返回流程；成功的 user 由下方 onAuthStateChanged 接手，這裡只報錯
    auth.getRedirectResult().catch((err) => {
      console.warn("[FLG] redirect sign-in failed:", err?.code, err?.message);
      setLoginErr("登入失敗：" + (err?.message || "未知錯誤"));
    });
    auth.onAuthStateChanged(async (user) => {
      AppState.set("currentUser", user);
      renderUserTrigger();
      renderUserPanel();
      // 帳號是否真的切換（用尚未被覆寫的 previousUser 比對 uid）
      const accountChanged = (AppState.get("previousUser")?.uid ?? null) !== (user?.uid ?? null);
      AppState.set("previousUser", user);
      // 載入「當前帳號」的 per-uid 草稿（僅帳號真的切換時強制覆蓋；登出不刪該帳號草稿）
      loadDraftFromStorage(accountChanged);

      if (user) {
        // 登入成功：歷史載入與 LINK START warp 並行（warp 播放期間順便載歷史）
        deactivateLoginFocusTrap(false);
        clearUserData();
        resetResultPanel(); // 杜絕上一位分析內容殘留給新帳號看到
        setSessionUid(user.uid);
        renderHistory();
        const handoff = () => {
          // 關鍵：先讓登入畫面淡出（loginfx 仍在「活著」渲染，畫面是真實
          // 動畫淡出，不是白格）→ display:none 完全看不見後 → 才 dispose。
          // 在可見時 stopLoginFx 會 forceContextLoss → canvas 變白一格＝你看到的全白。
          el.loginScreen?.classList.add("fade-out");
          setTimeout(() => {
            el.loginScreen?.classList.add("gone");
            el.loginScreen?.classList.remove("show", "fade-out");
            setLoginScreenVisible(false, false);
            el.draftInput?.focus({ preventScroll: true });
            stopLoginFx();   // 此刻畫面已 display:none，context 丟失不可見
            stopLoginHud();
            stopAmbient();
          }, 700);
        };
        // warp 開始：登入鈕+HUD 漸消散（CSS .warping），不擋 LINK START 特效
        el.loginScreen?.classList.add("warping");
        // 無 3D（已登入直入 / WebGL fallback）時 warpLoginFx 會立即 handoff
        warpLoginFx(handoff);
        await loadHistoryFromFirestore();
      } else {
        // 登出 / 未登入：清空，顯示登入畫面，啟動 3D 背景
        setSyncStatus("", "");
        clearUserData();
        resetResultPanel(); // 登出即清掉畫面上的分析內容
        setSessionUid(null);
        renderHistory();
        el.loginScreen?.classList.remove("gone", "fade-out", "warping");
        el.loginScreen?.classList.add("show");
        // 復原登入按鈕：登入時被設 disabled，登出回登入畫面必須重新可用
        if (el.loginGoogleBtn) { el.loginGoogleBtn.disabled = false; el.loginGoogleBtn.style.opacity = ""; }
        if (el.loginGuestBtn) { el.loginGuestBtn.disabled = false; el.loginGuestBtn.style.opacity = ""; }
        setLoginScreenVisible(true);
        startLoginBg();
      }
    });
  } catch (err) {
    console.warn("[FLG] Firebase init failed:", err?.message);
    renderUserTrigger();
    renderUserPanel();
    loadSession();
    renderHistory();
  }
};
