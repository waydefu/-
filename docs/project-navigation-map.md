# Project Navigation Map

Last updated: 2026-05-27 Asia/Taipei

Purpose: current handoff map for the Fantasy Lore Guardian / Great Sage Manuscript System project. Use this before editing when context may be compacted or stale.

## Current State

- S10.8 / S10.9 handoff state was preserved in commit `2e0737c`.
- S11/S12/S13 execution records are in `docs/s11-font-webgl-execution-log.md` and `docs/s12-s13-execution-log.md`.
- Current frontend source of truth is `public/index.html`.
- `public/worldforge-login.html` is generated from `public/index.html` by `npm run sync:login-mother`.
- Latest SAO button correction is based on the dev.to Cyberpunk 2077 button article, adapted to black/gold manuscript styling:
  - two clipped plate layers;
  - real lower backing plate via `translate(var(--sao-cyber-offset-x), var(--sao-cyber-offset-y))`;
  - no cyan backing plate;
  - no tag badge;
  - no visible circular history/account nav glyphs;
  - no tag cutout in `--sao-cyber-clip`.

## First Files To Read

1. `README.md`
   - Long-form product, architecture, VFX, accessibility, and validation rules.
2. `docs/project-navigation-map.md`
   - This current map.
3. `docs/s10.9-mobile-sao-button-animation-layout-execution-plan.md`
   - Latest S10.9 mobile layout, SAO button, article review, and validation record.
4. `docs/s10.8-sao-cyber-buttons-modal-execution-log.md`
   - S10.8 modal/button implementation record.
5. `docs/project-scan-handoff-2026-05-26.md`
   - Broader scan findings and residual risks.

## Entry Points

- `public/index.html`
  - Formal frontend entry.
  - Contains the live HTML/CSS, login dialog, workbench DOM, SAO button CSS, runtime orchestration inline module, Firebase compat SDK loading, GSAP, and Three.js importmap.
- `public/worldforge-login.html`
  - Synchronized copy from `public/index.html`.
  - Do not edit directly unless explicitly repairing a sync failure.
- `scripts/sync-worldforge-login.mjs`
  - Copies `public/index.html` to `public/worldforge-login.html`.
- `public/js/core/`
  - Config, state, and type helpers.
- `public/js/services/`
  - Analyze API and cache service helpers.
- `public/js/utils/`
  - Result parsing and HUD state helpers.
- `public/js/webgl/`
  - Great Sage / Raphael WebGL components, materials, math, and dispose helpers.
- `functions/src/`
  - Firebase Functions v2 backend: `analyzeV2`, quota, validation, CORS, prompt config.
- `firestore.rules`
  - Owner-only history rules and field constraints.

## Current UI Ids And Contracts

Preserve these unless the user explicitly requests a breaking migration:

- Login dialog: `#ritualStack`, `#authPanel`, `#authTitle`, `#authPrompt`, `#ritualStatus`.
- Google login button: `#openRitualBtn`.
- Workbench shell: `#operationalDeck`, `#codexPanel`, `#operationalTitle`.
- Draft input: `#draftField`, `#draftFieldLabel`, `#draftFieldHelp`, `#charCount`, `#spellWarn`.
- Analyze button: `[data-op="analyze"]`.
- Status/output: `#operationalStatus`, `#analysisDossier`, `#analysisResult`.
- History: `#historyToggle`, `#historyDrawer`, `#historyList`, `#historyClear`, `#historyClose`.
- Account: `#accountToggle`, `#accountMenu`, `#logoutButton`.
- Logout confirm window: `#logoutConfirmWindow`, `#logoutConfirmTitle`, `#logoutConfirmBody`, `#confirmLogoutButton`, `#cancelLogoutButton`.
- Notification / accessibility: `#notice`, `#announcer`, `.skip-link`, existing ARIA and focus-visible rules.

## Current SAO Button Design

