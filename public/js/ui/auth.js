// @ts-nocheck

import { APP_CHECK_CONFIG, FIREBASE_CONFIG, MSG } from '../core/config.js?v=40';
import { el } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { showToast } from './toast-center.js';
import { loadHistoryForCurrentUser, renderHistory, setSyncStatus } from './history-panel.js';
import { renderUserPanel, renderUserTrigger } from './user-menu.js';
import {
  loadSession,
  clearUserData,
  setSessionUid
} from '../services/history-sync.js';
import { resetResultPanel } from './result-view.js';
import { startLoginFx, warpLoginFx, stopLoginFx } from './loginfx.js?v=39';
import { startLoginHud, stopLoginHud } from './loginhud.js';
import { loadDraftFromStorage } from './draft-editor.js';
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
    el.loginScreen?.classList.add("boot-complete");
    let cv = el.loginGl;
    if (cv && cv.parentNode) {
      const fresh = document.createElement("canvas");
      fresh.id = "loginGl";
      fresh.setAttribute("aria-hidden", "true");
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
let _emailAuthMode = "login";
let _emailAuthBound = false;
let _authActionStarted = false;

const resolveInitialAuthGate = () => {
  document.body.classList.remove("auth-resolving");
};

const beginAuthAction = () => {
  _authActionStarted = true;
};

const cancelAuthAction = () => {
  _authActionStarted = false;
};

const consumeAuthAction = () => {
  const started = _authActionStarted;
  _authActionStarted = false;
  return started;
};

const blurActiveElement = () => {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
};

const clearLoginStateClasses = () => {
  el.loginScreen?.classList.remove(
    "show",
    "fade-out",
    "warping",
    "auth-pending",
    "boot-complete",
  );
};

const closeLoginWithoutHandoff = () => {
  stopLoginFx();
  stopLoginHud();
  stopAmbient();
  clearLoginStateClasses();
  el.loginScreen?.classList.add("gone");
  setLoginScreenVisible(false, false);
  blurActiveElement();
};

const setLoginErr = (msg = "") => {
  if (el.loginErr) el.loginErr.textContent = msg;
};

const setRitualStatus = (msg = "小說編修引擎待命中") => {
  const status = document.getElementById("loginRitualStatus");
  if (status) status.textContent = msg;
};

const clearCredentialSecrets = () => {
  if (el.loginPassword) el.loginPassword.value = "";
  if (el.loginPasswordConfirm) el.loginPasswordConfirm.value = "";
};

const setEmailAuthMode = (mode) => {
  _emailAuthMode = mode === "signup" ? "signup" : "login";
  const signup = _emailAuthMode === "signup";
  el.loginModeLogin?.classList.toggle("active", !signup);
  el.loginModeSignup?.classList.toggle("active", signup);
  el.loginModeLogin?.setAttribute("aria-pressed", signup ? "false" : "true");
  el.loginModeSignup?.setAttribute("aria-pressed", signup ? "true" : "false");
  el.emailAuthForm?.classList.toggle("signup-mode", signup);
  if (el.loginPassword) {
    el.loginPassword.setAttribute("autocomplete", signup ? "new-password" : "current-password");
  }
  if (el.loginEmailSubmit) {
    el.loginEmailSubmit.textContent = signup ? "建立作者印記" : "開啟編修儀式";
  }
  setRitualStatus(signup ? "正在準備作者印記註冊儀式" : "小說編修引擎待命中");
};

const getEmailAuthMessage = (err) => {
  const code = err?.code || "";
  const messages = {
    "auth/email-already-in-use": "這個 Email 已封存作者印記，請切換到登入。",
    "auth/invalid-email": "作者印記格式不正確。",
    "auth/missing-password": "請輸入奧術密鑰。",
    "auth/weak-password": "奧術密鑰至少需要 6 位。",
    "auth/wrong-password": "作者印記或奧術密鑰不正確。",
    "auth/invalid-credential": "作者印記或奧術密鑰不正確。",
    "auth/user-not-found": "找不到這個作者印記，請先註冊。",
    "auth/operation-not-allowed": "Firebase Email/Password 登入尚未啟用，請先到 Console 開啟。",
    "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
  };
  return messages[code] || `作者認證失敗：${err?.message || "未知錯誤"}`;
};

const setCredentialBusy = (busy) => {
  el.loginScreen?.classList.toggle("auth-pending", busy);
  [el.loginEmailSubmit, el.loginModeLogin, el.loginModeSignup, el.loginGoogleBtn, el.loginGuestBtn].forEach((node) => {
    if (!node) return;
    node.disabled = busy;
    node.style.opacity = busy ? "0.6" : "";
  });
};

const submitEmailAuth = async (auth) => {
  if (!auth) { setLoginErr(MSG.NO_FIREBASE); return; }
  const email = el.loginEmail?.value?.trim() || "";
  const password = el.loginPassword?.value || "";
  const displayName = el.loginDisplayName?.value?.trim() || "";
  const confirm = el.loginPasswordConfirm?.value || "";
  const signup = _emailAuthMode === "signup";

  if (!email || !password) {
    setLoginErr("請輸入作者印記與奧術密鑰。");
    return;
  }
  if (signup && !displayName) {
    setLoginErr("請輸入作者稱號。");
    el.loginDisplayName?.focus();
    return;
  }
  if (signup && password !== confirm) {
    setLoginErr("兩次奧術密鑰不一致。");
    el.loginPasswordConfirm?.focus();
    return;
  }

  setLoginErr("");
  setRitualStatus(signup ? "正在建立作者印記" : "正在開啟編修儀式");
  setCredentialBusy(true);
  beginAuthAction();
  try {
    playBootChime();
    if (signup) {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      if (displayName && credential.user?.updateProfile) {
        await credential.user.updateProfile({ displayName });
        AppState.set("currentUser", credential.user);
        renderUserTrigger();
        renderAuthUserPanel();
      }
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    clearCredentialSecrets();
  } catch (err) {
    cancelAuthAction();
    setCredentialBusy(false);
    setLoginErr(getEmailAuthMessage(err));
    setRitualStatus("作者認證未通過，請重新校準印記");
  }
};

const bindEmailAuthControls = (auth) => {
  if (_emailAuthBound) return;
  _emailAuthBound = true;
  setEmailAuthMode("login");
  el.loginModeLogin?.addEventListener("click", () => {
    setLoginErr("");
    setEmailAuthMode("login");
    el.loginEmail?.focus();
  });
  el.loginModeSignup?.addEventListener("click", () => {
    setLoginErr("");
    setEmailAuthMode("signup");
    el.loginDisplayName?.focus();
  });
  el.emailAuthForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitEmailAuth(auth);
  });
  el.loginDisplayName?.addEventListener("input", () => setRitualStatus("正在同步草稿記憶"));
  el.loginEmail?.addEventListener("input", () => setRitualStatus("正在校準作者印記"));
  el.loginPassword?.addEventListener("input", () => setRitualStatus("正在檢查奧術密鑰"));
  el.loginPasswordConfirm?.addEventListener("input", () => setRitualStatus("正在確認奧術密鑰"));
};

