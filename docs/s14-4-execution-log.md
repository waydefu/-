# S14-4 Execution Log - L0 奇觀層與 Link Start 過場

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：有未提交；既有未追蹤 `.claude/`、`output/`
- 已完成：S14-1 完成，最後 commit `0b8db67`；S14-2 完成，最後已知 commit `556388b`；S14-3 完成，最後 commit `3f4a0bf`；`5c9670b` - 初始化 S14-4 執行 log；`3780ab9` - 回寫 Step 0 hash；`fb84a50` - 盤點 WebGL orchestrator 現況；`e8f8850` - 回寫 Step 1 hash；`fc26e96` - 記錄修改前 render 基準；`bced2e2` - 回寫 Step 2 hash；`ed9cd3a` - gate WebGL post pipeline；`b611ed5` - 回寫 Step 3 驗證；`4ebdf6d` - 標記 Step 3 log 已落地；`592f59a` - Link Start 金色隧道 shader；`707624b` - 回寫 Step 4 視覺里程碑；`6ad98ba` - 記錄 preview Auth 網域 caveat；`5858953` - 已登入 auto-handoff 也播放 Link Start；`c4c4d35` - 回寫 Step 6 無動畫修正；`48940ea` - 標記 Step 6 log 完成；`9978824` - Link Start 首幀起算並提早顯影；`c87124e` - 回寫 Step 7/8 診斷與驗證；`bbad63d` - 標記 Step 8 log 完成；`1e21911` - motion override 與 reduced-motion 可見 handoff；`6583f56` - 回寫 Step 9 根因與驗證；`b9d1a76` - 標記 Step 9 log 完成；`8fb7c88` - 解除 dialog top-layer 遮擋並強化 Link Start 切場；`43c376e` - 回寫 Step 10 過場辨識度修正；`a5b3666` - 標記 Step 10 log 完成
- 進行中：Step 11 Part C lifecycle 已完成產品修改、mirror 同步、runtime 取樣與全套測試；待 commit 回填 hash
- 下一步：提交 Step 11 lifecycle，回填 commit hash，再標記實機待驗收項
- 未決 / 待我確認：若要在手機實機完成 Google Auth，需要 Firebase Hosting / preview channel / 已授權 HTTPS tunnel；LAN IP `10.95.167.113:5599` 通常無法登入
- 待裝置驗收：Link Start 隧道、中央光爆、CA/glitch/掃描線手感、WebGL 待機背景、POCO F6 Pro 實機 60fps

