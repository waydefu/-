# S14-4 Execution Log - L0 奇觀層與 Link Start 過場

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：tracked dirty（本 log 待提交）；既有未追蹤 `.claude/`、`output/`
- 已完成：S14-1 完成，最後 commit `0b8db67`；S14-2 完成，最後已知 commit `556388b`；S14-3 完成，最後 commit `3f4a0bf`；`5c9670b` - 初始化 S14-4 執行 log；`3780ab9` - 回寫 Step 0 hash；`fb84a50` - 盤點 WebGL orchestrator 現況；`e8f8850` - 回寫 Step 1 hash；`fc26e96` - 記錄修改前 render 基準；`bced2e2` - 回寫 Step 2 hash；`ed9cd3a` - gate WebGL post pipeline；`b611ed5` - 回寫 Step 3 驗證；`4ebdf6d` - 標記 Step 3 log 已落地；`592f59a` - Link Start 金色隧道 shader；`707624b` - 回寫 Step 4 視覺里程碑；S14-4 preview login caveat 記錄中
- 進行中：記錄 preview server 與 Auth 網域 caveat
- 下一步：提交 preview caveat；等待使用者改用 `http://localhost:5599/` 或決定是否需要 Firebase Hosting preview/deploy
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
- 狀態：完成；本 log 回寫中。
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
- Commit：待提交
