# S15 Execution Log - 登入過場簡化與依序彈出修復

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`
- 已完成：`a5f97f5` - 初始化 S15 執行 log；`b555349` - 回填 Step 0 hash；`f68db77` - 標記 Step 0 log 完成；`de597d4` - 收斂 Step 0 恢復區塊；`5dabba2` - 記錄 S15 基準診斷；`8ddc505` - 標記基準診斷完成；`3924b81` - Part B Link Start 預熱/首幀/時鐘對齊；`1851104` - 標記 Part B 完成；`8f88303` - Part C 登入內文整塊淡入；`39b2d47` - 標記 Part C 完成；`3352ef2` - Part D 工作區短 stagger/去背景補間；`d0be121` - 標記 Part D 完成；`8fc791f` - Part E 歷史抽屜 animation-driven close；`135ee3d` - 標記 Part E 完成；`f00461b` - Part F 登出確認彈窗動效；`3136d3e` - 標記 Part F 完成；`3abdb3d` - Part G 面板開啟殘留超長時序修復；`8e149be` - 標記 Part G 完成；`985017c` - 最終驗證通過紀錄；`6da1f02` - 標記最終驗證完成；`5ed55b2` - 本地預覽靜態取樣；`e454210` - 標記本地預覽完成；`63a7a05` - 驗收與 UI/UX/前後端稽核；`59f850d` - 標記驗收稽核完成；`5862827` - Firebase 全量部署並通過 live smoke；`e299f37` - 標記 Firebase 部署完成；`2e58d71` - 重新盤點剩餘 audit 與 Part A 待證據項；`68a0da4` - 清除 root dev-tool high audit；`aec514d` - 清除 functions transitive audit；`760a5b8` - Google popup-first 修法與診斷開關；`01ba737` - 全套驗證通過
- 進行中：無
- 下一步：等待實機驗收真 Google popup 速度與動效手感；若需推送再等明確指示
- 未決 / 待我確認：推送需先確認；App Check 強制模式仍依 README 需正式網域 Email/Google/訪客 log 皆 valid 才能切
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
- 狀態：完成。
- 指令/目標：打開 `http://127.0.0.1:5599/?flgMotion=full`，等待登入 boot 完成後讀 DOM 狀態。
- 結果：title 正常；`bodyClasses="boot-complete"`；`loginOpen=true`；`authPanelVisible=true`；`linkStartShader="ready"`；`linkStartPrewarm="ready"`；`pageErrorCount=0`；`consoleErrorCount=0`。
- 限制：這是本地靜態 DOM 狀態取樣，不代表真 Google popup latency、Link Start 隧道動態手感或手機實機 60fps。
- Commit：`5ed55b2`

### Step 10 - 驗收與 UI/UX/前端/後端稽核
- 狀態：完成。
- 指令：帶 F 槽 env 前綴跑 `npm run check`、`npm run build`、`npm test`、`npm run test:visual`、`npm run test:a11y`、`npm run test:rules`、`npm audit --audit-level=moderate`、`npm --prefix functions audit --audit-level=moderate`、`npm run smoke:hosting`。
- 通過：`check` 通過；`build` 通過且 `sync:login-mother` 無 tracked diff；`npm test` 23/23；`test:visual` 14/14；`test:a11y` 3/3 且 axe impact counts 皆 `{}`；`smoke:hosting` 通過；source truth 與 `worldforge-login.html` SHA 相同；靜態 HTML 無重複 id、無壞掉的 `aria-controls` / `aria-labelledby` / `aria-describedby` / `for` reference。
- Rules：第一次 `npm run test:rules` 因既有 Java process 占用 Firestore emulator `127.0.0.1:8099` 失敗；未 kill 該 process，改用 `output/s15-audit/firebase-emulator-8199.json` 臨時 config 跑同一 rules emulator 測試，exit 0。產生的 `firestore-debug.log` 已移到 `output/s15-audit/firestore-debug.log`。
- 前端安全檢查：`innerHTML` 風險點中，模型輸出走 `renderMarkdownLite()`，該函式先 `escapeHtml()`，測試覆蓋 `<script>` 不穿透；進度 UI 與 `sysStateHud` 是固定內建模板。
- 後端檢查：`functions/src/index.ts` 有 method guard、Auth token 驗證、quota transaction、Groq 失敗 refund、SSE error event、CORS allowlist；`quotaPeek` 強制 App Check；`analyzeV2` 仍是 report-only App Check（`ENFORCE_APP_CHECK=false`），符合目前 README/執行單描述但屬部署政策風險點。
- Audit 風險：root `npm audit` 報 `tmp <0.2.6` high，來源為 dev tooling `@axe-core/cli -> selenium-webdriver -> tmp@0.2.5`；functions audit 報 Firebase/Google SDK 依賴鏈 `qs`/`uuid` moderate，且 `npm ls` 顯示 hoisted `uuid@11.1.1` 對部分套件 range 為 invalid。未自動跑 `npm audit fix`，因會改依賴/lock 且可能有 breaking change。
- Headless 限制：自訂 full-motion/static `node + chromium.launch()` 稽核腳本在本機 timeout；既有 Playwright test runner 穩定通過。未宣稱 headless 已驗到真動效或 Google popup latency。
- 結論：未發現新的產品碼阻斷問題；待處理項為 dependency audit 修補、Part A 真 preview/Google popup 量測、實機動效驗收。
- Commit：`63a7a05`

