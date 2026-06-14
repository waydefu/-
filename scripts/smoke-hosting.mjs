import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";

const HOSTING_URL = process.env.HOSTING_URL || "https://project-7276420283723642146.web.app";
const FUNCTION_URL = process.env.FUNCTION_URL || "https://analyzev2-yxfwrism4q-uc.a.run.app";
const QUOTA_URL = process.env.QUOTA_URL || "https://us-central1-project-7276420283723642146.cloudfunctions.net/quotaPeek";
const APP_CHECK_SITE_KEY = "6LedZPIsAAAAABlAQUZHEgY6wcohTTucKOWbTWp2";
const FETCH_TIMEOUT_MS = Number(process.env.SMOKE_FETCH_TIMEOUT_MS || 15_000);
const SKIP_REMOTE = process.env.SMOKE_SKIP_REMOTE === "1";
const LOCAL_PUBLIC_DIR = process.env.SMOKE_LOCAL_PUBLIC_DIR ? resolve(process.env.SMOKE_LOCAL_PUBLIC_DIR) : "";

const ok = (label) => console.log(`ok - ${label}`);

const localPublicPath = (url) => {
  if (!LOCAL_PUBLIC_DIR) return "";
  const target = new URL(url);
  if (target.origin !== new URL(HOSTING_URL).origin) return "";
  const decoded = decodeURIComponent(target.pathname || "/");
  const normalized = normalize(decoded).replace(/^([/\\])+/, "");
  const candidate = resolve(join(LOCAL_PUBLIC_DIR, normalized));
  if (!candidate.startsWith(LOCAL_PUBLIC_DIR + sep) && candidate !== LOCAL_PUBLIC_DIR) return "";
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(LOCAL_PUBLIC_DIR, "index.html");
};

const fetchText = async (url, init = {}) => {
  const filePath = localPublicPath(url);
  if (filePath) {
    if (!existsSync(filePath)) return { res: { status: 404 }, text: "" };
    return { res: { status: 200 }, text: await readFile(filePath, "utf8") };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: init.signal || controller.signal });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(timeout);
  }
};

const main = async () => {
  const smokeId = Date.now();
  const home = await fetchText(`${HOSTING_URL}/?smoke=${smokeId}`, {
    headers: { "cache-control": "no-cache", "pragma": "no-cache" },
  });
  assert.equal(home.res.status, 200, "Hosting home should return 200");
  assert.match(home.text, /大賢者鑑定系統/, "Home should load the Great Sage app shell");
  assert.match(home.text, /\/js\/main\.js/, "Home should load the operational runtime bundle");
  assert.match(home.text, /id="authScreen"/, "Home should expose the current login screen");
  assert.match(home.text, /id="googleLoginBtn"[^>]*>[\s\S]*?使用 Google 登入[\s\S]*?<\/button>/, "Home should expose the single Google login CTA");
  assert.match(home.text, /id="bgStage"/, "Home should include the current cinematic background stage");
  assert.match(home.text, /id="sageCanvas"/, "Home should include the progressive WebGL canvas");
  assert.match(home.text, /data-op="analyze"/, "Home should include the stable operational analysis action hook");
  assert.match(home.text, /啟動鑑定/, "Home should include the current analysis action copy");
  assert.match(home.text, /class="app-header"/, "Home should include the current app header");
  assert.match(home.text, /id="historyToggleBtn"/, "Home should include the history navbar control");
  assert.match(home.text, /id="logoutBtn"/, "Home should include the logout navbar control");
  assert.match(home.text, /西方奇幻小說 AI 編修系統/, "Home should include the current editorial copy");
  assert.match(home.text, /firebase-app-check-compat/, "Home should load Firebase App Check SDK");
  ok("hosting Great Sage app shell, Google-only login, and App Check SDK");

  const mainBundle = await fetchText(`${HOSTING_URL}/js/main.js?smoke=${smokeId}`, {
    headers: { "cache-control": "no-cache", "pragma": "no-cache" },
  });
  assert.equal(mainBundle.res.status, 200, "js/main.js should return 200");
  assert.match(mainBundle.text, /function renderResult/, "main.js should include the result renderer");
  assert.match(mainBundle.text, /function runAnalysis/, "main.js should include the analysis workflow");
  assert.match(mainBundle.text, /googleLoginBtn/, "main.js should wire the current Google login button");
  assert.match(mainBundle.text, /historyToggleBtn/, "main.js should wire the current history control");
  assert.match(mainBundle.text, /logoutBtn/, "main.js should wire the current logout control");
  assert.match(mainBundle.text, /openLogoutModal/, "main.js should open the current logout modal");
  assert.match(mainBundle.text, /worldforge:auth-changed/, "main.js should react to auth state changes");
  ok("main runtime bundle exposes the current app workflow");

  const config = await fetchText(`${HOSTING_URL}/js/core/config.js`);
  assert.equal(config.res.status, 200, "core/config.js should return 200");
  assert.match(config.text, new RegExp(APP_CHECK_SITE_KEY), "core/config.js should include App Check public site key");
  assert.match(config.text, new RegExp(FUNCTION_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "core/config.js should point to deployed function");
  assert.match(config.text, new RegExp(QUOTA_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "core/config.js should point to deployed quota endpoint");
  ok("frontend config has App Check site key and deployed function URLs");

  const parser = await fetchText(`${HOSTING_URL}/js/utils/result-sections.js`);
  assert.equal(parser.res.status, 200, "result-sections.js should return 200");
  assert.match(parser.text, /splitAnalysisSections/, "result-sections.js should expose section parser");
  assert.match(parser.text, /sectionsToPlainText/, "result-sections.js should expose plain-text serialization");
  ok("result parser module is deployed");

  const effects = await fetchText(`${HOSTING_URL}/js/effects/effects-manager.js`);
  assert.equal(effects.res.status, 200, "effects-manager.js should return 200");
  assert.match(effects.text, /sageCanvas/, "effects manager should target the current WebGL canvas");
  assert.match(effects.text, /GreatSageCore/, "effects manager should lazy-load the current WebGL core");
  ok("current effects manager module is deployed");

  if (SKIP_REMOTE) {
    ok("remote function checks skipped");
  } else {
    const unauth = await fetchText(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "smoke test" }),
    });
    assert.equal(unauth.res.status, 401, "Unauthenticated function request should return 401");
    assert.deepEqual(JSON.parse(unauth.text), {
      code: "app-check-failed",
      message: "App Check 驗證失敗，請重新整理後再試。",
    });
    ok("analyzeV2 enforces App Check before Auth/Groq (no token → app-check-failed)");

    const quotaUnauth = await fetchText(QUOTA_URL);
    assert.equal(quotaUnauth.res.status, 401, "Unauthenticated quota request should return 401");
    assert.equal(JSON.parse(quotaUnauth.text).code, "unauthorized");
    ok("quotaPeek returns standard unauthorized error without leaking quota");
  }
};

main().catch((err) => {
  console.error(`not ok - ${err.message}`);
  process.exitCode = 1;
});
