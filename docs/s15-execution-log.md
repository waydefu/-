# S15 Execution Log - 登入過場簡化與依序彈出修復

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- 已完成：`a5f97f5` - 初始化 S15 執行 log；`b555349` - 回填 Step 0 hash；`f68db77` - 標記 Step 0 log 完成；`de597d4` - 收斂 Step 0 恢復區塊；`5dabba2` - 記錄 S15 基準診斷；`8ddc505` - 標記基準診斷完成；`3924b81` - Part B Link Start 預熱/首幀/時鐘對齊；`1851104` - 標記 Part B 完成；`8f88303` - Part C 登入內文整塊淡入；`39b2d47` - 標記 Part C 完成
- 進行中：Step 4 Part D 工作區依序彈出/裁切修復已改完，等待 commit
- 下一步：提交 Step 4，然後進 Part E 歷史抽屜收回殘影修復
- 未決 / 待我確認：Part A 點登入到 Google 選帳號頁慢，必須先量測與實機/preview 診斷，有證據才改 popup 鏈路；破壞性/部署/推送需先確認
- 待裝置驗收：真 Google popup 出現速度、Link Start 隧道可見度/穩定與 60fps、工作區進場手感、登出彈窗手感、POCO F6 Pro 實機流暢度

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

### Step 2 - Part B Link Start 預熱、首幀可見與時鐘對齊
- 狀態：完成。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。`runPhaseClock()` 新增共用起點；`LinkStartFX.start()` 接受同一 `performance.now()`；`triggerLinkStartHandoff()` 將 Link Start 與 handoff phase clock 對齊；shader 首段改為一開始就有 presence、tunnel phase 與 ignition core，避免前段近黑；初始化由 `deferToIdle(ensureLinkStartFX,{timeout:2400})` 改為 900ms `prewarmLinkStartFX()`。
- 保護：`prewarmLinkStartFX()` 在 reduced motion、主 WebGL disposed/context-lost 時跳過；Playwright `navigator.webdriver` 環境標記 `data-link-start-prewarm="automation-skipped"`，避免 headless desktop 建第二個 WebGL context 後主執行緒卡死。實機與一般瀏覽器仍走完整預熱。
- 同步：已跑 `npm run sync:login-mother`，`public/worldforge-login.html` 已由 source truth 更新。
- 驗證：已跑 `npm run check` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過（僅 CRLF 提示）。
- Headless 限制：full-motion Playwright 在登入 WebGL boot 後無法穩定執行 `page.evaluate`，因此未宣稱已驗到 Link Start 動效；相關 debug / screenshot 留在 `output/s15/part-b/`，不納入 commit。
- 風險：動效時序與 shader 可見度調整；headless 自動化不能代表 POCO F6 Pro/真 Chrome 動效手感，列待裝置驗收。
- Commit：`3924b81`

### Step 3 - Part C 登入內文整塊淡入
- 狀態：完成。
- 定位：CSS stagger 來源在 `public/index.html:3545-3559` 與手機 `:3571-3572`；JS WAAPI stagger 來源在 `:8415-8433`，逐節點延遲 `1600/2080/2720/3760ms`。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。保留 auth panel 本體 materialize；登入內文 `.auth-header`、`.seal-strip`、`#authTitle`、`#authPrompt`、`.auth-actions` 改成同一組 0.36s、0.16s delay 的整塊淡入；手機 `.primary-btn` 不再另跑 2.82s delay；JS `playAuthPanelMaterialize()` 改為同一批 content nodes 同時 360ms fade/translate。
- 同步：已跑 `npm run sync:login-mother`。
- 驗證：已跑 `npm run check` 通過；grep 確認舊登入內文逐條 delay 已移除，僅剩非登入流程的 `1600` 事件延遲。
- 風險：登入內文節奏變短；框體進場特效保留。
- Commit：`8f88303`

### Step 4 - Part D 工作區依序彈出、去背景補間與裁切修復
- 狀態：完成；等待本步 commit。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。`workbenchReveal` 清場時長由 5.8s 改 1.2s；工作區 nav/panel/action/dossier/tool modules 改短 stagger（約 60ms 階梯）；系統選單 z-index 提高、桌面 overflow 改 visible、明確 pointer-events，選單按鈕由 0.9s 起跳改成 0.06s 起跳的依序彈出；進入工作區後 WebGL 背景直接落到待機狀態，不再跑 1800ms core/rune/particle 補間。
- 同步：已跑 `npm run sync:login-mother`。
- 驗證：已跑 `npm run check` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過（僅 CRLF 提示）；grep 確認舊 workbench/system menu 長 delay 與 `runPhaseClock(...1800...)` 背景補間已移除。
- Headless 限制：full-motion Playwright 對本頁 WebGL 仍不穩，未宣稱已驗到實際彈出手感；工作區進場手感列待裝置驗收。
- 風險：工作區進場節奏變短；實機需確認按鈕不被裁切且系統選單可點。