- CSS variables live near the top of `public/index.html`:
  - `--sao-cyber-clip`
  - `--sao-glitch-clip-*`
  - `--sao-cyber-offset-x`
  - `--sao-cyber-offset-y`
  - `--sao-cyber-primary`
  - `--sao-cyber-underplate`
- Late overrides near the end of the stylesheet force the shared plate treatment across `.sao-btn`, nav, menu, history, dossier, and result buttons.
- Current backing plate target:
  - black bronze underplate;
  - `translate(16px, 10px)` at 390px viewport in resting computed style;
  - hover computed style on desktop login CTA observed as `matrix(1, 0, 0, 1, 23.807, 14.5672)`;
  - hard slab shadow, not glow;
  - no `OR` / system tag badge.
- `hydrateSaoButton` still creates `.sao-btn-glitch` and `.sao-btn-tag` layers for duplicate-text effects, but `.sao-btn-tag` is hidden globally.
- History/account nav circles are visually hidden with `.history-chip .nav-glyph` and `.account-chip .account-avatar`.

## Active Button Hotfix - Pre-Change Record

Timestamp: 2026-05-27 Asia/Taipei.

User confirmed the desired button effect is the final dev.to Cyberpunk 2077 style, but adapted to this project's black/gold SAO manuscript palette. The failure to fix is that the current offset backing plate reads as glow/highlight only, not a clearly displaced second slab.

Planned safe scope before editing:

- Strengthen the shared `.sao-btn` CSS plate model only.
- Make `::before` read as a hard black-bronze offset backing plate.
- Keep `::after` as the main clipped black/gold plate, with less bright hover color.
- Keep the duplicated glitch label layer and make hover/focus slices visually distinct.
- Remove circular icon treatment from button symbols, especially history/account surfaces.
- Preserve all existing button ids, click handlers, Firebase/Auth flow, draft/history persistence, ARIA/focus-visible/skip-link, native dialog structure, reduced-motion path, 44 x 44 touch target floor, and Traditional Chinese copy.
- After editing, sync `public/worldforge-login.html`, run visual validation, and record the result here.

## Active Button Hotfix - Post-Change Record

Timestamp: 2026-05-27 Asia/Taipei.

Changed files:

- `public/index.html`
- `public/worldforge-login.html`
- `tests/visual/worldforge.spec.ts-snapshots/login-1366-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/login-390-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/workbench-390-chromium-win32.png`

What changed:

- Darkened the main SAO button plate so the project stays black/gold instead of bright amber.
- Increased the offset backing plate and gave it a hard black-bronze slab edge.
- Added inner right/bottom plate shadows so the `::before` plate reads as a displaced layer instead of a glow.
- Converted shared button glyphs from round medallions to clipped angular chips.
- Added right/bottom padding inside the Google-only auth action row so the login CTA underplate is no longer clipped by the auth panel.
- Kept `.sao-btn-tag` hidden globally; duplicate glitch labels still hydrate and render on hover/focus.
- Preserved existing ids, handlers, Firebase/Auth flow, draft/history persistence, ARIA/focus-visible/skip-link, reduced-motion handling, native dialog structure, and Traditional Chinese copy.

Validation:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `git diff --check`: passed; Windows line-ending warnings only.
- Manual hover screenshot: `output/playwright/sao-button-hotfix-login-hover-v2.png`.
- `npm run build`: passed.
- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- `npm run smoke:hosting`: passed.
- Production screenshot after deploy: `output/playwright/sao-button-hotfix-production-login.png`.

## S13 Effects Visibility Hotfix

Timestamp: 2026-05-28 Asia/Taipei.

Problem confirmed after user review:

- Login / auth ritual effects were visually too static.
- The S13 validation stabilization had set open auth panel elements to `animation: none`, which kept screenshots stable but suppressed the visible horizontal/vertical panel materialization.
- The previous cyber underplate offset was also too large on compact workbench buttons.

Safe scope before editing:

