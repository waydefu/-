# Codex S9/S10 執行紀錄

本檔用於保存本輪工作上下文，避免長任務或上下文壓縮後遺失順序、紅線、改動與驗收結果。

## 固定順序

1. 先執行 `C:\Users\wayde.fu\OneDrive\桌面\FLG-UI-S9-S1S4補強-codex執行單.txt`。
2. S9 完成後跑驗收，必要時更新 visual snapshots，然後 commit 並回報。
3. 暫停並不執行任何舊的「黑金 SAO 系統 UI 實作計劃」Part。
4. 改執行 `C:\Users\wayde.fu\OneDrive\桌面\FLG-UI-S10-黑金SAO系統UI-接管版-執行單.txt`。
5. S10 依接管版 11 個 Part 拆 11 個 commit；每個 Part 記錄 commit hash、風險與截圖。

## 紅線

- 不可動 Firebase / Auth / 草稿 / 歷史 schema。
- 不可動 `functions/src/*` 後端。
- 不可拿掉現有 ARIA / role / focus-visible / skip-link。
- WCAG 1.4.4 Resize Text 200% 與 WCAG 1.4.10 Reflow 必須可用。
- 繁中介面文字不動。
- 不執行已被推翻的舊 codex 計劃：三欄 modal、固定 px 字級、100% 手動同步 worldforge。

## 目前確認

- 已讀 `README.md`；它是專案唯一共用 source of truth。
- 已讀 S9 與 S10 桌面執行單。
- 目前分支：`codex/arcane-sage-core-20260522`。
- 目前基線：`d2bed37 Restore Great Sage online baseline`。
- 開始前 `git status --short --branch` 只顯示分支，無既有未提交改動。

## 變更前確認紀錄

### S9 預計改動

- `public/index.html`：收掉 S9 指定 8 組裝飾性 cyan，保留 status accent cyan。
- `package.json` / `package-lock.json`：新增 a11y / visual 測試所需 dev dependencies 與 scripts。
- `tests/visual/a11y.spec.ts`：新增 axe-playwright baseline。
- `README.md`：補 Accessibility baseline、對比表與 keyboard walkthrough 結果。
- 本檔：記錄每次改動與驗收結果。

### S10 預計改動

- 只在 S9 commit 後開始。
- 依接管版拆成 11 個 commit；Part B 字級改動後必須更新 snapshots 並逐張 review。

## 進度

- [x] 讀 README 與兩份桌面執行單
- [x] 建立本輪 MD 執行紀錄
- [x] S9 Part A 色票收尾
- [x] S9 Part B a11y 自動化與文件
- [ ] S9 驗收與 commit
- [ ] S10 11 個 Part

## S9 已執行紀錄

### Part A 色票收尾

- 檢查 `public/index.html` 與 `public/worldforge-login.html` 目前完全一致。
- 指定 8 組裝飾性 cyan 在目前基線已經是 gold / amber / deep blue。
- `rgba(0, 212, 255, ...)` 剩 5 處：3 個 token + 2 個 sync/status accent。
- `rgba(110, 231, 255, ...)` 剩 3 處：2 個 token + 1 個 sync/status accent。
- 未改動 Firebase / Auth / 草稿 / 歷史。

### Part B a11y / visual baseline

- 新增 dev dependencies：`@playwright/test`、`@axe-core/playwright`、`@axe-core/cli`。
- 新增 scripts：`test:a11y`、`test:visual`。
- 新增 `scripts/serve-public.mjs` 與 `playwright.config.ts`。
- 新增 `tests/visual/a11y.spec.ts`、`tests/visual/worldforge.spec.ts`、`tests/visual/helpers.ts`。
- 建立 visual snapshots：登入 1366、登入 390、工作區 1366、歷史抽屜 1366、帳號選單 1366。
- a11y：三狀態 axe critical / serious = 0；唯一 moderate 是 `meta-viewport`，留給 S10 Part A。
- 對比掃描：`seal-strip` 由 `rgba(214,166,77,0.62)` 提升到 `0.78`，10 項皆達 4.5:1。
- Keyboard walkthrough：發現 hidden button 可被 author CSS 覆蓋，新增全域 `[hidden] { display: none !important; }`，同步 `index.html` / `worldforge-login.html`。
- `.gitignore` 新增 `test-results/` 與 `playwright-report/`。
- README 新增 Accessibility baseline、Contrast baseline、Keyboard walkthrough。

