# S14-2 Execution Log - 拆除 DOM 假特效層

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：有未提交（本 log 回寫 Part B 第二輪 hash；既有未追蹤 `.claude/`、`output/`）
- 已完成：S14-1 完成，最後 commit `0b8db67` - mark ticket complete；`03e5822` - 初始化 S14-2 執行 log；`6931b3c` - 記錄 Step 0 commit hash；`83e6f34` - 記錄 S14-2 修改前 baseline；`41c5c56` - 拔掉按鈕三疊字 DOM 假特效層；`664dfaa` - 回寫 Part A hash；`8f553a5` - 標記 Part A log 已落地；`5645052` - 移除未引用與 idle loop keyframes；`02756b0` - 回寫 Part B 第一輪 hash；`013c5b7` - 標記 Part B 第一輪 log 已落地；`cd14a8b` - 合併入口/回饋 keyframes 到 26 個
- 進行中：無
- 下一步：Step 5 Part C glass/backdrop-filter 收斂
- 未決 / 待我確認：無
- 待裝置驗收：本單會移除 DOM 動效與收斂 keyframes，動效手感與 60fps 需使用者裝置驗收

## 前置狀態
- 已讀：`README.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\00-總綱-架構與共用紅線.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\02-拆除DOM假特效層.md`
- 分支：`codex/arcane-sage-core-20260522`
- 開工時工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- `docs/s14-2-execution-log.md`：開工時不存在，本步新增

## 步驟紀錄

### Step 0 - 初始化執行 log
- 狀態：完成
- 目的：建立 S14-2 的唯一恢復來源
- 修改：新增本檔與固定恢復區塊
- 風險：文件-only，無產品行為風險
- Commit：`03e5822`

### Step 1 - 修改前基準截圖與 keyframes 計數
- 狀態：完成
- keyframes 基準：
  - `rg -n "@keyframes" public/index.html`：93
  - `rg -n "@keyframes [a-zA-Z]" public/index.html`：93
- 修改前截圖：
  - `output/s14-2/before/login-1366.png`
  - `output/s14-2/before/login-390.png`
  - `output/s14-2/before/workbench-1366.png`
  - `output/s14-2/before/workbench-390.png`
  - `output/s14-2/before/history-drawer-1366.png`
  - `output/s14-2/before/account-menu-1366.png`
  - `output/s14-2/before/logout-confirm-1366.png`
  - `output/s14-2/before/mobile-logout-confirm.png`
- 來源：S14-1 後已通過的 visual snapshots 與 S14-1 headless 彈窗產物；僅作本地 baseline，不納入 git
- 工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- Commit：`83e6f34`

### Step 2 - Part A 拔掉按鈕三疊字假特效層
- 狀態：完成
- 目的：移除 `.sao-btn` 的 DOM 重複文字層，讓按鈕只保留真實 label、掃描層與 tag，不再用 `.sao-btn-glitch` / `.sao-btn-rgb` 疊出假 glitch。
- 修改：
  - `public/index.html`：刪除 `.sao-btn-glitch` / `.sao-btn-rgb` CSS、`.is-glitching` selector、相關 rgb/glitch keyframes 與 hydration 產生 span 的 JS。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步母檔。
  - `tests/visual/helpers.ts`：同步移除 visual helper 製造 `.sao-btn-glitch` / `.sao-btn-rgb` span 的行為。
  - 將 `saoGlitchLabel` 改名為中性的 `saoLabel`，保留歷史按鈕 label override 的原功能。
