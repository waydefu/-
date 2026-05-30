# S15 Execution Log - 登入過場簡化與依序彈出修復

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- 已完成：`a5f97f5` - 初始化 S15 執行 log；`b555349` - 回填 Step 0 hash；`f68db77` - 標記 Step 0 log 完成；`de597d4` - 收斂 Step 0 恢復區塊；`5dabba2` - 記錄 S15 基準診斷；`8ddc505` - 標記基準診斷完成；`3924b81` - Part B Link Start 預熱/首幀/時鐘對齊；`1851104` - 標記 Part B 完成；`8f88303` - Part C 登入內文整塊淡入；`39b2d47` - 標記 Part C 完成；`3352ef2` - Part D 工作區短 stagger/去背景補間；`d0be121` - 標記 Part D 完成；`8fc791f` - Part E 歷史抽屜 animation-driven close；`135ee3d` - 標記 Part E 完成；`f00461b` - Part F 登出確認彈窗動效；`3136d3e` - 標記 Part F 完成；`3abdb3d` - Part G 面板開啟殘留超長時序修復；`8e149be` - 標記 Part G 完成；`985017c` - 最終驗證通過紀錄；`6da1f02` - 標記最終驗證完成
- 進行中：Step 9 本地 in-app Browser 預覽靜態取樣完成，待 commit 回填 hash
- 下一步：commit 本地預覽紀錄；Part A 需 preview/真 Google popup 診斷；部署/推送需明確同意
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
- 狀態：完成。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。`workbenchReveal` 清場時長由 5.8s 改 1.2s；工作區 nav/panel/action/dossier/tool modules 改短 stagger（約 60ms 階梯）；系統選單 z-index 提高、桌面 overflow 改 visible、明確 pointer-events，選單按鈕由 0.9s 起跳改成 0.06s 起跳的依序彈出；進入工作區後 WebGL 背景直接落到待機狀態，不再跑 1800ms core/rune/particle 補間。
- 同步：已跑 `npm run sync:login-mother`。
- 驗證：已跑 `npm run check` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過（僅 CRLF 提示）；grep 確認舊 workbench/system menu 長 delay 與 `runPhaseClock(...1800...)` 背景補間已移除。
- Headless 限制：full-motion Playwright 對本頁 WebGL 仍不穩，未宣稱已驗到實際彈出手感；工作區進場手感列待裝置驗收。
- 風險：工作區進場節奏變短；實機需確認按鈕不被裁切且系統選單可點。
- Commit：`3352ef2`

### Step 5 - Part E 歷史抽屜 animation-driven close
- 狀態：完成。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。新增 `cancelPanelClose(panel)`，open 時遞增 close token 並清掉舊 closing；`closePanel()` 由固定 `setTimeout(2200)` 改為 close token + `animation.finished` / `Promise.allSettled()` 收尾，並保留 `duration + 160ms` fallback。
- 影響範圍：同型 panel（system menu、account menu、history drawer）共用 close 收尾；history 開啟/關閉時舊 close promise 不會在重新開啟後把 panel 隱藏。
- 同步：已跑 `npm run sync:login-mother`。
- 驗證：已跑 `npm run check` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過（僅 CRLF 提示）；grep 確認 `__saoCloseToken`、`Promise.allSettled(animation.finished)` 與 fallback timer 均存在。
- Headless 限制：full-motion Playwright 對本頁 WebGL 仍不穩，未宣稱已視覺驗到殘影消失；歷史抽屜退場視覺列待裝置/真瀏覽器驗收。
- 風險：三種 panel close timing 改為 animation-driven；fallback 保留避免 animation event 遺失。
- Commit：`8fc791f`

### Step 6 - Part F 登出確認彈窗動效
- 狀態：完成。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。新增 `.sao-confirm-window[aria-hidden="false"]` 專屬 0.72s `overrideMaterialize`，手機套 0.72s `overrideMaterializeMobile`；confirm 內文/header/actions 改短 delay；`SaoWindowController.open()` 開窗前 cancel 舊 animation，confirm focus delay 由 override window 的 4500ms 改 820ms。
- 同步：已跑 `npm run sync:login-mother`。
- 驗證：已跑 `npm run check` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過（僅 CRLF 提示）；小窗確認 confirm selector、mobile selector、`target.getAnimations().forEach(...cancel...)` 與 820ms focus 分支存在。
- Headless 限制：full-motion Playwright 對本頁 WebGL 仍不穩，未宣稱已視覺驗到登出彈窗動效；登出彈窗手感列待裝置/真瀏覽器驗收。
- 風險：登出確認進場和 focus timing 變快；一般 override window 仍保留原本 5.2s 節奏。
- Commit：`f00461b`

### Step 7 - Part G 全域動畫殘留掃描與面板開啟時序修復
- 狀態：完成。
- 掃描：`rg` 確認 `public/index.html` 無 `gsap`；括號感知腳本確認 26 個 CSS animation name 全都有對應 `@keyframes`，missing 為空；長時序掃描列出 boot、一般 override window、panel close、idle core pulse 等預期項，另發現 `playPanelOpen()` 仍有 `5600/3600/3200ms` 殘留。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。`playPanelOpen()` 的 system/drawer/menu open WAAPI duration 改為 `760/720/680ms`，保留原 materialize keyframes、clipPath、filter、easing，只移除互動面板開啟過慢問題。
- 同步：已跑 `npm run sync:login-mother`。
- 驗證：已跑 `npm run check` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過（僅 CRLF 提示）。
- Part A：未改 popup 鏈路；仍需 preview channel/真 Google popup 以 `performance.now()`、Network、Performance 面板量測後才可動。
- 風險：system/account/history 面板開啟節奏變快；動效仍保留，但實際手感需真瀏覽器/裝置確認。
- Commit：`3abdb3d`

### Step 8 - S15 最終驗證
- 狀態：完成。
- 指令：帶 F 槽 env 前綴依序跑 `npm run check`、`npm test`、`npm run test:visual`。
- 結果：`npm run check` 通過；`npm test` 通過 23/23；`npm run test:visual` 通過 14/14。
- 限制：`test:visual` 會拔 script、藏 WebGL，不能驗證 Link Start / 登入過場 / panel materialize / 登出彈窗動效；動效與 Google popup 速度仍列待裝置/preview 驗收。
- Part A：仍未修改 popup 鏈路，因缺真 Google popup 的 `performance.now()`、Network、Performance 面板證據。
- Commit：`985017c`

### Step 9 - 本地 in-app Browser 預覽靜態狀態取樣
- 狀態：完成，待 commit 回填。
- 指令/目標：打開 `http://127.0.0.1:5599/?flgMotion=full`，等待登入 boot 完成後讀 DOM 狀態。
- 結果：title 正常；`bodyClasses="boot-complete"`；`loginOpen=true`；`authPanelVisible=true`；`linkStartShader="ready"`；`linkStartPrewarm="ready"`；`pageErrorCount=0`；`consoleErrorCount=0`。
- 限制：這是本地靜態 DOM 狀態取樣，不代表真 Google popup latency、Link Start 隧道動態手感或手機實機 60fps。
- Commit：待回填
