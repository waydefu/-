import assert from "node:assert/strict";

const HOSTING_URL = process.env.HOSTING_URL || "https://project-7276420283723642146.web.app";
const FUNCTION_URL = process.env.FUNCTION_URL || "https://analyzev2-yxfwrism4q-uc.a.run.app";
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
  assert.match(home.text, /js\/app\.js\?v=44/, "Home should load current app bundle");
  assert.match(home.text, /js\/ui\/auth\.js\?v=44/, "Home should load current auth bundle");
  assert.match(home.text, /js\/ui\/user-menu\.js/, "Home should preload account menu module");
  assert.match(home.text, /worldforge\.css\?v=15/, "Home should load current Worldforge UI layer");
  assert.match(home.text, /<body class="auth-resolving">/, "Home should gate main UI until auth resolves");
  assert.match(home.text, /emailAuthForm/, "Home should include Email\/Password auth form");
  assert.match(home.text, /EXTERNAL SEALS/, "Home should include secondary identity panel");
  assert.match(home.text, /西方奇幻小說編修核心/, "Home should include Worldforge editorial copy");
  assert.match(home.text, /firebase-app-check-compat/, "Home should load Firebase App Check SDK");
  ok("hosting home, login form, and App Check SDK");

  const config = await fetchText(`${HOSTING_URL}/js/core/config.js`);
  assert.equal(config.res.status, 200, "core/config.js should return 200");
  assert.match(config.text, new RegExp(APP_CHECK_SITE_KEY), "core/config.js should include App Check public site key");
  assert.match(config.text, new RegExp(FUNCTION_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "core/config.js should point to deployed function");
  ok("frontend config has App Check site key and function URL");

  const parser = await fetchText(`${HOSTING_URL}/js/ui/result-parser.js`);
  assert.equal(parser.res.status, 200, "result-parser.js should return 200");
  assert.match(parser.text, /splitAnalysisSections/, "result-parser.js should expose section parser");
  ok("result parser module is deployed");

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
};

main().catch((err) => {
  console.error(`not ok - ${err.message}`);
  process.exitCode = 1;
});
