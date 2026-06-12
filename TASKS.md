# S-Level Upgrade Tasks

## PASS 5b 編舞修訂（2026-06-13，已部署）
使用者對比修訂：①Pass5 漏做「環快速轉動**把煙轉散**」②工作區展開順序錯——必須在「環減速完開始正常運作」**之後**（Pass5 在加速中段 t=1.9 就展開）。③要求模組化分區利於修改維護。
- **模組化**：`js/effects/opening-director.js` 新導演模組＝時序唯一真源（TIMELINE 表：cardOut 0／ignite 300／peakEnd 2500／reveal 3300／cleanup 8000，改時序只動這張表）；main.js 編舞分支縮成 `playOpening({ onReveal: enterWorkspace })`。
- **煙轉散**：sage-vfx 新 `uFog` uniform（三層煙霧：羊皮紙霧/資料煙/青綠霧統一乘；墨漬暗斑不動）；PH.fog/fogT 相位值（idle 1.15 濃／ignition 0.42 被轉散／ambient 0.72 回穩／operational 0.90／computing 0.60）；lerp dt*0.9 慢散；霧 uv 吃 RT（隨轉速加速）自帶旋轉方向感。smokeMid 乘 uFog 後 occl 連動（煙散→結界更清晰，語意正確）。
- **順序修正**：ignition after 2.6→2.2s（t=2.5 巔峰收束自動減速回 ambient）；工作區 saoIn 改 t=3.3（減速近穩後）。
- **音效原子化**：sfx.ignite() 組合拆成 riser(dur)/impact()/whoosh()/shimmer() 原子，由 director 排拍（riser t=0.3 鋪 2.2s、impact t=2.5 配 duck、whoosh+shimmer t=3.3 展開拍）；audio-fx 移除 worldforge:ignite 監聽（避免雙放）。
- 驗證：npm test 26/26；preview（沙箱斷網 CDN 不到 → vfx-full 缺席，改驗 director DOM 鏈：t=0.5 卡片收合中＋工作區未出、t=3.0 仍未出（順序修正關鍵）、t=3.5 saoIn 播放）；deploy+smoke 7/7；線上抽驗 4 項全過。霧轉散視覺待線上實機驗收。

## PASS 5 開場重編舞（2026-06-12b，進行中）
使用者指令：
1. 手機歷史紀錄鍵破版要修（header 鑑定紀錄鈕文字換行）。
2. SAGE LINK 卷宗傳送**直接刪除**（link-start 全鏈路）。
3. 新開場編舞取代：載入頁結束 → 登入彈窗出現；背景=霧裡微亮核心（**夜燈亮度** idle）；
   登入完成 → 登入卡收起 → 核心增亮 → 軌道**分次出現**旋轉 → 加快 → 工作區 **SAO 展開** → 軌道減速 → 正常運作(ambient)。
4. 上網研究「增強動效 + 電影級音效」，以最高規格高品質（高效能利用率）**規劃**（產出 docs 規劃文件）。
流程令：上下文防爆（先落盤再做；進度隨做隨記）。
進度：[x] 研究+規劃文件 [x] 手機歷史鍵 [x] 刪 SAGE LINK [x] 新編舞 [x] 部署收尾

實作摘要（2026-06-12b，Pass5）：
- 規劃文件：docs/SAGE_OPENING_PASS5.md（編舞原則對照表、時序表、電影級音效配方、效能政策、來源）。
- 手機歷史鍵：MOBILE OVERRIDES 加 .continue-application nowrap+縮 padding、.brand-name ellipsis、.nav-actions 不縮。390px 驗證單行。
- 刪 SAGE LINK：link-start.js 刪檔；main.js 拔 import/呼叫；index.html 拔 #linkStart DOM；motion.css 拔 .link-start/.ls-* 全段
  + reduced-motion 例外；tests/visual/helpers.ts 拔 selector。
