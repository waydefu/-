import assert from "node:assert/strict";

const HOSTING_URL = process.env.HOSTING_URL || "https://project-7276420283723642146.web.app";
const FUNCTION_URL = process.env.FUNCTION_URL || "https://analyzev2-yxfwrism4q-uc.a.run.app";
const QUOTA_URL = process.env.QUOTA_URL || "https://us-central1-project-7276420283723642146.cloudfunctions.net/quotaPeek";
const APP_CHECK_SITE_KEY = "6LedZPIsAAAAABlAQUZHEgY6wcohTTucKOWbTWp2";

const ok = (label) => console.log(`ok - ${label}`);

const fetchText = async (url, init) => {
  const res = await fetch(url, init);
  const text = await res.text();
  return { res, text };
};

const main = async () => {
  const home = await fetchText(HOSTING_URL);
  assert.equal(home.res.status, 200, "Hosting home should return 200");
  assert.match(home.text, /GREAT SAGE MANUSCRIPT SYSTEM/, "Home should load the Raphael inline shell");
  assert.match(home.text, /class CoreEngine/, "Home should include CoreEngine");
  assert.match(home.text, /class RuneSystem/, "Home should include RuneSystem");
  assert.match(home.text, /class ParticleSystem/, "Home should include ParticleSystem");
  assert.match(home.text, /class PostProcessingPipeline/, "Home should include PostProcessingPipeline");
  assert.match(home.text, /class LoginController/, "Home should include LoginController");
  assert.match(home.text, /class OperationalModeController/, "Home should include OperationalModeController");
  assert.match(home.text, /arcane-lens/, "Home should include the Arcane Sage lens layer");
  assert.match(home.text, /createScanBands/, "Home should include Arcane Sage scan bands");
  assert.match(home.text, /createIngestionStreams/, "Home should include manuscript ingestion streams");
  assert.match(home.text, /dataset\.runeLayers/, "Home should expose login FX metrics for browser validation");
  assert.match(home.text, /id="webgl-container"/, "Home should include the persistent WebGL container");
  assert.match(home.text, /<dialog class="ritual-stack"[^>]+id="ritualStack"/, "Home should expose the login modal as a native dialog");
  assert.match(home.text, /id="openRitualBtn"[^>]*>[\s\S]*?使用 Google 登入[\s\S]*?<\/button>/, "Home should expose the single Google login CTA");
  assert.doesNotMatch(home.text, /id="guestScribeBtn"/, "Guest login fallback should be removed");
  assert.doesNotMatch(home.text, /id="sealPanel"/, "Dead external seal panel should be removed");
  assert.doesNotMatch(home.text, /login-modal-backdrop/, "Dead login backdrop should be removed");
  assert.match(home.text, /data-op="analyze"/, "Home should include the stable operational analysis action hook");
  assert.match(home.text, /啟動手稿鑑定引擎/, "Home should include the S10.7 operational analysis action copy");
  assert.match(home.text, /app-navbar/, "Home should include the fixed operational navbar");
  assert.match(home.text, /id="historyToggle"/, "Home should include the history navbar control");
  assert.match(home.text, /id="accountToggle"/, "Home should include the account navbar control");
  assert.match(home.text, /西方奇幻小說 AI 重寫與審稿系統/, "Home should include S10.7 Worldforge editorial copy");
  assert.match(home.text, /firebase-app-check-compat/, "Home should load Firebase App Check SDK");
  ok("hosting Worldforge inline shell, Google-only modal, and App Check SDK");

  const config = await fetchText(`${HOSTING_URL}/js/core/config.js`);
  assert.equal(config.res.status, 200, "core/config.js should return 200");
  assert.match(config.text, new RegExp(APP_CHECK_SITE_KEY), "core/config.js should include App Check public site key");
  assert.match(config.text, new RegExp(FUNCTION_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "core/config.js should point to deployed function");
  assert.match(config.text, new RegExp(QUOTA_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "core/config.js should point to deployed quota endpoint");
  ok("frontend config has App Check site key and deployed function URLs");

  const parser = await fetchText(`${HOSTING_URL}/js/utils/result-sections.js`);
  assert.equal(parser.res.status, 200, "result-sections.js should return 200");
  assert.match(parser.text, /splitAnalysisSections/, "result-sections.js should expose section parser");
  ok("result parser module is deployed");

  const hudState = await fetchText(`${HOSTING_URL}/js/utils/hud-state.js`);
  assert.equal(hudState.res.status, 200, "hud-state.js should return 200");
  assert.match(hudState.text, /buildHudState/, "hud-state.js should expose real HUD state mapper");
  ok("HUD state module is deployed");

  const unauth = await fetchText(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "smoke test" }),
  });
  assert.equal(unauth.res.status, 401, "Unauthenticated function request should return 401");
  assert.deepEqual(JSON.parse(unauth.text), {
    code: "unauthorized",
    message: "請先登入後再使用。",
  });
  ok("function returns standard unauthorized error without touching Groq");

  const quotaUnauth = await fetchText(QUOTA_URL);
  assert.equal(quotaUnauth.res.status, 401, "Unauthenticated quota request should return 401");
  assert.equal(JSON.parse(quotaUnauth.text).code, "unauthorized");
  ok("quotaPeek returns standard unauthorized error without leaking quota");
};

main().catch((err) => {
  console.error(`not ok - ${err.message}`);
  process.exitCode = 1;
});