### S9 驗收目前結果

- `npm.cmd run test:a11y`：通過。
- `npm.cmd run test:visual -- --update-snapshots`：通過並建立 5 張 snapshot。
- `npm.cmd run test:visual`：通過。
- `git diff --check`：通過。
- `npm.cmd run check:frontend`：通過。為避免新 dev dependency 的 `@types/node` 隱式拉入 `string_decoder` JS，已在 `jsconfig.json` 加 `"types": []`。
- `npm.cmd run check:functions`：通過。
- `npm.cmd test`：通過，22 tests passed。
- `npm.cmd run build`：通過。
- S9 commit：`3a46953 test(s9): add a11y and visual baselines`。
- S9 Hosting deploy：通過，Hosting URL `https://project-7276420283723642146.web.app`。
- S9 production smoke：`npm.cmd run smoke:hosting` 通過。

## S10 接管版執行紀錄

### 舊計劃暫停確認

- 不執行舊 codex「黑金 SAO 系統 UI 實作計劃」任何 Part。
- 已推翻且不得採用：三欄 modal、固定 px 字級、手動 100% 同步 worldforge。

### Part A 變更前確認

- 預計改動：`public/index.html` 與 `public/worldforge-login.html` viewport meta。
- 目標：移除 `maximum-scale=1.0`，加入 `viewport-fit=cover`。
- 風險：Low；iOS 可捏拉縮放，符合 WCAG 1.4.4。

### Part A 完成紀錄

- 已同步更新 `public/index.html` / `public/worldforge-login.html`。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`，`meta-viewport` moderate 已消失。
- `git diff --check`：通過。

### Part B 變更前確認

- 預計改動：`public/index.html` 與 `public/worldforge-login.html` 的 `:root` font-size 與 `--text-*` tokens。
- 目標：改成 rem-based fluid type scale，支援 browser zoom 與使用者預設字級。
- 風險：High；會重排視覺 baseline，必須 `test:visual -- --update-snapshots` 後逐張 review。

### Part B 完成紀錄

- 已將 `--text-*` tokens 改為 rem-based clamp，並加上 `:root font-size` fluid base。
- 額外修正舊可見 `font-size: clamp(...px...)`，避免局部 px clamp 壓住 browser zoom；`rg` 檢查已無 `font-size` px clamp。
- 200% zoom 抽查：`#authTitle` computed font-size 49.6px。
- 400% zoom 抽查：`documentElement.scrollWidth === clientWidth`，無水平捲動。
- `npm.cmd run test:visual -- --update-snapshots`：通過並更新 snapshots；已逐張 review。
- `npm.cmd run test:visual`：通過。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
- `git diff --check`：通過。

### Part C 變更前確認

- 預計改動：登入 modal 外層由 `div.ritual-stack` 改為 native `<dialog>`，以 `showModal()` / `close()` 控制。
- 本 Part 保留 Google-only CTA 與既有 hidden fallback DOM；dead fields / seal panel 留到 Part K 清理，避免混入 modal 語意改造。
- 同步更新 smoke 與 visual helper 的 dialog 判斷。
- 風險：Med；需驗證 axe、visual 與 hosting smoke。

### Part C 完成紀錄