### Step 11 - Firebase 全量部署
- 狀態：完成。
- 指令：先跑 `firebase deploy --non-interactive`；第一次失敗於 Functions discovery 預設 10s timeout，錯誤為 `User code failed to load. Cannot determine backend specification. Timeout after 10000`。
- 修正重跑：設定 `$env:FUNCTIONS_DISCOVERY_TIMEOUT="120"` 後重跑 `firebase deploy --non-interactive --debug`，完整輸出存於 `output/s15-deploy/firebase-deploy-debug-120.log`。
- 部署結果：部署到 `project-7276420283723642146`；Firestore rules 編譯並 release 成功；Hosting 上傳、finalize、release 成功，live release 為 `projects/65341047777/sites/project-7276420283723642146/channels/live/releases/1780133475973000`，Hosting URL `https://project-7276420283723642146.web.app`；Functions discovery 成功，但 `analyzeV2`、`cspReport`、`quotaPeek` 皆為 `Skipped (No changes detected)`。
- 部署後驗證：已跑 `npm run smoke:hosting` 通過，確認 live Hosting shell / App Check SDK / config module / result parser / HUD state module / unauth `analyzeV2` / unauth `quotaPeek` 均符合預期。
- 未做：未推送 git；未修改產品碼；未修 dependency audit；未進行真 Google popup / 實機動效驗收。
- Commit：`5862827`

### Step 12 - 剩餘問題重新盤點
- 狀態：完成。
- 指令：讀取本 log 恢復區塊、S15 執行單與 README 後，重新跑 `git status --short`、`git log --oneline -8`、root `npm audit --audit-level=moderate --json`、functions `npm audit --audit-level=moderate --json`、`npm ls tmp --all`、`npm --prefix functions ls qs uuid --all`。
- 結果：HEAD 為 `e299f37`；tracked clean，僅既有未追蹤 `.claude/`、`output/`。root audit 仍有 1 high：`tmp <0.2.6`，來源為 dev tooling `@axe-core/cli -> selenium-webdriver -> tmp@0.2.5`。functions audit 仍有 10 moderate：Firebase/Google SDK transitive `@google-cloud/firestore`、`@google-cloud/storage`、`google-gax`、`gaxios`、`retry-request`、`teeny-request`、`uuid`、`qs`，且 `uuid@11.1.1` 目前因不符合上游 `^8`/`^9` semver range 導致 `npm ls` 回 `ELSPROBLEMS`。
- 判斷：先修 lock / overrides 讓 audit 與 dependency tree 收斂；Part A 保持紅線，未量測前不改 popup 鏈路。
- 風險：診斷與文件-only，無產品行為風險。
- Commit：`2e58d71`

### Step 13 - Root dev-tool audit 修補
- 狀態：完成。
- 修改：`package-lock.json` 只更新 `node_modules/tmp` lock entry，將 `tmp` 從 `0.2.5` 升到 `0.2.7`；`package.json` 未變更。
- 原因：root `npm audit` 的 high 風險來自開發工具鏈 `@axe-core/cli -> selenium-webdriver -> tmp@0.2.5`，`tmp <0.2.6` 有 path traversal advisory。
- 驗證：`npm audit --audit-level=moderate` 回 `found 0 vulnerabilities`；`npm ls tmp --all` 顯示 `@axe-core/cli -> selenium-webdriver -> tmp@0.2.7`；`git diff --check -- package-lock.json package.json` 通過。
- 風險：僅 dev/a11y tooling transitive lock 更新，無 runtime 產品行為風險。
- Commit：`68a0da4`

### Step 14 - Functions transitive audit 修補
- 狀態：完成。
- 修改：`functions/package.json` 新增 npm `overrides`，固定 `qs@6.15.2` 與 `uuid@11.1.1`；`functions/package-lock.json` 移除 nested vulnerable `uuid@8.3.2` / `uuid@9.0.1` copies，改由 hoisted `uuid@11.1.1` 覆蓋，並將 `qs` 從 `6.15.1` 升到 `6.15.2`。
- 原因：Firebase Admin 13.10.0 目前仍透過 optional Google SDK 拉到舊 semver range；不降級 `firebase-admin` / `firebase-functions`，改用 npm overrides 收斂已知 vulnerable transitive versions。
- 驗證：`npm --prefix functions audit --audit-level=moderate` 回 `found 0 vulnerabilities`；`npm --prefix functions ls qs uuid --all` exit 0，顯示 `uuid@11.1.1` / `qs@6.15.2` 為 overridden 而非 invalid；`npm run check:functions` 通過；`git diff --check -- functions/package.json functions/package-lock.json` 通過。
- 風險：Functions runtime transitive dependency resolution 變更；未修改 Functions TypeScript 行為，仍需全套測試與部署前 smoke。
- Commit：`aec514d`

