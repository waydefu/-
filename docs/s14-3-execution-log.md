# S14-3 Execution Log - 移除 GSAP

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：有未提交 Step 4 log；既有未追蹤 `.claude/`、`output/`
- 已完成：S14-1 完成，最後 commit `0b8db67`；S14-2 完成，最後已知 commit `556388b`；`d47fcce` - 初始化 S14-3 執行 log；`fb9a60e` - 回寫 Step 0 hash；`541f40a` - 記錄 GSAP 盤點與 baseline blocker；`9e749ce` - 標記 blocker 已落地；`a235aab` - 接受替代 baseline 策略；`e60840f` - 回寫策略 hash；`28c3fd7` - 記錄替代 baseline 產物；`7acb563` - 回寫 baseline hash；`8b747b1` - 替換非 handoff GSAP tween
- 進行中：Step 4 log 回寫
- 下一步：Step 5 將主 auth handoff timeline 改為原生 rAF phase clock
- 未決 / 待我確認：無；使用者已接受「靜態截圖 + DOM 狀態取樣 + 全套測試 + 實機待驗收」
- 待裝置驗收：S14-3 會移除 GSAP 與替換 handoff 動畫；過場節奏、白光、能量感與實機 60fps 需使用者裝置驗收

## 前置狀態
- 已讀：`README.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\00-總綱-架構與共用紅線.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\03-移除GSAP.md`
- 分支：`codex/arcane-sage-core-20260522`
- 開工時工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- `docs/s14-3-execution-log.md`：開工時不存在，本步新增

## 步驟紀錄

### Step 0 - 初始化執行 log
- 狀態：完成
- 目的：建立 S14-3 的唯一恢復來源
- 修改：新增本檔與固定恢復區塊
- 風險：文件-only，無產品行為風險
- Commit：`d47fcce`

### Step 1 - GSAP 使用點盤點與 handoff 基準嘗試
- 狀態：盤點完成；動態基準受阻，暫停等確認
- 目的：在拆 GSAP 前掌握所有依賴點，並留下改前 handoff 行為對照。
- GSAP 使用點：
  - `public/index.html:28` / `public/worldforge-login.html:28`：GSAP CDN script。
  - `public/index.html:5205`：`const gsap = window.gsap`。
  - `public/index.html:7346-7347`：`pulseError()` 用 `gsap.fromTo()` 做登入錯誤 shake。
  - `public/index.html:7383-7388`：`abortOverride()` 有 GSAP presence branch，回復登入視窗 opacity/scale/filter。
  - `public/index.html:7508-7551`：`beginAuthentication()` 主 auth handoff timeline，負責 DOM collapse、WebGL driver、shockwave、boot veil、最後 `enterOperationalMode()`。
  - `public/index.html:7733-7755`：`enterOperationalMode()` 內 WebGL group tween 與 workbench deck timeline。
  - `public/index.html:7907-7934`：`triggerSmallPulse()` 用 `gsap.to()` 驅動 shock pulse。
  - `public/index.html:8073-8132`：`AnimationTimeline.start()` boot timeline，含 `gsap.set()` 初始態、boot veil、top HUD、登入 dialog 顯示。
- 前置檢查：
  - `git status --short`：tracked clean；既有未追蹤 `.claude/`、`output/`。
  - CDN 可達性：GSAP 200、Firebase 200；Three 需放寬到 60 秒可取得 200，headless 載入不穩。
- 動態基準嘗試：
  - Playwright 真頁載入後等待 `__FLG_LOGIN_CONTROLLER__`，截圖在 `Page.captureScreenshot` 超時。
  - 截圖前隱藏 WebGL canvas 仍在 `Page.captureScreenshot` 超時。
  - 截圖前暫停 `requestAnimationFrame` 的版本，等待 controller 超時。
  - Playwright video + JSON 狀態取樣版本，等待 controller 超時；產生一個不完整未採用的 `output/s14-3/before/page@*.webm`。
  - Codex in-app Browser 開 `127.0.0.1:5599` / `localhost:5599` 均被 client policy 擋下（`ERR_BLOCKED_BY_CLIENT`）；本機 server 已停止。