- `ritualStack` 已改為 native `<dialog>`，`authPanel` 不再帶自寫 `role="dialog"` / `aria-modal`。
- boot timeline 與 force fallback 改用 `showModal()` / `open` fallback；進入工作區時呼叫 `close()`。
- 登入 dialog 的 `cancel` 事件會 `preventDefault()`，避免 Google-only 唯一入口被 ESC 關掉。
- `scripts/smoke-hosting.mjs` 改檢查 `<dialog class="ritual-stack" id="ritualStack">`。
- `tests/visual/helpers.ts` 改用 `showModal()` 開啟 static baseline dialog，進工作區前關閉 dialog。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
- `npm.cmd run test:visual -- --update-snapshots`：通過並更新登入 snapshots；已 review。
- `npm.cmd run test:visual`：通過。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。

### Part D/E 變更前確認

- 預計改動：`AnimationTimeline.start()` boot 時序與 boot veil hide timing。
- 目標：未登入首次 boot 約 3.5s 可操作；reduced-motion 快速完成；safety timer 6s。
- Part E 包含在 Part D：`#bootVeil` 於 2.6s `display:none`。
- 風險：Med；需驗證前端檢查與視覺 baseline。

### Part D/E 完成紀錄

- 已同步更新 `public/index.html` / `public/worldforge-login.html`。
- boot safety timer 由 11s 改為 6s。
- boot sequence 與 HUD 顯示時序縮短；login dialog 約 2.4s 開啟。
- `#bootVeil` 於 2.6s `display:none`。
- 移除 boot timeline 內已退役 `.login-modal-backdrop` tween，dead CSS / DOM 清理由 Part K 處理。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
- `npm.cmd run test:visual`：通過，5 張 snapshot 無 drift。

### Part F 變更前確認

- 預計改動：`public/index.html` / `public/worldforge-login.html` inline `RuneSystem`。
- 目標：登入階段維持 1.0 速度，Operational Mode 自動降至 0.42 速度；OAuth 暫時降速仍保留為手動倍率。
- 風險：Low；不改 `public/js/webgl/*.js` 核心著色器，不碰 Firebase / Auth / 草稿 / 歷史。

### Part F 完成紀錄

- `RuneSystem` 新增 `operationalSpeedScale`，`setOperational(value)` 會將 operational 狀態映射為 `1 -> 0.42`。
- ring rotation 移除 operational 額外加速項，改為 `speedScale * operationalSpeedScale * shockBoost`。
- `enterOperationalMode()` 將手動 `speedScale` 重設為 1，由 `setOperational(1)` 接管常態降速。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。
- `npm.cmd run test:visual`：通過，5 張 snapshot 無 drift。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。

### Part G 變更前確認

- 預計改動：`auth-panel` 內新增裝飾性 `frame-sweep`，並新增對應 CSS / keyframes。
- 目標：登入 modal 邊框加入 SAO 式金色 sweep，僅 `aria-hidden` 裝飾，不改繁中文案與登入流程。
- 風險：Low；`@property` 舊瀏覽器不支援時只會讓 sweep 靜止，modal 仍可用。

### Part G 完成紀錄

- 已在登入 `auth-panel` 新增 `frame-sweep` 裝飾層，`aria-hidden="true"`。
- 新增 `@property --sweep-angle`、`frameSweep`、`frameSweepFade` 與 reduced-motion 停動畫規則。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。
- `npm.cmd run test:visual -- --update-snapshots`：通過，已更新並 review 5 張 snapshots。
- `npm.cmd run test:visual`：通過。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
- 視覺 review：登入桌機 / 390px 手機 / 工作區 / 歷史抽屜 / 帳號選單均無文字遮擋或水平外溢。

### Part H 變更前確認

- 預計改動：inline style 末端新增 `prefers-contrast: more` 與 `prefers-color-scheme: light` fallback。
- 目標：高對比偏好下提高文字與框線清晰度；產品仍固定 dark scheme。
- 風險：Low；只加 media query，不改預設 UI 與繁中文案。

### Part H 完成紀錄