- 新編舞（事件驅動、零新 render pass）：
  · 進站=idle 夜燈（powerT 0.16/igniteT 0.08——法陣軌道全熄、霧中微核）；已登入 reload=ambient 直入（不重播）。
  · 手動登入（state.manualLogin flag，googleLoginBtn handler 設）→ applyAuthState 編舞分支：
    t=0 auth-card.is-closing（saoOut）→ t=0.3 dispatch worldforge:ignite（core 切 ignition、audio 播 ignite 編組）
    → t=1.9 body.just-linked+is-authed → workspace saoIn 0.65s（transform-origin center 32%）→ t=2.9 ignition after 2.6s 自動回 ambient 減速。
  · core：_onIgnite 監聽；_onAuth 仲裁 450ms（無 ignite=reload → 直入 standing）；登出→idle。standing 語意改 ambient/idle（operational 留給 lab）。
  · audio：sfx.ignite()=riser(C2→C4 sawtooth+雙帶噪聲 1.6s)→impact(58Hz sub+transient+C3、master duck 150ms)→whoosh(1200Hz)→shimmer(C6/G6/E7 detune 2.2s)。
- 驗證：npm test 全綠；preview=夜燈截圖/ignite 中段聖光束+內外分次/saoIn 結束於可見/auth 隱藏/登出回 idle/390px header 單行、零 console error。
- 坑：本機 python server 對 module 快取重——刪檔後舊 main.js import 404 整個 graph 掛（線上 no-cache 無此問題）；驗證用 import('?probe') 繞。

技術備忘（編舞映射）：
- sage-vfx 相位已備：idle(0.18 夜燈)/ignition(內→外 sealGate→midGate→outerGate→boundaryGate 分次點亮+rotMult 2.0)/ambient(0.30 減速 0.85)。
- 改動點：great-sage-core _init() 尾 setPhase("ignition") → 進站只到 idle；_onAuth(user 登入) → setPhase("ignition")（after→ambient）。
- 工作區 SAO 展開：app-main/workspace 套 modalIn 式 scaleX→scaleY 動畫（transform/opacity only），時點=ignition 高峰後 ~1.6s。
- 登入卡收起：auth-card 套 modalOut 反向；body.is-authed 的 display 切換需配合動畫延遲。
- 音效時點：登入琶音(auth-changed 已接)；ignition 可加長音 swell（規劃文件定）。

## ART DIRECTION PASS 4（2026-06-12，進行中）
使用者批評與指令（原文要點，逐項做完才收尾）：
1. 整體太像高密度 2D 法陣壁紙；要變成真正 3D 系統介面。法陣偏平面；外圈軌道像「線」不像「軌道系統」。
2. 參考影片分析 UI 表現：https://youtu.be/SbO9xfTzXwA 、https://youtu.be/4fN3m9bq5XQ
3. 登入/工作區卡片融合 OK 但太方正太普通 → FUI 化（切角/構材/接縫），遵守零閃鐵律（禁 clip 容器內 pseudo）。
4. 背景改「暗黑手稿資料空間」：古書頁粉塵／暗褐羊皮紙霧／墨跡灰塵／漂浮文字殘影／暗金資料煙——不是純宇宙星場。
5. 分區 bloom 增加一些。
6. 手機第二排按鈕列沒排直：模型切換+加速鈕掉到第三排 → RWD 修復（390px 驗證）。
7. 連結成功動畫（LINK START）太弱且風格不一致 → 重編舞、黑金+青綠統一。
8. 準備音效系統（查資料再做；WebAudio 程序化、autoplay 政策、靜音開關）。
流程令：以上皆先查資料再改；注意上下文防爆（計畫落盤本檔、進度隨做隨記）。
進度標記：[x] 研究 [x] 手機列 [x] 卡片 [x] 背景+軌道+bloom [x] LINK START [x] 音效 [x] 部署收尾

實作摘要（2026-06-12，Pass4）：
- 手機列：根因＝Pass3 桌面 MODEL SLOT/spark-switch 規則寫在 640px 區塊之後，source order 蓋掉手機覆寫（thinkToggle 100px 擠掉行）。
  治本＝app.css 檔尾新設「MOBILE OVERRIDES 區塊（鐵律：保持檔案最末）」：spark 13.5px(track 5em=67.5px)、ms-face 縮、ms-current 96px ellipsis。390/360px 驗證同列。
