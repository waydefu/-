// @ts-nocheck
// 大賢者鑑定系統 — Firebase 初始化 + Google 登入/登出（行為沿用舊 main.js，乾淨模組化）
import { FIREBASE_CONFIG, APP_CHECK_CONFIG } from "../core/config.js";
import { AppState } from "../core/state.js";

/** Firebase runtime singleton（auth + firestore）。 */
export const fb = { auth: null, db: null, ready: false, redirectError: null };

function waitForGlobal(name, timeoutMs = 9000) {
  return new Promise((resolve) => {
    const start = Date.now();
    (function poll() {
      if (window[name]) return resolve(window[name]);
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(poll, 60);
    })();
  });
}

function activateAppCheck(firebase) {
  const siteKey = APP_CHECK_CONFIG?.RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!siteKey || typeof firebase?.appCheck !== "function") return;
  try {
    if (typeof firebase.appCheck.ReCaptchaEnterpriseProvider !== "function") return;
    const appCheck = firebase.appCheck();
    appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey), true);
    AppState.set("appCheckStatus", "active");
  } catch (error) {
    console.warn("[FLG] App Check 略過：", error?.message || error);
  }
}

/**
 * 初始化 Firebase runtime（等 compat SDK 全域載入）。
 * @param {(user:object|null)=>void} onUser 認證狀態變更回呼。
 */
export async function initAuth(onUser) {
  const firebase = await waitForGlobal("firebase");
  if (!firebase?.initializeApp) {
    console.warn("[FLG] Firebase 全域未就緒");
    return fb;
  }
  try {
    if (!firebase.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
    fb.auth = firebase.auth();
    fb.db = firebase.firestore ? firebase.firestore() : null;
    fb.ready = true;
    AppState.set("fbAuth", fb.auth);
    AppState.set("db", fb.db);
    AppState.set("firebaseReady", true);
    AppState.set("firestoreReady", !!fb.db);
    activateAppCheck(firebase);
    if (typeof fb.auth.getRedirectResult === "function") {
      fb.auth.getRedirectResult().catch((error) => { fb.redirectError = error; });
    }
    fb.auth.onAuthStateChanged((user) => {
      AppState.set("currentUser", user || null);
      window.dispatchEvent(new CustomEvent("worldforge:auth-changed", { detail: { user: user || null } }));
      if (typeof onUser === "function") onUser(user || null);
    });
  } catch (error) {
    console.warn("[FLG] Firebase 初始化失敗：", error?.message || error);
  }
  return fb;
}

/** Google 登入（popup）。失敗丟出，由呼叫端處理。 */
export async function signInWithGoogle() {
  const auth = fb.auth || AppState.get("fbAuth");
  const Provider = window.firebase?.auth?.GoogleAuthProvider;
  if (!auth || !Provider) throw new Error("google-auth-unavailable");
  await auth.signInWithPopup(new Provider());
}

/** 登出。 */
export async function signOutUser() {
  const auth = fb.auth || AppState.get("fbAuth");
  if (auth) await auth.signOut();
}