const initAppCheck = () => {
  const siteKey = APP_CHECK_CONFIG.RECAPTCHA_ENTERPRISE_SITE_KEY.trim();
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocalHost) {
    AppState.set("appCheck", null);
    AppState.set("appCheckReady", false);
    AppState.set("appCheckStatus", "local-disabled");
    AppState.set("appCheckError", "");
    return;
  }
  if (!siteKey || typeof firebase?.appCheck !== "function") {
    AppState.set("appCheckStatus", siteKey ? "sdk-missing" : "disabled");
    return;
  }
  try {
    if (typeof firebase.appCheck.ReCaptchaEnterpriseProvider !== "function") {
      throw new Error("ReCaptchaEnterpriseProvider is unavailable");
    }
    const provider = new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey);
    const appCheck = firebase.appCheck();
    appCheck.activate(provider, true);
    AppState.set("appCheck", appCheck);
    AppState.set("appCheckReady", false);
    AppState.set("appCheckStatus", "activated");
    AppState.set("appCheckError", "");
    appCheck.getToken(false)
      .then((tokenResult) => {
        const ok = !!tokenResult?.token;
        AppState.set("appCheckReady", ok);
        AppState.set("appCheckStatus", ok ? "token-ready" : "token-empty");
      })
      .catch((err) => {
        AppState.set("appCheckReady", false);
        AppState.set("appCheckStatus", "token-error");
        AppState.set("appCheckError", err?.message || "App Check token unavailable");
        console.warn("[FLG] App Check warmup failed:", err?.message);
      });
  } catch (err) {
    AppState.set("appCheck", null);
    AppState.set("appCheckReady", false);
    AppState.set("appCheckStatus", "init-error");
    AppState.set("appCheckError", err?.message || "App Check init failed");
    console.warn("[FLG] App Check init failed:", err?.message);
  }
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
  document.body.classList.toggle("login-open", visible);
  el.loginScreen.setAttribute("aria-hidden", visible ? "false" : "true");
  if (visible) {
    el.loginScreen.style.setProperty("opacity", "1", "important");
    el.loginScreen.style.setProperty("visibility", "visible", "important");
    el.loginScreen.style.setProperty("pointer-events", "auto", "important");
  } else {
    el.loginScreen.style.removeProperty("opacity");
    el.loginScreen.style.removeProperty("visibility");
    el.loginScreen.style.removeProperty("pointer-events");
  }
  if (visible) {
    el.loginScreen
      .querySelectorAll(".login-box, .login-box *, .login-hud, .login-hud *, .worldforge-callout, .worldforge-callout *")
      .forEach((node) => {
        if (node instanceof HTMLElement) node.style.setProperty("visibility", "visible", "important");
      });
  }
  if (visible) activateLoginFocusTrap();
  else deactivateLoginFocusTrap(restoreFocusOnClose);
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
  beginAuthAction();
  const pending = auth.signInWithPopup(provider);
  playBootChime();
  await pending; // 成功由 onAuthStateChanged 接手；錯誤往上拋給呼叫端顯示
};