- 卡片 FUI：fui-frame(金)+fui-fill(暗) 雙層獨立 <i> clip 切角（左上/右下 18px、右上/左下 8px），本體去 bg/border 留柔光 shadow。
  踩坑＝positioned fui 層蓋掉 static 內容 → 宿主直屬子元素統一 position:relative+z1。套用：auth-card/手稿/卷宗/歷史/登出彈窗五處（HTML 插入）。
  auth-card::before 虛線內框改 clip 同形+z1；card-lock 內縮貼斜邊。彈窗 fui-fill 加深（暗場上要實）。
- 背景手稿空間：粒子外三族（中圈/碎屑/遠塵）改暗褐紙塵（色暗、size 0.48/0.40/0.34、amp 降）→ 去星空感；
  羊皮紙霧 0.16→0.30、資料煙 0.22→0.36、文字殘影 3→4 行 ×0.05、新增大尺度墨漬暗斑(×0.22)。
- 軌道 3D：orbitSys 主帶 0.018→0.030、前銳後糊(soft 0.16~2.2)、後景霧遮 0.34→0.20、帶內車道紋、彗尾 7.5→4.2、節點加大；
  五型傾角 12/-24/8/32/-36 → 22/-30/14/42/-45（橢圓透視更明顯）。bloom 0.42/0.33/0.78→0.52/0.37/0.72。
- LINK START「SAGE LINK 卷宗傳送」：三幕（0-0.8 聚合/0.8-2.6 傳送/收尾）；星線改黑金配比(金60/琥珀22/白金12/青綠6)、
  30% 符文短劃(斷續)、法陣環外湧+四向節點珠、白金核漸亮、播放時 dispatch worldforge:pulse 同步法陣衝能。
- 音效：js/effects/audio-fx.js（WebAudio 純合成、C4 基頻族派生、共用 envelope/lowpass 材質）；
  hover/click/pulse/login琶音/analyzeStart hum/complete鐘/error小二度；首次手勢解鎖、localStorage('flg-sfx')、
  header #sfxToggleBtn 靜音鈕（is-muted 斜線）。main.js boot 接 initAudioFx()。
- 已知：preview 對 js module 重度快取（驗證需 import?cb=）；線上 firebase.json 對 js/css/html 全 no-cache 不受影響。

研究結論（2026-06-12）：兩支參考＝「no-copyright HUD futuristic animation with sound / hacker screen 4K」FUI 模板。
設計語彙：①環=分段粗弧（不同寬度/轉速/方向）非細線，透視傾斜+層間遮擋+相機漂移=3D 感 ②環側掛刻度+微型數據標籤
③面板=角括號/斜切角+半透明填充+細框+header tab ④雷達 sweep 掠光 ⑤音效（hum+tick+whoosh）與動畫同步。
WebAudio：純合成 UI kit，全音效同一 base freq+envelope/filter 派生（材質一致）；oscillator+noise buffer+biquad+ADSR；
首次手勢解鎖 AudioContext、master gain+靜音存 localStorage。

## Current Goal
Implement the S-level upgrade plan for the Great Sage UI: loader/VFX director, non-squeezing controls, arcane model selector, and resilient progress tracking.

## Known Decisions
- Read `README.md` first; it remains the project source of truth.
- Keep the current cinematic login light effects. Do not add a login-page mask or intentionally dim the background.
- Existing button motion is a product feature. Keep login 3D, analyze star, history folder/pencil, and thinking spark motion.
- Only fix layout-squeezing behavior for logout and clear-draft controls.
- Use the existing `bootLoader`; do not add a second loading page.
- Use VFX events to coordinate loader exit: `worldforge:vfx-ready`, `worldforge:vfx-full`, `worldforge:vfx-fallback`.
- Keep Firebase/Auth/API/history data contracts unchanged.

