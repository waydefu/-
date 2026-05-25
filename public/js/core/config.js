// @ts-check

/** Firebase web app configuration used by the compat SDK. */
export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyD25twFlBQLGRH6sN0pE2HfrwxqtZz3_n4",
  // 同源 .web.app（first-party）：根治 Chrome/手機第三方儲存分割造成的
  // 登出後/手機一直跳回登入頁。前置已於 2026-05-19 由使用者完成：
  // Google Cloud OAuth client 加 .web.app JS origins + /__/auth/handler
  // redirect URI；Firebase Auth 授權網域含 .web.app。CSP frame-src 已含
  // 'self'（同源 __/auth iframe）。若仍 auth/unauthorized-domain 再查 Console。
  authDomain:        "project-7276420283723642146.web.app",
  databaseURL:       "https://project-7276420283723642146-default-rtdb.firebaseio.com",
  projectId:         "project-7276420283723642146",
  storageBucket:     "project-7276420283723642146.firebasestorage.app",
  messagingSenderId: "65341047777",
  appId:             "1:65341047777:web:0799d8039d9869144948a0",
  measurementId:     "G-9YZ5B0DNBK",
};

/** Firebase App Check is staged: blank site key keeps it disabled. */
export const APP_CHECK_CONFIG = {
  RECAPTCHA_ENTERPRISE_SITE_KEY: "6LedZPIsAAAAABlAQUZHEgY6wcohTTucKOWbTWp2",
};

/**
 * API endpoint and network timeout settings.
 *
 * FUNCTIONS_URL: the deployed analyzeV2 trigger URL (Cloud Run / Gen-2).
 *   If you redeploy and the URL changes, update this and `connect-src`
 *   in index.html, then redeploy hosting.
 */
export const API_CONFIG = {
  FUNCTIONS_URL:       "https://analyzev2-yxfwrism4q-uc.a.run.app",
  QUOTA_URL:           "https://us-central1-project-7276420283723642146.cloudfunctions.net/quotaPeek",
  FETCH_TIMEOUT_MS:    180000,
  FIRESTORE_TIMEOUT_MS: 5000,
};

/** User-input, persistence, and history size limits. */
export const LIMITS = {
  MAX_INPUT_CHARS:  1800,   // 單段審查上限（集大成 vFinal：單段深度審查、不分塊）
  MAX_DRAFT_STORE:  8192,
  MAX_RESULT_CHARS: 81920,
  MAX_HISTORY:      30,
};

/** Browser storage keys and UI throttling settings. */
export const UI_CONFIG = {
  STORAGE_KEY:       "flg_history_v2",
  DRAFT_KEY:         "flg_draft_v1",
  DRAFT_DEBOUNCE_MS: 3000,
  RATE_LIMIT_MAX:    5,
  RATE_LIMIT_WINDOW_MS: 60000,
  CACHE_MAX_ENTRIES: 20,
};

/** Default analyze button label. */
export const BTN_DEFAULT = "開啟法典審閱";
/** Analyze button label while a request is active. */
export const BTN_LOADING = "法典審閱中…";

/** Localized UI copy used by the front-end runtime. */
export const MSG = {
  SYNC_LOADING:   "載入草稿記憶",
  SYNC_SAVING:    "同步草稿記憶",
  SYNC_OK:        "草稿記憶已同步",
  SYNC_ERR:       "離線模式",
  SYNC_SAVE_ERR:  "草稿記憶儲存失敗",
  OFFLINE_TOAST:  "雲端資料載入失敗，顯示本機暫存紀錄。",
  SAVE_ERR_TOAST: "雲端儲存失敗（{code}），本機紀錄仍保留。",
  TIMEOUT:        "請求逾時（超過 180 秒），請稍後再試。",
  FETCH_FAIL:     "無法連線至分析服務，請確認網路後重試。",
  NO_FIREBASE:    "驗證服務尚未就緒，請稍後再試。",
  POPUP_CLOSED:   "auth/popup-closed-by-user",
  RATE_LIMIT:     "分析請求過於頻繁，請 {sec} 秒後再試。",
  QUOTA_EXCEEDED: "今日使用次數已達上限，請明日再試。",
  CACHE_HIT:      "已從草稿記憶載入相同文本的分析結果。",
};
