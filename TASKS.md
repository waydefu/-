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
- Current VFX direction: this is a magic-circle appraisal core, not a singularity. Remove all oversized plastic ellipse orbits; replace them with rune/tick rings. Use a rune crystal core and one unified framing formula for desktop/mobile.
- Mobile model selector direction: expand choices to the left of the trigger so they do not cover the analyze button or draft sync text.

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
- Follow-up: optimized the mobile model selector into a vertical rune rail so the three choices open above the trigger without overlapping clear-draft or thinking spark controls.
- Follow-up: hardened visual helpers for history/logout open states by disabling helper-driven modal animation, fixing opacity timing drift on slower machines.
- Follow-up verification passed: `npm run check:frontend`, `npm test`, `npm run test:visual`, and `git diff --check`.
- Follow-up: refactored the Great Sage VFX into a magic-circle appraisal core: removed the oversized ellipse orbits and low-poly shell, added a rune crystal core, and balanced the desktop/mobile framing.
- Follow-up: tuned the reference glyph rings into lower-opacity rune/tick rings with only minor cool calibration accents.
- Follow-up verification passed: `npm run check:frontend`, `npm test`, `npm run test:visual`, `git diff --check`, and a NUL-byte source scan.
- Follow-up: changed the mobile model selector from a vertical upward rail to a left-opening fan and updated the visual guard for that behavior.
- Follow-up verification passed: `npm run check:frontend`, `npm test`, `npm run test:visual`, `git diff --check`, a NUL-byte source scan, and Browser geometry sanity for the open mobile selector.

## In Progress
- Deploy mobile model selector left-opening follow-up.

## Next Step
Run checks, commit, deploy Hosting, then run live smoke.

## Files Changed
- `TASKS.md`
- `public/js/effects/effects-manager.js`
- `public/js/effects/great-sage-core.js`
- `public/js/webgl/reference-glyph-ring.js`
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

- Current VFX follow-up: `npm run check:frontend` passed.
- Current VFX follow-up: `npm test` passed.
- Current VFX follow-up: `npm run test:visual` passed.
- Current VFX follow-up: `git diff --check` passed with existing CRLF warnings only.
- Current VFX follow-up: NUL-byte source scan found no matches.
- Current VFX follow-up: Browser sanity on `http://127.0.0.1:5179/` reached `body.vfx-full` after 30s with a visible 1366x768 canvas and no horizontal overflow; CDP screenshot capture timed out on this machine.

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
