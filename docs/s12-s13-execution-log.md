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
| 2 | `perf(s12/script-loading)` | 待執行 | 預計延後非關鍵 script，同時確保 Firebase/GSAP 初始化仍可等待。 |
| 3 | `perf(s12/lcp)` | 待執行 | 預計縮短登入殼層首屏可見時間，不提前動 Auth。 |
| 4 | `perf(s12/webgl-idle)` | 待執行 | 預計將重型附加 WebGL 層延後到 idle，保留核心 WebGL 首屏。 |
| 5 | `perf(s12/link-start-idle)` | 待執行 | 預計 Link Start shader lazy/idle 初始化，觸發時仍可同步啟動。 |
| 6a | `feat(s12/csp-report)` | 待執行 | 僅 report-only，絕不 enforce。 |
| 7 | `feat(s12/quota-peek)` | 待執行 | 必須同時驗 ID token 與 App Check。 |
| 9 | `chore(s12/validate)` | 待執行 | 彙整驗收與跳過項。 |

## S13 Commit 紀錄

| Part | Commit | 狀態 | 風險/備註 |
| --- | --- | --- | --- |
| 1 | `revert(s13/glass): remove floating ModalGlass` | 待執行 | 移除 S11 浮動玻璃背板，不動 native dialog 結構。 |
| 2 | `feat(s13/panel-anim)` | 待執行 | 強化 panel materialize，需守住 reduced-motion。 |
| 3 | `feat(s13/btn-anim)` | 待執行 | 強化按鈕 underplate/glitch，不改 button id。 |
| 4 | `feat(s13/menu-anim)` | 待執行 | 強化帳號/歷史下拉動畫，不改歷史資料。 |
| 5 | `feat(s13/notice-anim)` | 待執行 | 強化 notice 進退場與掃描。 |
| 6 | `feat(s13/list-anim)` | 待執行 | 強化歷史列表項目顯示。 |
| 7 | `feat(s13/status-anim)` | 待執行 | 強化 status 更新提示。 |
| 8 | `feat(s13/frame-sweep)` | 待執行 | 強化面板 frame sweep。 |
| 9 | `feat(s13/spell-anim)` | 待執行 | 強化 spell chip 動畫。 |
| 10 | `feat(s13/feedback)` | 待執行 | 強化成功/錯誤/確認回饋。 |
| 11 | `feat(s13/ca)` | 待執行 | 強化 chromatic aberration 觸發，不讓長時間常駐過強。 |
| 12 | `chore(s13/validate)` | 待執行 | 彙整 visual、deploy、smoke、無痕驗證結果。 |