- 已新增 `prefers-contrast: more` 色票、HUD / help / corner label 文字提亮與 panel 邊線提亮。
- 已新增 `prefers-color-scheme: light` 下維持 `color-scheme: dark`。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
- `npm.cmd run test:visual`：通過，5 張 snapshot 無 drift。

### Part I 變更前確認

- 預計改動：inline module 末端新增 Core Web Vitals observer。
- 目標：在 `window.__FLG_CLS__`、`window.__FLG_LCP__`、`window.__FLG_INP__` 暴露驗收數值。
- 風險：Low；只讀 PerformanceObserver，不送網路、不碰資料契約。

### Part I 完成紀錄

- 已新增 `PerformanceObserver` 監測 CLS / LCP / INP，並暴露 `window.__FLG_CLS__`、`window.__FLG_LCP__`、`window.__FLG_INP__`、`window.__FLG_VITALS_READY__`。
- observer 不送網路；不支援時只 `console.debug`，不阻斷頁面。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。
- `npm.cmd run test:visual`：通過，5 張 snapshot 無 drift。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
- 真頁面 vitals 數值待 Part L / 完整 browser 驗收讀取。

### Part J 變更前確認

- 已確認 `public/index.html` 與 `public/worldforge-login.html` 目前內容一致。
- 預計改動：新增 `scripts/sync-worldforge-login.mjs`，`package.json` 加 `sync:login-mother` 與 `prebuild`；README 更新同步規則。
- 目標：取代手動 100% 同步要求，改由 build 前自動同步。
- 風險：Low；第一次跑前已確認兩份一致，不碰 Firebase / Auth / 草稿 / 歷史。

### Part J 完成紀錄

- 新增 `scripts/sync-worldforge-login.mjs`，會從 `public/index.html` 覆寫 `public/worldforge-login.html`。
- `package.json` 新增 `sync:login-mother` 與 `prebuild`，`npm.cmd run build` 會先同步 worldforge。
- README 新增 S10 Black Gold SAO UI 規則，並將 worldforge 同步政策改為 script / prebuild。
- `npm.cmd run sync:login-mother`：通過。
- 同步後 `public/index.html` 與 `public/worldforge-login.html` 內容一致。
- `git diff --check`：通過。
- `npm.cmd run check:frontend`：通過。
- `npm.cmd run build`：通過，prebuild 已實際執行同步。

### Part K 變更前確認

- 預計改動：只先改 `public/index.html`，完成後用 `npm.cmd run sync:login-mother` 生成 `public/worldforge-login.html`。
- 清理目標：hidden email/password/name fields、seal-panel、redirect fallback、guest / other login dead DOM、退役 `.login-modal-backdrop` CSS / JS refs，以及對應不可達 JS 分支。
- 保留目標：Google-only sign-in、native dialog、ARIA / focus-visible / skip-link、草稿 / 歷史 / Firebase schema。
- 風險：Med；需跑 `rg` 殘留檢查、frontend check、visual、a11y。

### Part K 完成紀錄

- 已刪除 Google-only 模式下不可達的 hidden email/password/name fields、seal-panel、redirect fallback、guest / other login DOM。
- 已刪除退役 `.login-modal-backdrop` CSS / JS refs 與對應 mobile keyframes。
- `LoginController` 已收斂為 Google-only 可達流程；舊 Email / guest / register 分支改為不存在，不碰 Firebase Auth 的 Google popup 與既有 auth callback。
- `tests/visual/helpers.ts` 已移除 dead backdrop / sealPanel selector。
- `npm.cmd run sync:login-mother`：通過，`public/index.html` 與 `public/worldforge-login.html` 一致。
- `rg` dead-code 檢查：指定 dead selectors / branches 在 `public/index.html`、`public/worldforge-login.html`、`tests/visual/helpers.ts` 皆無殘留。
- `npm.cmd run check:frontend`：通過。
- `git diff --check`：通過。
- `npm.cmd run test:visual`：通過，5 張 snapshot 無 drift。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`。
