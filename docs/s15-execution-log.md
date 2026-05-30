# S15 Execution Log - 登入過場簡化與依序彈出修復

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- 已完成：`a5f97f5` - 初始化 S15 執行 log；`b555349` - 回填 Step 0 hash；`f68db77` - 標記 Step 0 log 完成；`de597d4` - 收斂 Step 0 恢復區塊；`5dabba2` - 記錄 S15 基準診斷
- 進行中：無
- 下一步：進 Part B Link Start ready/可見性修復前的小窗讀碼
- 未決 / 待我確認：Part A 點登入到 Google 選帳號頁慢，必須先量測與實機/preview 診斷，有證據才改 popup 鏈路；破壞性/部署/推送需先確認
- 待裝置驗收：真 Google popup 出現速度、Link Start 隧道穩定與 60fps、工作區進場手感、登出彈窗手感、POCO F6 Pro 實機流暢度

## 前置狀態
- 開工時間：2026-05-30 14:21 +08:00
- 開工 HEAD：`d8a7830`
- 分支：`codex/arcane-sage-core-20260522`
- 開工工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- 已讀：`README.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-執行單-S15\S15-登入過場簡化與依序彈出修復.md`
- S15 執行原則：不整檔讀 `public/index.html`；每次先 grep 定位再讀小窗；每步改前說明檔案、行號、內容、原因、風險；每步後同步 `public/worldforge-login.html`、更新本 log 並 commit。

## 步驟紀錄

### Step 0 - 初始化 S15 執行 log
- 狀態：完成；本 log 回寫中。
- 目的：建立 S15 的單一真相源，避免後續 Part A-G 跨多次上下文時靠對話記憶續工。
- 修改：新增 `docs/s15-execution-log.md`，固定恢復區塊與前置狀態。
- 風險：文件-only，無產品行為風險。
- Commit：`a5f97f5`
- Log Commit：`b555349`

### Step 1 - 前置定位與基準截圖
- 狀態：完成。
- 目的：符合 S15 動手前要求，先確認分支/工作樹、登入/工作區/歷史/登出彈窗的桌面與手機基準狀態，並只用 grep + 小窗定位 `public/index.html`。
- 定位摘要：登入元素位於 `public/index.html:5044-5137`；登入控制在 `:7814`、Link Start handoff 在 `:7885-7890`；`OperationalModeController` 在 `:8578` 起，`closePanel()` 在 `:8714-8728`；歷史 CSS stagger 在 `:2391-2396`；系統選單 CSS stagger 在 `:4776-4797`。
- 基準取樣：以 `http://localhost:5599/?flgMotion=full` 擷取 desktop 1280x720 與 mobile 375x844，輸出在 `output/s15/baseline/`。兩種 viewport 皆 `pageErrors=0`、`consoleErrors=0`。
- 觀察 1：desktop 登入基準回報 `linkStartShader:"idle"`，mobile 回報 `linkStartShader:"ready"`；支持 Part B「延遲初始化導致登入前不一定 ready」。
- 觀察 2：desktop 歷史收回後 DOM 仍為 `hidden=false` 且 `is-closing=true`，mobile 則正常 `hidden=true`；支持 Part E「timeout 與實際動畫收尾不同步」。
- 觀察 3：Playwright 直接點 `#historyToggle` 時被 `main.interface` 攔截，改用 DOM click 才能完成基準截圖；需在 Part D 檢查系統選單層級與 pointer hit area。
- 風險：診斷與文件紀錄-only；`output/` 為未追蹤基準產物，不納入 commit。
- Commit：`5dabba2`