- 結論：
  - 目前可可靠取得的是靜態/受控 DOM 狀態，不足以作為 S14-3 中高風險 handoff 動態基準。
  - 尚未修改 `public/index.html`、`public/worldforge-login.html` 或任何產品碼。
- 待確認：
  - 是否接受改用「靜態截圖 + DOM 狀態取樣 + full test + 實機待驗收」作為 S14-3 基準後繼續。
  - 或由使用者先在裝置錄製現行 GSAP handoff baseline，再繼續拆除。

### Step 2 - 使用者接受替代基準策略
- 狀態：完成
- 決策：使用者於 2026-05-30 接受「靜態截圖 + DOM 狀態取樣 + 全套測試 + 實機待驗收」作為 S14-3 基準與驗收策略。
- 影響：可繼續拆 GSAP；但過場節奏、白光、WebGL 能量感、實機 60fps 仍明確列為待裝置驗收。
- 修改：僅更新本 log 的恢復區塊與決策紀錄。
- 風險：文件-only，無產品行為風險。
- Commit：`a235aab`

### Step 3 - 改前替代 baseline：靜態截圖與 DOM 狀態
- 狀態：完成
- 目的：依使用者接受的策略，在移除 GSAP 前留下可重現的靜態骨架與 computed state 基準。
- 產物：
  - `output/s14-3/before/static-login-1366.png`
  - `output/s14-3/before/static-workbench-1366.png`
  - `output/s14-3/before/static-history-1366.png`
  - `output/s14-3/before/static-logout-confirm-1366.png`
  - `output/s14-3/before/static-mobile-history-390.png`
  - `output/s14-3/before/static-dom-baseline.json`
- 方法：讀 `public/index.html` 後移除 `<script>`，以 Playwright 建立 login/workbench/history/logout/mobile 狀態並記錄 DOM/computed style；同 visual tests 一樣不驗 WebGL 或動畫。
- 限制：這是 S14-3 的替代基準；handoff 節奏、白光、WebGL 能量感仍列待裝置驗收。
- 修改：僅更新本 log；baseline 產物保留在未追蹤 `output/`。
- 風險：文件-only，無產品行為風險。
- Commit：`28c3fd7`

### Step 4 - 第一批產品碼搬遷：非 handoff GSAP tween
- 狀態：完成，待 log commit
- 目的：先移除非主 auth handoff 的 GSAP 依賴，保留主 timeline 與 script 到下一步，降低拆除風險。
- 修改：
  - `public/index.html`：新增 `clamp01`、`lerp`、`ease`、`runPhaseClock`、`phaseProgress` 等原生 helper。
  - `public/index.html`：`pulseError()` 改用 Web Animations API 做登入錯誤 shake。
  - `public/index.html`：`abortOverride()` 移除 GSAP branch，改用原生 animation / final style。
  - `public/index.html`：`enterOperationalMode()` 的 leyline / WebGL group tween 改用 rAF；工作台 deck 與 tool module 進場交給 CSS `contentSlideUp` 與 `body.workbench-materializing`。
  - `public/index.html`：`triggerSmallPulse()` 改用 `runPhaseClock` 驅動 shock pulse。
  - `public/index.html`：`AnimationTimeline.start()` boot 序列改用原生 rAF，保留 `forceBootComplete()` 可 kill 的 timeline 介面。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步母檔。
- 剩餘 GSAP：`script`、`const gsap = window.gsap`、主 auth handoff `gsap.timeline()`，留給 Step 5/6。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - `rg "gsap\\.(to|set|from|fromTo|timeline)\\(|\\bgsap\\b" public/index.html`：僅剩 script、`const gsap`、主 auth handoff timeline。
  - `npm run check`：通過。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
- 待裝置驗收：boot/handoff/workbench 進場手感仍需實機確認；visual test 不驗動畫/WebGL。
- Commit：`8b747b1`