- 驗證：
  - `rg` 檢查 `sao-btn-glitch|sao-btn-rgb|is-glitching|saoLabelGlitch|saoCyberGlitch|saoButtonRgbSplit|saoButtonAmbientRgbSplit|saoButtonPanelGlitch|saoButtonAmbientOverdrive|saoButtonSliceFlash|dataset\.saoGlitch|__saoGlitchTimer|saoGlitchLabel`：無結果。
  - `npm run sync:login-mother`：通過，`worldforge-login.html` 已更新。
  - headless DOM 檢查：`.sao-btn-glitch` / `.sao-btn-rgb` 數量 0，`.is-glitching` 數量 0。
  - headless screenshots：`output/s14-2/part-a/login-buttons-1366.png`、`output/s14-2/part-a/workbench-buttons-390.png`。
  - `npm run check`：通過。
  - `npm run test:visual`：14 passed，無 snapshot 更新。
- 待裝置驗收：hover/focus 的舊 DOM glitch 手感已移除；test:visual 仍拔 script / 藏 WebGL，實機 60fps 與動效手感待使用者裝置驗收。
- Commit：`41c5c56`

### Step 3 - Part B 第一輪：移除未引用與 idle loop keyframes
- 狀態：完成
- 目的：先拔掉未引用 keyframes 與長時間 idle 的 DOM/CSS 裝飾循環，降低 L1 paint/composite 壓力。
- 修改：
  - `public/index.html`：移除背景掃描、lens 旋轉/呼吸、frame sweep、notice scan/pulse、button idle breath/loading plate、system menu rail/signal 等 CSS animation 引用與對應 keyframes；`.frame-sweep` 改為不顯示。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步母檔。
- keyframes 計數：
  - Step 1 基準：93
  - Part A 後：89
  - 本步後：47
- 驗證：
  - `rg` 檢查本步移除的 keyframe 名稱與 animation 引用：無殘留壞引用。
  - `npm run sync:login-mother`：通過，`worldforge-login.html` 已更新。
  - `npm run check`：通過。
  - `npm run test:visual`：14 passed，無 snapshot 更新。
  - `git diff --check`：通過（僅 CRLF 提示）。
- 待裝置驗收：idle DOM 動效變安靜；test:visual 仍拔 script / 藏 WebGL，實機動效手感與 60fps 待使用者裝置驗收。
- Commit：`5645052`

### Step 4 - Part B 第二輪：合併入口/回饋 keyframes 並移除 paint 動畫屬性
- 狀態：完成
- 目的：將剩餘的入口/回饋動畫合併到少量共用 keyframes，並讓保留的 CSS keyframes 不再動畫化 `filter`、`box-shadow`、`clip-path`、`background*`。
- 修改：
  - `public/index.html`：將登入、工作台、system menu、提示與 chip 的多組入口動畫改用 `contentSlideUp` / `overrideMaterialize` / `overrideDissolve` / `noticeOut` 等共用 keyframes。
  - `public/index.html`：刪除已無引用的 `panelMaterialize`、`panelEdgeIgnition`、`deckMaterialize`、`textGlow`、`ctaWake`、`historyEntryIn`、`noticeIn`、`connection*`、`mobileAuth*`、`saoSystemMenuClipResolve`、`saoMenuItemResolve` 等 keyframes。
  - `public/index.html`：保留的 `contentSlideUp`、`override*`、`sao*Dissolve`、`saoButtonStrike`、success/error 回饋 keyframes 改為只使用 `transform` / `opacity`。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步母檔。
- keyframes 計數：
  - Step 1 基準：93
  - Part A 後：89
  - Part B 第一輪後：47
  - 本步後：26
- 驗證：
  - `rg` 檢查本步刪除的 animation 名稱：無殘留壞引用。
  - Node 掃描 `@keyframes` 區塊：無 `filter`、`box-shadow`、`clip-path`、`background*` 宣告。
  - `npm run sync:login-mother`：通過，`worldforge-login.html` 已更新。
  - `npm run check`：通過。
  - `npm run test:visual`：14 passed，無 snapshot 更新。
  - `git diff --check`：通過（僅 CRLF 提示）。
- 待裝置驗收：入口/回饋動畫改得更安靜；test:visual 仍拔 script / 藏 WebGL，實機動效手感與 60fps 待使用者裝置驗收。
- Commit：`cd14a8b`
