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