## 前置狀態
- 已讀：`README.md`
- 已讀：`docs/s14-3-execution-log.md` 恢復區塊
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\00-總綱-架構與共用紅線.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\04-L0奇觀層與LinkStart過場.md`
- 分支：`codex/arcane-sage-core-20260522`
- 開工時間：2026-05-30 01:21 +08:00
- 開工時 HEAD：`3f4a0bf`
- 開工時工作樹：tracked clean；既有未追蹤 `.claude/`、`output/`

## 步驟紀錄

### Step 0 - 初始化 S14-4 執行 log
- 狀態：完成
- 目的：建立 S14-4 的唯一恢復來源，避免高風險視覺迭代靠對話記憶續工。
- 修改：新增本檔與固定恢復區塊。
- 風險：文件-only，無產品行為風險。
- Commit：`5c9670b`
- Log Commit：`3780ab9`

### Step 1 - WebGL orchestrator / render pipeline 現況盤點
- 狀態：完成。
- 目的：在動 S14-4 產品碼前，確認實際 WebGL 入口、rAF、post pass、Link Start 與 fallback 現況，避免照過期假設改壞高風險視覺層。
- 重要差異：
  - 04 執行單寫「目前無 post-processing pipeline」，但現況已存在 `EffectComposer` / `UnrealBloomPass` / `SAOPass` / `ShaderPass` / `OutputPass`。
  - 因此 Part A 不能再「新增」重 pipeline；下一步應在既有 pipeline 上收斂、加 gating/fallback，或只調現有 shader/pass。
- 定位結果：
  - `public/index.html:5193-5218`：Three 與 postprocessing addon import；WebGL 模組 import。
  - `public/index.html:5236-5257`：S14-3 原生 `runPhaseClock()`，handoff 時序基礎。
  - `public/index.html:6133-6241`：現有 `cinematicShader`、`selectiveBloomCompositeShader`、`chromaticAberrationShader`；CA/glitch/scanline 已有雛形。
  - `public/index.html:6243-6304`：`SceneManager` 建立 scene/camera/`WebGLRenderer`，resize 與 pointer parallax；目前未看到 `webglcontextlost` handler。
  - `public/index.html:6326-6444`：`PostProcessingPipeline` 使用 bloom composer + main composer；流程為 RenderPass → SAOPass → cinematic → selective bloom composite → chromatic aberration → OutputPass；`update()` 內每幀 `renderSelectiveBloom(delta)`。
  - `public/index.html:6471-6641`：`LinkStartFX` 是獨立 raw WebGL canvas shader；目前色彩是 `spectral()` 彩虹傾向，不完全符合金色符文隧道 + 藍青環目標；init 有 try/catch fallback，但沒有 dispose/context lost。
  - `public/index.html:7540-7541`：handoff 觸發 `__FLG_LINK_START__.start()` 與 `post.triggerChromaticAberration()`。
  - `public/index.html:7748-7758`：`applyAuthenticationEnergy(driver)` 由 S14-3 rAF 驅動，餵 `core/runes/particles/post.setShock()`。
  - `public/index.html:9128-9263`：orchestrator 建立 `LinkStartFX`、Raphael layers、metrics 與 deferred layer init；只在 `beforeunload` dispose `steppedAnimationController`。
  - `public/index.html:9298-9320`：主 WebGL rAF loop 持續 `requestAnimationFrame(animate)`，更新 camera/core/runes/particles/Raphael layers/HUD/post；目前未看到 visibility pause。
  - `public/js/webgl/constants.js`：已存在金/青藍 palette（`GOLD`、`BRIGHT_GOLD`、`RAPHAEL_CYAN`、`OPTICAL_TEAL`、`RAPHAEL_GOLD_CORE`）。
  - `public/js/webgl/*`：多數 WebGL 模組已有 `profile.reduced/mobile/lowPower` gating 與 `disposeObjectTree()`；內聯 `PostProcessingPipeline` / `LinkStartFX` 的生命週期仍是本單主要風險。
- 初步風險判斷：
  - 已有 UnrealBloomPass 與 SAOPass，手機效能風險比執行單描述更高；需優先補 reduced/mobile/lowPower gating 或 fallback，再做視覺加強。
  - Link Start 已有獨立 shader，可小步把 palette/phase 改成金色極座標隧道，不必引 MSDF 或把功能 UI 放入 WebGL。
  - 主 rAF 與 Link Start rAF 都無 visibility pause；Part C 應列前段實作。
- 修改：僅更新本 log，未改產品碼。
- 風險：文件-only，無產品行為風險。
- Commit：`fb84a50`
- Log Commit：`e8f8850`

### Step 2 - S14-4 修改前真頁 render 基準
- 狀態：完成。
- 目的：在動 L0 奇觀層前留下可對照的真頁 WebGL render、handoff 中途畫面、工作區待機背景與 runtime 狀態。
- 方法：
  - 本機靜態 server serving `public/index.html`。
  - Playwright 真頁載入，等待 `__FLG_LOGIN_CONTROLLER__` / `__FLG_TIMELINE__`。
  - `forceBootComplete()` 後擷取登入待機背景。
  - 呼叫 `beginAuthentication("S14-4 before handoff baseline", { skipAuth: true })`，擷取 handoff 0.76s、2.26s、工作區待機與 390px 工作區。
  - 記錄 canvas `toDataURL()` 可用性與 runtime metrics。
- 產物：
  - `output/s14-4/before/login-idle-1366.png`
  - `output/s14-4/before/handoff-0760ms-1366.png`
  - `output/s14-4/before/handoff-2260ms-1366.png`
  - `output/s14-4/before/workbench-idle-1366.png`
  - `output/s14-4/before/workbench-idle-390.png`
  - `output/s14-4/before/runtime-baseline-report.json`
- 結果：
  - 5 張真頁截圖皆成功。
  - Runtime 無 pageerror。
  - `linkStartShader` 為 ready，`composerPasses` 為 6，`selectiveBloom` active，`bloomTargets` 127。
  - handoff 後成功進入 `body.operational`，`#operationalDeck` 為 `aria-hidden="false"` 且無 `inert`。
  - canvas `toDataURL()` 成功；headless console 僅有 WebGL `GPU stall due to ReadPixels` warning。
- 限制：
  - headless 截圖可確認非黑屏與流程，但不能判斷 POCO F6 Pro 實機 60fps、手感、眩光舒適度。
  - 390px 截圖是在同頁 resize 後取樣，profile metrics 仍顯示初始 desktop `mobile:false`；後續若要手機效能驗證，需新開 mobile context。
- 修改：僅更新本 log；baseline 產物保留在未追蹤 `output/`。
- 風險：文件-only，無產品行為風險。
- Commit：`fc26e96`
- Log Commit：`bced2e2`

### Step 3 - 既有 post pipeline 加上 profile gating 與 renderer fallback
- 狀態：完成。
- 目的：04 單現況盤點發現已存在 heavy post pipeline；本步先降低 S14-4 後續視覺迭代風險，讓 reduced-motion / mobile / lowPower 不強制跑 UnrealBloomPass + SAOPass，並確保 composer 初始化失敗時仍直接 renderer render，不黑屏不報錯。
- 修改：
  - `public/index.html:6326-6502`：`PostProcessingPipeline` 新增 `ready`、`enabled`、`lowPower`、`useSelectiveBloom`、`fallbackReason`。
  - `public/index.html:6326-6502`：`prefers-reduced-motion` 直接跳過 composer，`update()` 走 `renderer.render(scene,camera)`。
  - `public/index.html:6326-6502`：mobile/lowPower 不建立 `UnrealBloomPass` / `SAOPass` / bloom composer，只保留 RenderPass + cinematic + chromatic + OutputPass 輕量鏈。
  - `public/index.html:6326-6502`：composer 建立包入 `try/catch`；失敗時 `console.warn("[FLG] Post pipeline fallback:", ...)` 並轉 renderer fallback。
  - `public/index.html:9232-9260`：metrics/dataset 改為反映 `postPipeline`、`postFallbackReason`、實際 `selectiveBloom` 與 optional `composerPasses`。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
  - Runtime profile：`output/s14-4/step3/post-pipeline-profile-report.json`。
- Runtime profile 結果：
  - desktop headless：無 pageerror；因 headless 被 lowPower 偵測，走 `postPipeline: "lightweight"`，`composerPasses: 4`。
  - mobile-start：無 pageerror；`postPipeline: "lightweight"`，`composerPasses: 4`，`mobile: true`。
  - desktop-reduced-motion：無 pageerror；`postPipeline: "renderer"`，`composerPasses: 0`，`postFallbackReason: "reduced-motion"`。
- 限制 / 待裝置驗收：
  - 本步是效能與 fallback 地基，不是最終視覺成果。
  - Headless lowPower 偵測會讓 desktop 場景走 lightweight；實機桌面/POCO 仍需確認亮度與性能。
- Commit：`ed9cd3a`
- Log Commit：`b611ed5`

### Step 4 - Link Start 金色符文隧道 shader
- 狀態：完成；等待使用者裝置驗收。
- 目的：把 Link Start 從彩虹 `spectral()` 隧道改向 04 單目標：金色符文同心圓隧道、青藍外環、中央光爆，並移除 WebGL 可用時的 2D panel disintegration 矩形遮擋。
- 修改：
  - `public/index.html:6527-6568`：`LinkStartFX` fragment shader 改為金/青 palette、極座標 depth、ring bands、rune spokes、outer circuit 與收斂後的中央光爆。
  - `public/index.html:6527-6568`：whiteout 延後到 94% 後並降低覆蓋 alpha，避免整面白屏。
  - `public/index.html:7537-7543`：`triggerLinkStartHandoff()` 回傳 WebGL LinkStart 是否啟動。
  - `public/index.html:7556,7598`：若 LinkStart 成功啟動，不再疊 2D `disintegrateAuthPanel()`；若 LinkStart 不可用，保留舊 2D fallback。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
  - Runtime screenshot/report：`output/s14-4/step4/linkstart-0520ms-1366.png`、`output/s14-4/step4/linkstart-shader-report.json`。
- Runtime 結果：
  - 無 pageerror / shader compile error。
  - `linkStartActive: true`、`linkStartShader: "ready"`、`particleCanvasCount: 0`。
  - handoff 後仍進入工作區，`#operationalDeck` 可用。
  - console 僅有 headless WebGL `GPU stall due to ReadPixels` warning。
- 視覺觀察：
  - 截圖中已可見金色同心隧道與青藍外環。
  - 中央不再被 2D 碎片矩形蓋住。
  - headless 只能確認非黑屏與大致構圖；節奏、光爆舒適度與 60fps 必須實機看過。
- 待裝置驗收：請使用者在 POCO F6 Pro 看 Link Start 過場後，再決定是否加強符文密度、降低青藍外環、調整中心光爆或進入 Part C lifecycle。
- Commit：`592f59a`
- Log Commit：`707624b`

### Step 5 - Preview server 與登入網域 caveat
- 狀態：完成。
- 目的：回應使用者「登入不可用」，保留預覽環境狀態與 Firebase Auth 網域限制，避免後續把預覽限制誤判為產品碼壞掉。
- 預覽狀態：
  - 本機靜態 server：`py -3 -m http.server 5599 -d public`，port `5599` listening。
  - `http://localhost:5599/`：HTTP 200，可作為桌面本機 Auth 預覽入口。
  - `http://127.0.0.1:5599/`：HTTP 200，但 Firebase Auth 可能不視為授權網域。
  - `http://10.95.167.113:5599/`：HTTP 200 給手機看畫面，但 Firebase Auth / Google OAuth 通常會因 LAN IP 未授權而登入不可用。
- 結論：
  - 桌面登入請用 `http://localhost:5599/`。
  - 手機若要同時驗收「真 Google 登入 + handoff」，需要使用 Firebase Hosting / preview channel / 已加入 Firebase Auth authorized domains 與 Google OAuth origins 的 HTTPS tunnel；部署/推送需使用者明確同意後才做。
- 修改：僅更新本 log，未改產品碼。
- 風險：文件-only，無產品行為風險。
- Commit：`6ad98ba`

### Step 6 - 修正已登入 auto-handoff 跳過動畫
- 狀態：完成。
- 觸發：使用者回報「無動畫」。
- 原因：
  - `handoffSignedInUser()` 在偵測到既有 Firebase 登入狀態時，原本直接呼叫 `login.enterOperationalMode()`。
  - 這會跳過 `beginAuthentication()`，因此不會觸發 S14-4 Link Start shader / handoff phase clock。
  - 在本機預覽反覆測試時，若瀏覽器保留 Google/Firebase session，最容易走到這條直切路徑。
- 修改：
  - `public/index.html:9145-9148`：auto signed-in handoff 改為 `await login.beginAuthentication("已偵測到 Google 登入，正在進入工作區", { skipAuth: true })`。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
  - Runtime auto-handoff 探針：`output/s14-4/step6/auto-handoff-report.json`。
- Runtime 結果：
  - 強制呼叫 `__FLG_HANDOFF_SIGNED_IN_USER__()` 後 0.52s：`handoffClock: true`、`linkStartActive: true`、`particleCanvasCount: 0`。
  - 完成後：`body.operational`、`#operationalDeck` 為 `aria-hidden="false"` 且無 `inert`。
  - 無 pageerror；console 僅 headless WebGL `GPU stall due to ReadPixels` warning。
- 待使用者重測：
  - 桌面預覽用 `http://localhost:5599/`。
  - 若仍看不到登入動畫，請先登出或清除 localhost 站台資料，避免直接帶著已完成的工作區狀態回來。
- Commit：`5858953`
- Log Commit：`c4c4d35`

### Step 7 - 追查使用者回報仍無動畫
- 狀態：完成。
- 觸發：使用者回報「好像還是沒」。
- 診斷：
  - 重新讀 `README.md`、本 log 恢復區塊、S14 總綱與 04 單。
  - 確認 `http://localhost:5599/` 可連線，server 仍在 port 5599。
  - Playwright 真頁載入確認 Firebase SDK、`__FLG_LOGIN_CONTROLLER__`、`__FLG_TIMELINE__` 皆有載入，無 pageerror。
  - 以 stub 成功的 `signInWithPopup()` 觸發實際 `#authForm` submit 路徑，確認有呼叫 `__FLG_LINK_START__.start(5800)`。
- 結論：
  - Google 成功後的產品路徑已接到 Link Start，但現行 shader 前 13% 進度接近全黑，且 `runPhaseClock` / `LinkStartFX` 以呼叫當下的 `performance.now()` 起算；若瀏覽器、Google popup 或低效能裝置讓首個可見 rAF 延遲，使用者可能只看到極短或幾乎不可見的過場。
  - 若使用者其實在 LAN IP 或 Auth 失敗狀態，依紅線不會播放成功 handoff；仍需使用 `localhost` 或授權 HTTPS preview 才能測真登入。
- 產物：
  - `output/s14-4/step7/click-auth-stub-report.json`
  - `output/s14-4/step7/01-0200ms.png`
- 修改：此步只診斷與產生未追蹤 `output/` 產物，未改產品碼。
- 風險：診斷-only，無產品行為風險。

### Step 8 - 讓 Link Start 從首個可見幀起算並提早顯影
- 狀態：產品變更完成；本 log 回寫中。
- 目的：回應使用者仍看不到動畫的實機感受，把原本偏「先黑場」的 Link Start 改成更早出現金色隧道，並避免首幀延遲吃掉過場時間。
- 修改：
  - `public/index.html:5236-5258`：`runPhaseClock()` 改為第一個 rAF tick 才設定 `startedAt`，避免主執行緒或瀏覽器延遲時直接跳過動畫前段。
  - `public/index.html:6599-6622`：Link Start shader 的 `presence` / `tunnelPhase` 提早顯影，並提高金色符文、青藍外環與中央光核 alpha。
  - `public/index.html:6663-6694`：`LinkStartFX` 改為第一個 draw 才設定 `startedAt`，避免 canvas 過場在首幀前被延遲吃掉。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
  - Runtime stub submit 截圖：`output/s14-4/step8/0120ms.png` 可見金色隧道與中央光核；無 pageerror。
- 限制 / 待使用者重測：
  - Headless 截圖仍無法判定實機幀率與手感。
  - 若瀏覽器或系統開啟 reduced motion，依規格仍會跳過高動態 Link Start。
  - 若使用 LAN IP 或 Google Auth 失敗，依「真 Auth 成功才 handoff」紅線不會播放成功過場。
- Commit：`9978824`
- Log Commit：`c87124e`

### Step 9 - reduced-motion 根因與全動效測試 override
- 狀態：產品變更完成；本 log 回寫中。
- 觸發：使用者再次回報「一樣沒」。
- 診斷：
  - 依 Browser 外掛打開 `http://localhost:5599/`，頁面狀態顯示 `matchMedia("(prefers-reduced-motion: reduce)").matches === true`，`<html>` 帶 `motion-reduced`。
  - 既有規格在 reduced-motion 下會直接跳過 Link Start；因此使用者環境若啟用減少動態效果，就會合理地「完全看不到動畫」。
- 修改：
  - `public/index.html:5220-5241`：加入 motion preference 讀取，支援 `?flgMotion=full` 強制完整動效、`?flgMotion=reduce` 強制 reduced、`?flgMotion=system` 清除本機 override 並回到系統設定；偏好只存在 localStorage。
  - `public/index.html:5310-5311`：把 motion preference 寫到 `data-motion-preference` 供診斷。
  - `public/index.html:7675-7695`：reduced-motion 登入成功不再瞬切，改成低動態金色封印停頓約 640ms，再進工作區；不跑 Link Start WebGL 隧道與高動態 rAF。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
  - Browser 可見頁確認 `?flgMotion=full` 會讓 `<html>` 不再帶 `motion-reduced` 並設定 `data-motion-preference="full"`；Browser 內 Firebase SDK 載入不穩，故真 Auth 動效仍以使用者本機實測為準。
- 待使用者重測：
  - 完整 Link Start：`http://localhost:5599/?flgMotion=full`
  - 還原系統 motion 設定：`http://localhost:5599/?flgMotion=system`
  - 若用 LAN IP 或 Auth 失敗，仍不會播放成功 handoff。
- Commit：`1e21911`
- Log Commit：`6583f56`

### Step 10 - 強化過場辨識度並解除 dialog top-layer 遮擋
- 狀態：產品變更完成；本 log 回寫中。
- 觸發：使用者回報「有動效了，過場好像不明顯」。
- 診斷：
  - 修改前 `output/s14-4/step10-before/handoff-0520ms.png` 顯示舊登入/工作區畫面仍大量透出；Link Start 只是疊光。
  - `document.elementFromPoint()` 顯示中心命中 `#authForm` / `#ritualStack`，原因是 native `<dialog>` 進入 browser top layer，會壓過 `z-index: 128` 的 Link Start canvas。
- 修改：
  - `public/index.html:282-299`：`.link-start-fx` 改成 normal blend 的全螢幕切場層，加黑金 radial/linear 背景，active opacity 提到 `0.98`。
  - `public/index.html:6606-6626`：Link Start shader 加粗金色同心圓與符文 spokes，提高金色主體與中央光核 alpha；青藍外環降為輔助，避免往 cyber 偏。
  - `public/index.html:7687-7692`：WebGL Link Start 成功啟動時立即 `close()` 並隱藏 `#ritualStack`，解除 native dialog top-layer 遮擋；若 Link Start 沒啟動，仍走 2D disintegration fallback。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - Runtime stub submit：`output/s14-4/step10-final/handoff-0520ms.png`，中心命中 canvas，`#ritualStack.open === false`，`linkStartActive === true`，無 pageerror。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
- 待使用者重測：
  - `http://localhost:5599/?flgMotion=full`。
  - 此版已確認過場站到前景；仍需使用者裝置驗收亮度、青藍比例與 60fps 手感。
- Commit：`8fb7c88`
- Log Commit：`43c376e`

### Step 11 - Part C lifecycle：visibility pause、context lost fallback、teardown
- 狀態：產品變更完成；本 log 回寫中。
- 目的：落實 04 單 Part C，讓 WebGL 在分頁隱藏時停止主 rAF/post pass，context lost 時退回靜態漸層不黑屏，卸載時釋放 composer/pass/material/scene/renderer 與 Link Start raw WebGL 資源。
- 修改：
  - `public/index.html:282-300`：加入 `data-webgl-fallback="context-lost"` 靜態漸層 fallback，context lost 時隱藏 WebGL canvas 與 Link Start canvas。
  - `public/index.html:5243`：引入既有 `disposeObjectTree()`。
  - `public/index.html:6315-6395`：`SceneManager` 監聽 `webglcontextlost` / `webglcontextrestored`，context lost 時標記 fallback 並派發 runtime 事件，dispose 時移除 listener、釋放 scene tree、renderer 與 canvas。
  - `public/index.html:6543-6589`：`PostProcessingPipeline` 在 context lost/disposed 時不 render，dispose 時釋放 composer、pass 與 dark materials。
  - `public/index.html:6636-6909`：`LinkStartFX` 補 raw WebGL context lost/restored、pause/resume、program/buffer release 與 dispose。
  - `public/index.html:9469-9766`：主 WebGL rAF 改為 `schedule/pause/resume/dispose` lifecycle；`visibilitychange` 暫停/恢復，context lost/restored 串接 runtime，`pagehide`/`beforeunload` 做 teardown，並暴露 `__FLG_WEBGL_RUNTIME__` 與 DOM metrics 供取樣。
  - `public/worldforge-login.html`：由 `npm run sync:login-mother` 同步。
- 驗證：
  - `npm run sync:login-mother`：通過。
  - Runtime lifecycle 取樣：`node output/s14-4/step11/lifecycle-check.mjs` 通過，輸出 `output/s14-4/step11/lifecycle-report.json` 與 3 張靜態截圖。
  - Runtime 結果：pageErrors 0、consoleErrors 0；`running → paused → running`、人工 `webglcontextlost` 會 `preventDefault` 並切 `webglFallback="context-lost"`、`webglcontextrestored` 回 `running`、Link Start 跟隨 runtime pause/resume、dispose 後狀態為 `disposed`。
  - `npm run check`：通過。
  - `npm test`：23 passed。
  - `npm run test:visual`：14 passed。
  - `git diff --check`：通過（僅 CRLF 提示）。
- 產物：
  - `output/s14-4/step11/lifecycle-paused-static.png`
  - `output/s14-4/step11/lifecycle-context-lost.png`
  - `output/s14-4/step11/lifecycle-linkstart-resumed.png`
  - `output/s14-4/step11/lifecycle-report.json`
- 限制 / 待裝置驗收：
  - `test:visual` 仍會拔 script、藏 WebGL，只證明靜態 DOM 沒崩。
  - Headless 可驗狀態與 fallback，不可驗 POCO F6 Pro 實機 60fps、Link Start 動效手感與 context restore 在手機 GPU/瀏覽器上的真實表現。
- Commit：待回填
