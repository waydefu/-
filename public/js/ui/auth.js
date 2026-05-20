// @ts-check

import { APP_CHECK_CONFIG, FIREBASE_CONFIG, MSG } from '../config.js';
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
import { startLoginBoot, stopLoginBoot } from './loginboot.js';
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
    startLoginBoot({ reduced });
    armAmbient(); // 黑暗神聖 ambient（autoplay 未解鎖時掛一次性手勢延後啟動）
    // 換上全新 canvas：上次 stopLoginFx 對舊 canvas 做了 forceContextLoss，
    // 同一 canvas 再 new WebGLRenderer 會失敗 → 登出重登只剩 HUD。
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
    "booting",
    "boot-veil-on",
    "boot-welcome",
    "boot-reveal",
    "boot-complete",
  );
};

const closeLoginWithoutHandoff = () => {
  stopLoginBoot();
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

const getUserDisplayName = (user) => {
  if (!user) return "使用者";
  if (user.displayName) return user.displayName;
  if (user.isAnonymous) return "訪客";
  if (user.email) return user.email.split("@")[0] || "使用者";
  return "使用者";
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
        renderUserPanel();
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
    el.userTrigger.setAttribute("aria-label", "登入帳號");
  } else {
    const user = AppState.get("currentUser");
    const name = getUserDisplayName(user);
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
    const name = getUserDisplayName(panelUser);
    const info = document.createElement("div");
    info.className = "up-info";
    const n = document.createElement("div");
    n.className = "up-name";
    n.textContent = name;
    const e = document.createElement("div");
    e.className = "up-email";
    e.textContent = panelUser.email || (panelUser.isAnonymous ? "訪客模式" : "");
    info.appendChild(n);
    info.appendChild(e);
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "up-action";
    logoutBtn.textContent = "登出";
    logoutBtn.setAttribute("aria-label", "登出帳號");
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
    loginBtn.setAttribute("aria-label", "以 Google 印章登入");
    const dot = document.createElement("div");
    dot.className = "google-dot";
    dot.setAttribute("aria-hidden", "true");
    const txt = document.createElement("span");
    txt.textContent = "以 Google 印章登入";
    loginBtn.appendChild(dot);
    loginBtn.appendChild(txt);
    loginBtn.addEventListener("click", async () => {
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
  beginAuthAction();
  const pending = auth.signInWithPopup(provider);
  playBootChime();
  await pending; // 成功由 onAuthStateChanged 接手；錯誤往上拋給呼叫端顯示
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
      renderUserPanel();
      loadSession();
      renderHistory();
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
      renderUserPanel();
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
          await loadHistoryFromFirestore();
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
            stopLoginBoot();
            stopLoginFx();   // 此刻畫面已 display:none，context 丟失不可見
            stopLoginHud();
            stopAmbient();
          }, 700);
        };
        // warp 開始：登入鈕+HUD 漸消散（CSS .warping），不擋 LINK START 特效
        el.loginScreen?.classList.add("warping");
        setRitualStatus("正在進入禁忌書庫");
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
