# S14-1 Execution Log - 行動版彈窗修復與字級系統

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：有未提交（既有未追蹤 `.claude/`、`output/`；本 log 更新尚未 commit）
- 已完成：`44aa217` - 初始化 S14-1 執行 log；`a9974fb` - 記錄 Step 0 commit hash；`d6e1759` - 記錄修改前彈窗基準截圖；`ec9fa99` - 記錄修改前基準 commit hash
- 進行中：無
- 下一步：Step 3 盤點固定 px 字級清單，準備 Part B 字級 token 與 L1 功能層替換
- 未決 / 待我確認：無
- 待裝置驗收：字級手感需使用者在 POCO F6 Pro 或實機確認

## 前置狀態
- 已讀：`README.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\00-總綱-架構與共用紅線.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\01-行動版彈窗修復與字級系統.md`
- 分支：`codex/arcane-sage-core-20260522`
- 開工時工作樹：有既有未追蹤 `.claude/`、`output/`
- `docs/s14-1-execution-log.md`：開工時不存在，本步新增

## 步驟紀錄

### Step 0 - 初始化執行 log
- 狀態：完成
- 目的：建立本單唯一恢復來源，避免後續靠對話記憶續工
- 修改：新增本檔與固定恢復區塊
- 風險：文件-only，無產品行為風險
- 結果：完成
- Commit：`44aa217`

### Step 1 - 修改前基準截圖
- 狀態：完成
- 目的：在改 CSS 前留下桌面 1280 與行動 375x812 的版面證據
- 方式：本機 headless server 服務 `public/`，Playwright 開啟頁面；為避免外部 CDN / WebGL 截圖超時，截圖時封鎖外部請求但使用本機 `public/index.html` 與 CSS
- 產物：
  - `output/s14-1/before/desktop-1280-page.png`
  - `output/s14-1/before/desktop-1280-overrideWindow.png`
  - `output/s14-1/before/mobile-375x812-page.png`
  - `output/s14-1/before/mobile-375x812-overrideWindow.png`
  - `output/s14-1/before/metrics.json`
- 結果：桌面 `#overrideWindow` centeredDelta `(0,0)`；行動版 `#overrideWindow` `left:10px; top:10px`，centeredDelta `(0,-251)`，確認行動版目前不是置中模型
- 風險：只產生本機截圖與更新 log，無產品行為風險
- Commit：`d6e1759`

### Step 2 - Part A 行動版彈窗置中修復
- 狀態：完成
- 修改：
  - `public/index.html:6007-6040`：`overrideMaterializeMobile` 與 `overrideDissolveMobile` 每個 keyframe 都補 `translate(-50%, -50%)`
  - `public/index.html:6279-6294`：行動版 `.override-window` 改用 `top:50%` / `left:50%` / `width:min(94vw,460px)` / `transform-origin:center center`
  - `public/worldforge-login.html`：已執行 `npm run sync:login-mother`，同步同版修改
- 原因：讓行動版 override/logout 彈窗與桌面及 GSAP inline transform 使用同一套置中模型，避免開啟或關閉動畫期間跑位
- 驗證：
  - `output/s14-1/part-a/metrics.json`
  - 桌面 1280：`connectionWindow`、`overrideWindow`、`logoutConfirmWindow` 均在 viewport 內，centeredDelta `(0,0)`
  - 行動 375x812：三個視窗均在 viewport 內；`overrideWindow`、`logoutConfirmWindow` centeredDelta `(0,0)`，rect `left:11 top:261 right:364 bottom:551`
  - 行動 reduced-motion：`overrideWindow`、`logoutConfirmWindow` 均可見、置中、無動畫，centeredDelta `(0,0)`
- 風險：只影響 `@media (max-width: 620px)` 的 `.override-window` 與 mobile keyframes；可能改變小螢幕彈窗垂直位置，但驗證結果符合置中需求
- Commit：待建立