## Completed
- Read README and inspected current VFX, loader, action controls, and model selector.
- Created this persistent task log.
- Implemented VFX body states/events: `worldforge:vfx-ready`, `worldforge:vfx-full`, and `worldforge:vfx-fallback`.
- Converted `bootLoader` from a fixed timer into a loader director: minimum 3200ms, maximum 6000ms fallback, VFX-ready handoff.
- Fixed logout so hover/focus uses a floating label instead of expanding the button width.
- Fixed clear-draft so hover/focus uses ember/icon motion instead of expanding the button width.
- Upgraded the model selector to a fixed-size Arcane Orbit Dial with outside-click and Escape close behavior.
- Reflowed the mobile action row: analyze gets a full first row, secondary controls stay fixed-size on the second row.
- Added source guard tests for loader/VFX event contracts.
- Added visual behavior tests to prevent command-row layout shift from clear/logout/model controls.
- Verification passed: `npm run check`, `npm test`, `npm run test:visual`, `npm run test:a11y`, and `git diff --check`.

## In Progress
- None.

## Next Step
Done. Deployment, smoke, commit, ignored attachments, and NUL cleanup are complete.

## Files Changed
- `TASKS.md`
- `public/js/effects/effects-manager.js`
- `public/js/effects/great-sage-core.js`
- `public/js/main.js`
- `public/js/app/review-controls.js`
- `public/css/app.css`
- `tests/source-guard.test.mjs`
- `tests/visual/worldforge.spec.ts`
- `tests/visual/worldforge.spec.ts-snapshots/workbench-390-chromium-win32.png`

## Tests Run
- `npm run check` — passed.
- `npm test` — passed.
- `npm run test:visual` — passed after updating the expected mobile workbench snapshot.
- `npm run test:a11y` — passed.
- `git diff --check` — passed with existing CRLF warnings only.

## Notes For Continuation
If context is compacted or interrupted: read `README.md`, this `TASKS.md`, then run `git status --short` before continuing.
Local dev server startup was attempted for a live smoke, but the background start command timed out and no server process/port remained active afterward.
Closure update: the previous reviewer open items are resolved. `sectionsToPlainText` is intentionally used by `tests/result-parser.test.mjs` and `scripts/smoke-hosting.mjs`; `.codex-remote-attachments/` is ignored by `.gitignore`; the work is committed on `master`; this file no longer contains a literal NUL byte.

## Reviewer Handoff (Claude, 2026-06-09)
To: Codex. Reviewed the full diff against this plan. Verdict: APPROVED — implementation matches the plan and is high quality. Shipped it for you.

Verified by reviewer:
- `npm test` re-run independently → 26/26 pass (incl. the new source-guard, result parser, SSE helpers, quota suites).
- The NIM model/thinking review integration is INTACT in `analyze-api.js`: request body still sends `{ text, model, thinking }`; cache key is still composite (you changed `\0` → `\n[[FLG_CACHE_META]]`, equivalent — fine).
- VFX wiring complete + resilient: `effects-manager.js` dispatches `vfx-ready` / `vfx-fallback`; `great-sage-core.js` dispatches `vfx-full` after all four detail layers settle (finally-guaranteed); `main.js` director retires loader on min(3.2s)+settle with a 6s hard fallback. Double-bind guards present.
- CSS is zero-flicker compliant: hover effects use transform/opacity/box-shadow only — no width transitions, so the command row never resizes. Logout fixed 44px + floating tooltip; clear fixed 50px + ember ring; Arcane Orbit Dial fixed 50px + pointer-events gating + focus-visible.
- Visual specs correct: removed the stale "帳號選單/account-menu" test + snapshot (that navbar no longer exists) and switched `connectionWindow` → `historyPanel` (current element).

Done by reviewer (so the build is LIVE now):
- `firebase deploy --only hosting` → 30 files released.
- `npm run smoke:hosting` against the live site → 7/7 ok (app shell, Google-only login, App Check SDK, result-parser + effects modules deployed, analyzeV2 + quotaPeek both return standard 401 without touching Groq).
- Live at https://project-7276420283723642146.web.app as of 2026-06-09.

Closure update by Codex:
1. `sectionsToPlainText` is not dead code anymore. It is used by `tests/result-parser.test.mjs` and live smoke coverage in `scripts/smoke-hosting.mjs`.
2. `.codex-remote-attachments/` is already ignored in `.gitignore`.
3. The work is committed on `master` and also pointed to by `feature/nim-multimodel-review`.

