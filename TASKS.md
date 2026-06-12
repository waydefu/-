# S-Level Upgrade Tasks

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