const handleUserPanelGoogleLogin = async () => {
  const auth = AppState.get("fbAuth");
  if (!auth) return;
  try {
    await googleSignIn(auth);
  } catch (err) {
    cancelAuthAction();
    const code = err?.code || "";
    if (!isUserCancel(code)) {
      showToast("登入失敗：" + (err?.message || "未知錯誤"));
    }
  }
};

const renderAuthUserPanel = () => {
  renderUserPanel({ onGoogleLogin: handleUserPanelGoogleLogin });
};

export const handleGoogleLogin = async () => {
  const auth = AppState.get("fbAuth");
  if (!auth) { setLoginErr(MSG.NO_FIREBASE); return; }
  setLoginErr("");
  setRitualStatus("正在驗證 Google 印章");
  if (el.loginGoogleBtn) {
    el.loginGoogleBtn.disabled = true;
    el.loginGoogleBtn.style.opacity = "0.6";
  }
  el.loginScreen?.classList.add("auth-pending");
  try {
    await googleSignIn(auth);
  } catch (err) {
    cancelAuthAction();
    const code = err?.code || "";
    setLoginErr(isUserCancel(code) ? "" : "登入失敗：" + (err?.message || "未知錯誤"));
    setRitualStatus(isUserCancel(code) ? "小說編修引擎待命中" : "Google 印章驗證失敗");
    if (el.loginGoogleBtn) {
      el.loginGoogleBtn.disabled = false;
      el.loginGoogleBtn.style.opacity = "";
    }
    el.loginScreen?.classList.remove("auth-pending");
  }
};

export const handleGuestLogin = async () => {
  const auth = AppState.get("fbAuth");
  if (!auth) { setLoginErr(MSG.NO_FIREBASE); return; }
  playBootChime(); // 必須在此 click 手勢內，否則 autoplay policy 擋下
  setLoginErr("");
  setRitualStatus("正在建立訪客抄寫員席位");
  if (el.loginGuestBtn) {
    el.loginGuestBtn.disabled = true;
    el.loginGuestBtn.style.opacity = "0.6";
  }
  el.loginScreen?.classList.add("auth-pending");
  beginAuthAction();
  try {
    await auth.signInAnonymously();
  } catch (err) {
    cancelAuthAction();
    setLoginErr("訪客抄寫員登入失敗：" + (err?.message || "未知錯誤"));
    setRitualStatus("訪客抄寫員驗證失敗");
    if (el.loginGuestBtn) {
      el.loginGuestBtn.disabled = false;
      el.loginGuestBtn.style.opacity = "";
    }
    el.loginScreen?.classList.remove("auth-pending");
  }
};