Backend context (unchanged this batch): production LLM path is NVIDIA NIM multi-model (Kimi K2.6 → GLM-5.1 → Nemotron 3 Ultra) + Groq cross-provider fallback, non-streaming (fixes CJK U+FFFD), 5,000-char limit, deep/fast modes, manual `model`/`thinking` override resolved in `functions/src/providers.ts`. Secrets: `GROQ_API_KEY` + `NVIDIA_API_KEY` in Secret Manager. README is current.

## SAGE CORE IGNITION 主站併入 (Claude, 2026-06-11)
- 主站背景 VFX 全面換成「SAGE CORE IGNITION」：唯一真源=`public/js/effects/sage-vfx.js`（零依賴工廠，three 類別由呼叫端注入）；`great-sage-core.js` 改為契約殼（保 constructor/start/stop/dispose/setEnergy、`worldforge:vfx-full`、`_markDetailLoaded("bloom")`/`("magicule")` 字面 → source-guard 綠）；`poc/vfx-lab.html` 改薄殼共用同一引擎（需 HTTP 開啟）。
- 美術規格：`docs/SAGE_CORE_IGNITION_SPEC.md`（17 章聖經）+ `docs/SAGE_CORE_REFINE_PASS2.md`（10 病因+小層拆解）。狀態機 idle/ignition/operational/computing/complete/failed；站內映射：進站→ignition→operational、analysis-start→computing、analysis-complete→complete、登入 pulse→nudge。
- 驗證：npm test 26/26；preview 實測 lab（點火/演算/休眠三態截圖、零 console error、FPS 32-38）+ 主站（vfx-full 達成、登入卡可讀、20fps@軟渲染 1280×720；<36fps 由自適應 render scale 降至 0.6 floor）；deploy hosting + smoke 7/7。
- 已知行為：CDN addon import 慢時 init 期間顯示 CSS 背景（不黑屏，正確 fallback）。
- 待辦（下一位接手）：
  1. `tests/visual/*-snapshots` 對新 VFX 已過期 → 跑 `npm run test:visual -- --update-snapshots` 重拍（重，本輪未跑）。
  2. `public/js/webgl/*` 六檔已無人 import → 死碼候選，待使用者確認後刪 + 同步 README。
  3. 手機降級先不做（使用者令）；QUALITY 等級已預留（sage-vfx.js：ultra/high/medium/low/static），要降只改 great-sage-core.js 的 quality 參數。
  4. 本機預覽：`scripts/dev-static-server.mjs` + `.claude/launch.json`（vfx-static, port 8123）→ 開 `/poc/vfx-lab.html`。

## 工作區空塊 + 開場閃屏修復 + 死碼封存 (Claude, 2026-06-12)
- **工作區上方空塊**：Pass3 的「面板統一」重複宣告 `.panel { position: relative; }`（app.css 後段），蓋掉了 `.history-panel { position: fixed; }`（同特異度、後者在前）→ 歷史彈窗掉回 workspace grid flow 佔走第一列 ~242px（transform scaleY(0.02) 視覺隱形但佔位）。修法＝刪冗餘規則（基礎 `.panel` 本就 relative），留註解防重犯。驗證：computed position 回 fixed、grid 兩列、手稿面板貼齊 header、歷史彈窗置中開合正常。
- **開場閃屏（核心動畫消失露出漸層背景）**：兩個共犯——
  1. `sage-vfx.js setSize/setRenderScale`：`renderer.setSize` 清空 drawing buffer，而 core loop 順序是「先 frame 渲染→後調 scale」，rAF 返回後合成器端出透明 canvas → 閃出 CSS 漸層底。修法＝`setSize` 尾端同一 task 內立即 `composer.render()`。
  2. `great-sage-core.js` 自適應 scale 無冷卻：點火期 FPS 在 36/56 門檻附近波動，每秒 resize 一次；`bloom.setSize` 重配 render target 本身就卡頓 → 「resize 卡頓→FPS 掉→再 resize」震盪。修法＝調整間隔 ≥2.5s（`_scaleHold`）。
  - 驗證：preview 重載 vfx-full、resize 壓測 ×5 零 console error、VFX 正常渲染。閃屏為時序性問題，最終手感待線上實機驗收。
