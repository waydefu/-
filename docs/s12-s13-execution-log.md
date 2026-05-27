# S12/S13 執行紀錄

更新時間：2026-05-27

## 修改前確認

- 工作分支：`codex/arcane-sage-core-20260522`
- 修改前工作樹：乾淨。
- 已讀：`README.md`、`FLG-UI-S12-LCP-CSP-quotaPeek-SR測試-終局執行單.md`、`FLG-UI-S13-玻璃revert與全特效戲劇化-執行單.md`。
- 共同紅線：不破壞 Firebase/Auth、IME、草稿、歷史、ARIA、focus-visible、skip-link、44x44 觸控、WCAG AA 對比、prefers-reduced-motion、CLS。
- S12 紅線：CSP 只做 report-only，不做 6b enforce；quotaPeek 必須驗 ID token 與 App Check；LCP 不可退步。
- S12 保留項：6b `csp-enforce` 等 report-only 觀測滿 24 小時後，由使用者另外觸發；Part 8 SR 測試由使用者真機執行。
- S13 紅線：CLS 不退步、a11y 不退步、觸控 44x44 不破、繁中文案不變。
- Source of truth：`public/index.html`；每次前端改動後需執行 `npm run sync:login-mother` 同步 `public/worldforge-login.html`。

## S12 Commit 紀錄

| Part | Commit | 狀態 | 風險/備註 |
| --- | --- | --- | --- |
| 1 | `perf(s12/preconnect)` | 已修改，待驗收 | 已補 Firebase/Three/CDN/API/font origin preconnect 與核心本地 modulepreload；不改 UI 文案。 |
| 2 | `perf(s12/script-loading)` | 已修改，待驗收 | GSAP 改為 `defer` + `crossorigin`；Firebase compat scripts 已維持 defer，不改 Auth 流程。 |
| 3 | `perf(s12/lcp)` | 已修改，待驗收 | Boot veil fail-safe 由 6000ms 降到 4200ms，登入 dialog 開啟時間由 2.4s 提前到 1.64s；不提前觸發 Auth。 |
| 4 | `perf(s12/webgl-idle)` | 已修改，待驗收 | 重型 Raphael 附加層與 stepped controller 改為 idle 初始化；核心 WebGL、登入環、粒子、bloom metadata 保留首屏可用。 |
| 5 | `perf(s12/link-start-idle)` | 已修改，待驗收 | Link Start shader 改為 proxy + idle warmup；Auth handoff 觸發時會即時建立並啟動，不預先佔用 WebGL context。 |
| 6a | `feat(s12/csp-report)` | 已修改，待驗收 | Firebase Hosting 增加 `Content-Security-Policy-Report-Only` 與安全 headers；新增 `cspReport` Function 接收報告。未加入 enforce header。 |
| 7 | `feat(s12/quota-peek)` | 已修改，待驗收 | `quotaPeek` 已補回 Functions source；成功回應前必須通過 ID token 與 App Check，並以 no-store 回傳剩餘額度。 |
| 9 | `chore(s12/validate)` | 已驗收 | `npm run check` 通過；`npm test` 通過 23 tests。6b CSP enforce 未執行，需 report-only 觀測滿 24 小時後由使用者另行觸發；SR 真機測試保留給使用者。 |

## S13 Commit 紀錄

| Part | Commit | 狀態 | 風險/備註 |
| --- | --- | --- | --- |
| 1 | `revert(s13/glass): remove floating ModalGlass` | 已修改，待驗收 | 已移除 `ModalGlass` import、實例、update loop 與模組檔；保留 native dialog/backdrop，改用 DOM surface 標記。 |
| 2 | `feat(s13/panel-anim)` | 已修改，待驗收 | 強化 panel materialize 的水平生成/垂直展開與邊框點火；只用 transform/filter/box-shadow，守住 reduced-motion。 |
| 3 | `feat(s13/btn-anim)` | 已修改，待驗收 | 按鈕 underplate 偏移加大、主板色調壓回黑金，hover/focus 增加斷片 strike；button id 與 44px 觸控尺寸未改。 |
| 4 | `feat(s13/menu-anim)` | 待執行 | 強化帳號/歷史下拉動畫，不改歷史資料。 |
| 5 | `feat(s13/notice-anim)` | 待執行 | 強化 notice 進退場與掃描。 |
| 6 | `feat(s13/list-anim)` | 待執行 | 強化歷史列表項目顯示。 |
| 7 | `feat(s13/status-anim)` | 待執行 | 強化 status 更新提示。 |
| 8 | `feat(s13/frame-sweep)` | 待執行 | 強化面板 frame sweep。 |
| 9 | `feat(s13/spell-anim)` | 待執行 | 強化 spell chip 動畫。 |
| 10 | `feat(s13/feedback)` | 待執行 | 強化成功/錯誤/確認回饋。 |
| 11 | `feat(s13/ca)` | 待執行 | 強化 chromatic aberration 觸發，不讓長時間常駐過強。 |
| 12 | `chore(s13/validate)` | 待執行 | 彙整 visual、deploy、smoke、無痕驗證結果。 |