- Restore visible login materialization only for normal motion users through `body.login-modal-entering:not(.operational)`.
- Keep the `prefers-reduced-motion: reduce` block intact.
- Keep visual tests stable because their helper removes entering state / disables animations.
- Keep Firebase/Auth, button ids, draft/history, native dialog structure, ARIA, focus-visible, skip-link, and Traditional Chinese copy unchanged.

What changed:

- Re-enabled `panelMaterialize` on `.auth-panel`.
- Re-enabled staged `contentSlideUp`, `textGlow`, and `ctaWake` for auth header, seal strip, title, prompt, and action row.
- Kept mobile ritual stack animation and switched mobile auth panel from `animation: none` back to `panelMaterialize`.
- Reduced the cyber button backing plate offsets to avoid oversized gold slabs on login/workbench buttons.
- Restored auth header runtime copy to `AUTH_REQUIRED` / `AUTH STANDBY` to avoid the `GOOGLE_SIGN_IN` glyph being misread as `GDDGLE_SIGN_IN`.

Manual evidence:

- `output/playwright/s13-effects-login-enter-120ms.png` shows the panel mid-materialization with blur/brightness and partial vertical expansion.
- `output/playwright/s13-effects-login-enter-740ms.png` shows the panel settled with readable content.
- Computed style at 120ms: `animationName=panelMaterialize`, active 3D transform, blur, brightness, and saturate filters.

## S13 VFX / UX Recovery - Pre-Change Record

Timestamp: 2026-05-28 Asia/Taipei.

User correction:

- The requested Cyberpunk / SAO reference is about visible effects and interaction motion, not only static button shape.
- Normal-motion mode should keep animation visibly active; reduced-motion support must remain available for accessibility.
- Mobile output-area buttons are currently hard to read and feel randomly placed.
- Main loading, menu opening, login materialization, and button hover/focus need real, visible motion checks.
- Compare against the original `waydefu/-` repository for earlier spacing and practical reading scale.

Current problems confirmed before editing:

- `.analyze-ritual-btn.is-loading::after` reuses the same pseudo-element as the shared `.sao-btn::after` main plate, collapsing the loading button into a dark rectangular strip instead of a clipped SAO plate.
- Mobile `.analysis-dossier-head` keeps title and actions in the same horizontal header, making the output buttons crowd the right side on 390px.
- Result-section copy buttons become tiny right-side controls on mobile instead of clear full-width actions.
- Shared button plate colors still begin too bright for the black/gold manuscript palette.
- Desktop workbench grid rows use large fractional tracks, leaving excessive vertical air between title/copy and the draft field on some viewport heights.

Planned safe scope:

- Keep Firebase/Auth, draft/history persistence, button ids, native dialog structure, ARIA, focus-visible, skip-link, touch target floor, and Traditional Chinese copy intact.
- Preserve `prefers-reduced-motion: reduce`; only restore/enhance normal-motion effects.
- Darken the shared SAO button plate variables and remove stale cyan hero underplate styling.
- Move loading scan/glyph effects onto child elements so the main clipped plate remains visible.
- Make mobile output actions full-width, ordered, and readable.
- Tighten workbench vertical rhythm without reducing textarea/result usability.
- Re-run sync, visual update, a11y/check/build, then deploy only after screenshots confirm the fixes.

Post-change record:

- `public/index.html` remains the edited source of truth; `public/worldforge-login.html` was synced from it.
- Darkened shared `.sao-btn` primary, hover, danger, underplate, and glitch colors so buttons read as black/copper/gold instead of bright orange.
- Removed stale cyan hero CTA underplate styling.
- Restored primary button hover strike animation instead of suppressing it on `.primary-btn.sao-btn`.
- Fixed loading button layering: the loading scan now lives on `.btn-loading::after`, while `.sao-btn::after` remains the clipped main plate.
- Replaced the circular loading spinner with a CSS diamond glyph animation; no image/texture asset was introduced.
- Added normal-motion plate breathing/loading animation for the login CTA and main analyze CTA.
- Removed fragile fixed grid-row sizing from `.codex-panel`; draft and dossier height are now controlled by their own min-height rules so hidden rows cannot stretch the analyze button.
- Mobile output actions now stack as full-width readable buttons, and result-section copy controls are full-width under their headings.
- Mobile history/account panels use fixed floating panel placement; runtime open motion is driven through `Element.animate()` from `toggleHistory()` / `toggleAccount()` while reduced-motion users skip it.
- Compared against the original `waydefu/-` repository snapshot: the earlier version used practical compact content flow and smaller result controls; this pass restores a practical flow while keeping the current Great Sage visual system.