### Step 15 - Part A popup-first 修法與診斷開關
- 狀態：完成。
- 修改：`public/index.html` / 同步後 `public/worldforge-login.html`。新增 query-param gated `flgAuthPopupTiming=1` 診斷開關，以 `performance.now()` 記錄 submit、OAuth preflight、`signInWithPopup` 前後等 marks，並在診斷模式輸出 `window.__FLG_AUTH_POPUP_TIMING__` / `data-auth-popup-timing` / console debug。登入流程改為先檢查 Firebase Auth / Google provider 是否可用；可用時在點擊同步堆疊內先呼叫 `signInWithPopup()`，再做 `setStatus`、HUD notice、`is-oauth` class、WebGL energy、connection window 等視覺前置。
- 原因：Part A 的等待點是「點 Google 登入到 Google popup 出現」，原鏈路在 `signInWithPopup()` 前仍有 DOM/HUD/WebGL/window materialize 同步前置。為降低 popup 被同步視覺工作拖慢的風險，改成 popup-first；Link Start 成功後過場不移除、不弱化。
- 診斷限制：Chrome extension / Playwright 自動化在本機會把登入面板卡在進場或將受控 tab 切到 Firebase auth handler，無法代表實機 popup latency；臨時量測腳本與輸出留於未追蹤 `output/`。因此不宣稱已完成真實帳號選擇頁手感驗收，仍列待裝置驗收。
- 驗證：已跑 `npm run sync:login-mother`；已跑 `npm run check:frontend` 通過；`git diff --check -- public/index.html public/worldforge-login.html` 通過。
- 風險：OAuth 視覺提示比 popup 呼叫晚數毫秒啟動；Google popup / 取消 / 失敗分支仍走原 catch 與 `restoreLoginControls()`，但需真 Chrome 實機確認 popup 出現速度。
- Commit：`760a5b8`

### Step 16 - 剩餘修補全套驗證
- 狀態：完成。
- 指令：帶 F 槽 env 前綴跑 `npm run check`、`npm test`、`npm run test:visual`、`npm run build`、`npm run test:a11y`、root `npm audit --audit-level=moderate`、functions `npm audit --audit-level=moderate`、`npm run smoke:hosting`、Firestore rules emulator 測試。
- 結果：`npm run check` 通過；`npm test` 通過 23/23；`npm run test:visual` 通過 14/14；`npm run build` 通過且同步登入母體；`npm run test:a11y` 通過 3/3 且 axe impact counts 皆 `{}`；root/functions audit 均 `found 0 vulnerabilities`；`npm run smoke:hosting` 通過。
- Rules：`npm run test:rules` 仍因既有 emulator 占用 `127.0.0.1:8099` 失敗；未 kill 既有 process。改用臨時 `output/s15-audit/firebase-emulator-8299.json` 跑同一 Firestore rules emulator 測試，exit 0；產生的 `firestore-debug.log` 已移到 `output/s15-audit/firestore-debug-8299.log`。
- 限制：`test:visual` 仍會拔 script、藏 WebGL，不能驗證真 Link Start / popup 實機手感；Part A 真 Google 帳號選擇頁出現速度仍列待裝置驗收。
- 風險：驗證-only；未改產品行為。
- Commit：`01ba737`

### Step 17 - Firebase 全量部署剩餘修補
- 狀態：完成。
- 指令：依先前「全部署」指示，設定 `$env:FUNCTIONS_DISCOVERY_TIMEOUT="120"` 後執行 `firebase deploy --non-interactive --debug`，完整 debug log 存於 `output/s15-deploy/firebase-deploy-remaining-debug.log`。
- 部署結果：部署到 `project-7276420283723642146`；Firestore rules 編譯並 release 成功；Functions `analyzeV2`、`cspReport`、`quotaPeek` 皆 Successful update operation；Hosting version `projects/65341047777/sites/project-7276420283723642146/versions/da9a672da80fc6fa` finalized，live release `projects/65341047777/sites/project-7276420283723642146/channels/live/releases/1780137941215000`。
- 部署後驗證：`npm run smoke:hosting` 通過；線上 `https://project-7276420283723642146.web.app/?v=s15-final` HTML 確認包含 `flgAuthPopupTiming` 與 `sign-in-dispatched-before-visuals`。
- 未做：未推送 git；未宣稱真機動效與 Google 帳號選擇頁速度已驗收。
- 風險：live 站已更新；Functions 因 dependency override 產生新 revisions，smoke 通過但仍需實際登入/分析流程觀察。
