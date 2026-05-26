# 全專案掃描交接報告 2026-05-26

本文件記錄 2026-05-26 針對 FLG / Worldforge 專案的全專案讀取式掃描結果。此輪只做盤點、驗證與官方資料比對，未修改程式、未部署、未關機。

## 本輪驗證結果

- `git status --short`：乾淨。
- `npm run check`：通過。
- `npm test`：通過，22 tests。
- `npm run smoke:hosting`：通過。
- `npm audit --omit=dev`：root 0 vulnerabilities。
- `npm --prefix functions audit --omit=dev`：10 個 moderate vulnerabilities。
- `npm outdated --json`：root 無 outdated。
- `npm --prefix functions outdated --json`：僅 `typescript` 有 latest 6.0.3；目前 wanted/current 5.9.3。

## P1 高優先問題

1. `quotaPeek` 是線上幽靈端點

   前端 `public/index.html` 與 `public/js/core/config.js` 會呼叫 `API_CONFIG.QUOTA_URL`，`scripts/smoke-hosting.mjs` 也驗證 `quotaPeek`。目前 hosting smoke 通過，代表線上還有這個 endpoint；但 `functions/src/index.ts` 只匯出 `analyzeV2`，repo 內沒有 `quotaPeek` source。下一次 functions deploy、清理或重建時可能讓 quota HUD 斷線。

   建議：把 `quotaPeek` source 補回 repo，包含 Auth、App Check、CORS、測試與 smoke；或明確移除前端 quota HUD 對該 endpoint 的依賴。

2. CSP / SRI / security headers 與 README 規範不一致

   `firebase.json` 目前只有 `Cross-Origin-Opener-Policy` 與 no-cache headers。正式 HTML 載入 Firebase CDN、jsDelivr、Google Fonts、Three importmap 與大量 inline module；README 又寫 CSP hash 必須同步，但實際沒有 CSP。

   建議：先加 `Content-Security-Policy-Report-Only`，穩定後轉正式 CSP；第三方 script 加 SRI 或改自託管；補 `X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。官方/一手資料：Firebase Hosting headers、OWASP CSP Cheat Sheet、MDN Subresource Integrity。

3. App Check client 已啟用，但 backend 仍未強制

   `functions/src/index.ts` 中 `ENFORCE_APP_CHECK = false`、`LOG_MISSING_APP_CHECK = false`。App Check token 有送出與驗證路徑，但未強制，濫用與成本保護仍偏弱。

   建議：先開 missing/invalid log 觀察誤殺；再對 `analyzeV2` 與 `quotaPeek` 強制驗證；高敏感端點再評估 replay protection。官方資料：Firebase App Check custom backend token verification。

4. Functions production dependency audit 有 10 個 moderate

   `npm --prefix functions audit --omit=dev` 回報 `qs`、`uuid` 經 Firebase Admin / Functions 依賴鏈帶入。`npm audit fix --force` 會建議破壞性路徑，不應直接硬套。

   建議：開安全升級分支，更新 `firebase-admin` / `firebase-functions` lock，跑 `npm run check`、`npm test`、`npm run test:rules`、hosting smoke，再部署 functions。

## P2 中優先問題

1. README source of truth 已漂移

   README 仍寫舊 CTA「啟動奧術解析引擎」、舊 DOM id、Three `0.160.0`。實際程式為 `啟動手稿鑑定引擎`、`ritualStack/openRitualBtn`、Three `0.164.1`。這會讓下一輪超出上下文時照錯規格執行。

   建議：先更新 README 的現況、紅線、部署與驗收流程，再做下一波 UI。

2. `public/index.html` 與 `public/worldforge-login.html` 各 6882 行

   巨型 inline HTML/CSS/JS 讓 review、CSP hash、測試定位與長期維護成本都偏高。

   建議：分階段拆 CSS、runtime module、WebGL module；保留 `sync:login-mother`、smoke 契約與既有 DOM id，不一次大拆。

3. 視覺測試偏靜態 baseline

   `tests/visual/helpers.ts` 會移除 script 並隱藏 WebGL，適合穩定版面快照，但不能證明實際動畫、音效、WebGL、OAuth handoff 都正常。

   建議：保留 deterministic baseline，另加 runtime Playwright smoke：本機與 hosting 各截圖、canvas 非空像素、dialog 位置、reduced-motion、mobile。

4. CLS / a11y / reflow 覆蓋還能更硬

   現有 200%/400%、CLS、axe 已有基本線，但 CLS 是 script-stripped 狀態；axe 只擋 critical/serious。

   建議：加 live boot CLS、account menu、keyboard tab order、actual deployed smoke；AA 對比與 reflow 用明確 allowlist 管理。

5. 動畫效能可再上限

   目前動效品質高，但存在 blur/filter/box-shadow/WebGL 長循環；缺少 visibility pause 與完整 WebGL teardown。

   建議：動畫核心盡量維持 transform/opacity，昂貴效果限時限域；加 `visibilitychange` 暫停低價值 loop；集中 dispose WebGL resources。

## P3 清理與品質優化

- 根目錄有未被引用的 `6c489817-73eb-42b3-bd30-2b96150be0ec.jpeg`，大小約 148 KB，需確認是否為臨時素材。
- `artifacts/` 與歷史 screenshots 持續增加，建議制定 artifacts 保留策略。
- `smoke:hosting` 目前以 HTML regex 為主，建議補一支真正瀏覽器層的 deployed smoke。

## 官方參考來源

- Firebase Hosting custom headers: https://firebase.google.com/docs/hosting/full-config
- Firebase App Check custom backend verification: https://firebase.google.com/docs/app-check/custom-resource-backend
- OWASP Content Security Policy Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- MDN Subresource Integrity: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity
- npm audit reports: https://docs.npmjs.com/about-audit-reports/
- Playwright webServer: https://playwright.dev/docs/test-webserver
- web.dev CLS: https://web.dev/articles/optimize-cls
- web.dev animation performance: https://web.dev/articles/animations-guide
- MDN Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- Three.js dispose guide: https://threejs.org/manual/en/how-to-dispose-of-objects.html
- W3C WCAG Reflow: https://www.w3.org/WAI/WCAG21/Understanding/reflow
- W3C WCAG Contrast Minimum: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
- W3C WCAG Target Size: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

## 建議下一步順序

1. 補回或移除 `quotaPeek`，讓 repo 可完整重建後端。
2. 更新 README，解除 source of truth 漂移。
3. 建安全分支處理 CSP/SRI/security headers、App Check enforcement、Functions audit。
4. 補 live runtime visual / hosting screenshot / WebGL canvas / animation performance tests。
5. 清理未引用 asset 與 artifacts 保留策略。

## 紅線提醒

- 不可動 Firebase / Auth / 草稿 / 歷史，除非該步明確處理 `quotaPeek` 或 App Check 且有測試。
- 不可拿掉既有 ARIA、focus-visible、skip-link、native dialog 結構。
- 保持 44x44 觸控目標、WCAG 2.1 AA 對比、200% zoom、reflow、prefers-reduced-motion。
- 繁中介面文字若要調整，必須先確認目的與影響，並更新紀錄。

## 本次文件化改動

- 新增此交接文件：`docs/project-scan-handoff-2026-05-26.md`。
- 未修改程式碼、未修改測試、未部署。