Manual screenshots reviewed:

- `output/playwright/audit-fixed-login-hover.png`
- `output/playwright/audit-fixed-mobile-workbench-after-grid.png`
- `output/playwright/audit-fixed-mobile-output-area-after-grid.png`
- `output/playwright/audit-fixed-mobile-loading-after-grid.png`

Validation:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14; updated login 1366, workbench 390, history drawer 1366, logout confirm 1366 snapshots.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `npm run build`: passed.
- `git diff --check`: passed; Windows line-ending warnings only.

## Red Lines

- Do not touch Firebase/Auth semantics unless explicitly requested.
- Do not touch draft/history persistence unless explicitly requested.
- Do not change existing button ids.
- Do not remove existing ARIA, focus-visible, skip-link, native dialog structure, or reduced-motion paths.
- Keep touch targets at least 44 x 44 CSS px.
- Keep WCAG 2.1 AA contrast, 200% zoom, and 320px reflow viable.
- Keep `prefers-reduced-motion` functional.
- Keep CLS under 0.1.
- For visual/front-end changes: edit `public/index.html`, then run `npm run sync:login-mother`.

## Validation Commands

Use the smallest necessary set for documentation-only edits, and the full set for frontend/runtime changes.

- Documentation only:
  - `git diff --check`
- Frontend / CSS / login / workbench / visual:
  - `npm run sync:login-mother`
  - `npm run test:visual:update`
  - `npm run check`
  - `npm run test:a11y`
  - `git diff --check`
- Backend / validation / quota / parser:
  - `npm run check`
  - `npm test`
  - `git diff --check`
- Build:
  - `npm run build`
- Deployment smoke after hosting deploy:
  - `npm run smoke:hosting`

## Current Visual Baselines

Worldforge visual snapshots:

- `tests/visual/worldforge.spec.ts-snapshots/login-1366-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/login-390-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/workbench-1366-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/workbench-390-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/history-drawer-1366-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/account-menu-1366-chromium-win32.png`
- `tests/visual/worldforge.spec.ts-snapshots/logout-confirm-1366-chromium-win32.png`

Snapshot tests strip scripts and hide WebGL for deterministic layout. They do not prove OAuth, real animation timing, audio, or live WebGL behavior by themselves.

## Current Documentation Timeline

- `docs/codex-s9-s10-execution-log.md`
  - S9 / S10 base implementation record.
- `docs/codex-s10.5-s10.6-execution-log.md`
  - S10.5 modal ritual and S10.6 all-button SAO work.
- `docs/codex-s10.7-sao-copy-button-icon-execution-log.md`
  - Copy and icon polish.
- `docs/s10.8-sao-cyber-buttons-modal-execution-log.md`
  - S10.8 cyber buttons and modal interactions.
- `docs/s10.9-mobile-sao-button-animation-layout-execution-plan.md`
  - Latest mobile spacing, button correction, dev.to article review, reference-image comparison, and validation.
- `docs/s11-font-webgl-execution-log.md`
  - S11 font hierarchy and WebGL enhancement execution record.
- `docs/project-scan-handoff-2026-05-26.md`
  - Broader risk scan and optimization backlog.

## Known Drift / Caution