- **死碼封存**：`public/js/webgl/*`（6 檔）、`public/sw-register.js`、`public/spellcheck.worker.js`、`poc/great-sage-vfx-poc.html`、根目錄誤入庫 jpeg → `git mv` 至根目錄 `deadcode/`（public 外不部署；附 `deadcode/README.md` 死因表）。保留：`sw.js`/`swkill.js`（SW 清理機制）、`forbidden-words.json`（main.js 在用）。README 同步：effects 樹加入 sage-vfx.js、webgl Phase 2 接回計畫標記作廢、關鍵檔案清單與維護原則更新。
- 驗證：npm test 26/26。注意：本機 preview 驗證需用 flg-static（public 為 root）；vfx-static 的 root 是 repo 根目錄，絕對路徑 `/css|/js` 會 404 變成無樣式頁。

## Ultra Pass 3 桌機高規格版 (Claude, 2026-06-11b)
規格：`docs/SAGE_CORE_ULTRA_PASS3.md`（原文=桌面 2026611提示詞.txt 第二版）。只做 Ultra，QUALITY 降級結構保留未實作。
- **首屏防閃**：index.html critical inline = Sage veil（深黑+暗金核+外圈輪廓+微青綠，外部 CSS 未到也不露普通背景）；`#sageCanvas` 預設 opacity:0，唯一揭示路徑=GreatSageCore **第一幀 render 完成**（effects-manager 的提早揭示已移除）；auth-screen/app-main/header 由 body.vfx-* 類別 gating 淡入 + 7s CSS 動畫保底（JS 全掛也可見）。
- **3D 軌道系統**：sage-vfx.js 新增 `orbitSys()`（主帶外亮內暗+內外緣線+簇狀刻度+節點星體(光球+暈+微環)+切線拖尾+前後深度(前亮粗/後暗細被霧吃)）；五型：A 主金12°/B 青綠-24°/C 白金內圈8°/D 暗金遠景32°霧遮/E 斷裂-36°分群。
- **環距重排**（Pass3 §四半徑表）：封印 0.235｜內符文 0.46｜主法陣 0.70-0.86｜主咒文 0.90｜資料流 0.98-1.18｜軌道 1.05-1.45｜殘符 1.22-1.38｜青綠結界 1.43-1.53｜外圓 1.62｜碎片群落 1.50-1.92。
- **轉速分層**：資料流×2.4、內符文×2、封印刻度×1.4、主骨架×1.2、點火瞬間 rotMult 2.0。
- **後製重做**：exposure 0.95、bloom 0.42/0.33/0.78（高門檻小半徑）、cinematic=核心熱浪折射(中心小範圍)+filmic+黑位下壓+飽和1.12 回補+暗角不死黑(floor 0.30)+grain 0.020+CA 0.0008。
- **滑鼠視差**：uPx/uPy 三層位移（遠 0.085/軌道 0.040/塵 -0.05），core 餵入、lab 同步。
- **工作區退場**：新相位 ambient(power 0.30)；`worldforge:auth-changed` → standing 切換 operational↔ambient；complete/failed 回 standing。
- **MODEL CORE SLOT**：取代放射選單。`#modelSlotBtn`+浮空 `#modelPanel`(z-drawer、向上開、不被裁切)+三選項(自動/深度 Kimi/快速 Groq，含節點+描述)+MODEL SYNC 同步閃；radio `name="modelPick"` 值流不變 → AppState/analyze-api/API 模型值不破；思考開關僅 Kimi 啟用照舊。
- **UI 統一**：登入卡=控制台（四角鎖扣+內框虛線刻度+角落節點燈）、AUTHORIZATION GATE 授權閘門標+呼吸狀態燈、panel 頭部角刻。
- 驗證：npm test 26/26；preview=穩態 vfx-full/canvas gating 結構保證/主站截圖(環距+卡片控制台)/模型槽開合+切換 Kimi(label/SYNC/思考開關/radio 全對)+零 console error；deploy+smoke 7/7。
- 殘餘風險：visual snapshots 仍過期（待 `--update-snapshots`）；首幀 gating 的 pre-load 瞬間無法用 eval 實測（結構性保證）；橘紅失敗態與 god-ray 完成態未在 preview 實測（lab 可按 4/5 鍵驗）。