export const initFirebase = () => {
  try {
    if (typeof firebase === "undefined") {
      renderUserTrigger();
      renderAuthUserPanel();
      loadSession();
      renderHistory();
      resolveInitialAuthGate();
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    initAppCheck();
    const firestore = firebase.firestore();
    const auth = firebase.auth();
    AppState.set("db", firestore);
    AppState.set("fbAuth", auth);
    AppState.set("firebaseReady", true);
    AppState.set("firestoreReady", true);
    bindEmailAuthControls(auth);
    // 完成 redirect 登入返回流程；成功的 user 由下方 onAuthStateChanged 接手，這裡只報錯
    auth.getRedirectResult().catch((err) => {
      console.warn("[FLG] redirect sign-in failed:", err?.code, err?.message);
      setLoginErr("登入失敗：" + (err?.message || "未知錯誤"));
    });
    auth.onAuthStateChanged(async (user) => {
      AppState.set("currentUser", user);
      renderUserTrigger();
      renderAuthUserPanel();
      // 帳號是否真的切換（用尚未被覆寫的 previousUser 比對 uid）
      const accountChanged = (AppState.get("previousUser")?.uid ?? null) !== (user?.uid ?? null);
      AppState.set("previousUser", user);
      // 載入「當前帳號」的 per-uid 草稿（僅帳號真的切換時強制覆蓋；登出不刪該帳號草稿）
      loadDraftFromStorage(accountChanged);

      if (user) {
        const shouldPlayHandoff = consumeAuthAction() && el.loginScreen?.classList.contains("show");
        deactivateLoginFocusTrap(false);
        clearUserData();
        resetResultPanel(); // 杜絕上一位分析內容殘留給新帳號看到
        setSessionUid(user.uid);
        renderHistory();

        if (!shouldPlayHandoff) {
          closeLoginWithoutHandoff();
          resolveInitialAuthGate();
          await loadHistoryForCurrentUser();
          return;
        }

        // 登入成功：歷史載入與 LINK START warp 並行（warp 播放期間順便載歷史）
        const handoff = () => {
          // 關鍵：先讓登入畫面淡出（loginfx 仍在「活著」渲染，畫面是真實
          // 動畫淡出，不是白格）→ display:none 完全看不見後 → 才 dispose。
          // 在可見時 stopLoginFx 會 forceContextLoss → canvas 變白一格＝你看到的全白。
          el.loginScreen?.classList.add("fade-out");
          setTimeout(() => {
            el.loginScreen?.classList.add("gone");
            el.loginScreen?.classList.remove("show", "fade-out", "warping", "auth-pending");
            setLoginScreenVisible(false, false);
            blurActiveElement();
            stopLoginFx();   // 此刻畫面已 display:none，context 丟失不可見
            stopLoginHud();
            stopAmbient();
          }, 700);
        };
        // warp 開始：登入鈕+HUD 漸消散（CSS .warping），不擋 LINK START 特效
        resolveInitialAuthGate();
        el.loginScreen?.classList.add("warping");
        setRitualStatus("正在進入禁忌書庫");
        // 無 3D（已登入直入 / WebGL fallback）時 warpLoginFx 會立即 handoff
        warpLoginFx(handoff);
        await loadHistoryForCurrentUser();
      } else {
        // 登出 / 未登入：清空，顯示登入畫面，啟動 3D 背景
        setSyncStatus("", "");
        clearUserData();
        resetResultPanel(); // 登出即清掉畫面上的分析內容
        setSessionUid(null);
        renderHistory();
        el.loginScreen?.classList.remove("gone", "fade-out", "warping", "auth-pending");
        el.loginScreen?.classList.add("show");
        // 復原登入按鈕：登入時被設 disabled，登出回登入畫面必須重新可用
        if (el.loginGoogleBtn) { el.loginGoogleBtn.disabled = false; el.loginGoogleBtn.style.opacity = ""; }
        if (el.loginGuestBtn) { el.loginGuestBtn.disabled = false; el.loginGuestBtn.style.opacity = ""; }
        setCredentialBusy(false);
        clearCredentialSecrets();
        setLoginErr("");
        setRitualStatus("小說編修引擎待命中");
        setLoginScreenVisible(true);
        resolveInitialAuthGate();
        startLoginBg();
      }
    });
  } catch (err) {
    console.warn("[FLG] Firebase init failed:", err?.message);
    renderUserTrigger();
    renderAuthUserPanel();
    loadSession();
    renderHistory();
    resolveInitialAuthGate();
  }
};