- README has had stale lines in prior turns; verify against `public/index.html` before relying on old DOM ids or old copy.
- Current Three importmap in `public/index.html` uses `three@0.164.1`.
- Current analyze CTA text in the live DOM is `啟動手稿鑑定引擎`.
- `API_CONFIG.QUOTA_URL` points to `quotaPeek`, but repository scan previously found no local function source for it. Treat quota HUD / hosting smoke around quota as a known risk until verified.
- `functions/src/index.ts` currently keeps App Check enforcement disabled (`ENFORCE_APP_CHECK = false`).

## 2026-05-28 S13 VFX / Mobile UX Recheck

Pre-change confirmation:

- User rejected the prior button pass because the visible result still read as static bright plates, not an obvious animated system effect.
- Full-script local login verification previously exposed a risk where the auth panel could remain invisible if its materialization animation stuck at the initial hidden frame.
- Mobile output screenshots showed the dossier area wasting vertical space before the heading; root cause is `.analysis-dossier { white-space: pre-wrap; }` preserving HTML indentation whitespace.
- Mobile history/account panels opened over the workbench title area instead of presenting as a clear SAO-style floating panel.
- Button ripple feedback was visually buried under the pseudo-element plates because `.sao-ripple` sat behind `::before` and `::after`.

Planned changes:

- Make auth materialization fail-safe so the login panel remains visible even if WAAPI timing stalls.
- Remove preserved whitespace from the dossier container while keeping result body text wrapping intact.
- Darken shared button colors toward obsidian/copper/gold and add always-on normal-motion plate pulse/scan feedback without removing `prefers-reduced-motion`.
- Raise click ripple above the plates but below labels/glitch text.
- Keep mobile history/account panels as navigation dropdown panels; a centered fixed panel was tested and rejected because the workbench visual container constrained its placement.
- Re-run sync, visual/a11y/check/build, then deploy only after live screenshots confirm the fixes.

Post-change record:

- Auth panel materialization is fail-safe: the panel is visible at the first WAAPI keyframe, and `markLoginModalEntering()` no longer leaves the panel on a hidden CSS class if timing stalls.
- Shared SAO buttons now use darker obsidian/copper gradients, continuous normal-motion plate and underplate pulse, hover glitch/strike layers, and visible click ripple above the plates.
- `.analysis-dossier` no longer preserves indentation whitespace; result bodies and empty states keep readable wrapping where needed.
- Mobile output actions remain stacked and full-width, but button height and result body rhythm were tightened.
- Mobile history/account panels now open as stable dropdown panels under the workbench navigation, avoiding title/content overlap.
- Synced `public/worldforge-login.html` from `public/index.html`.

Manual screenshots reviewed:

- `output/playwright/audit-login-timeout-diagnostic.png`
- `output/playwright/audit-live-mobile-workbench-after-uxfix.png`
- `output/playwright/audit-live-mobile-output-after-uxfix.png`
- `output/playwright/audit-live-mobile-history-dropdown-after-uxfix.png`

Validation:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14; updated mobile login and mobile workbench snapshots.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `npm run build`: passed.
- `git diff --check`: passed; Windows line-ending warnings only.

Production follow-up:

- A cache-busted production screenshot after deploy still showed the login frame with blank inner content.
- Root cause: staged auth-panel child animations started from `opacity: 0` with `fill: backwards`; if production timing stalls or a frame is skipped, child copy and CTA can remain transparent while the panel frame is visible.
- Hotfix plan: make child staging animation decorative only, force children visible before animation, use visible brightness/translate frames instead of hidden frames, and remove backwards fill.
- Post-hotfix expectation: login text and CTA remain visible at all times; the materialization effect reads as a quick scan/brightness pass instead of relying on hidden-to-visible opacity.

## Next-Step Checklist

Before any new UI task:

1. Read this file and the latest task-specific execution log.
2. Run `git status --short`.
3. Confirm whether the task is documentation-only, frontend, backend, deploy, or smoke.
4. Preserve red lines.
5. Record intended changes in docs before editing when the user requests persistent handoff safety.
6. Edit `public/index.html` first for UI work.
7. Run `npm run sync:login-mother`.
8. Run the relevant validation commands.
9. Update this map or the task log with what changed and what passed.
