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

Post-deploy visual correction:

- Cache-busted deployed hover screenshot confirmed the new glitch/RGB animation is live, but it also exposed a rectangular focus-visible outline from the global `button:focus-visible` rule.
- Correction scope:
  - keep keyboard focus visible;
  - remove the host-level rectangular outline/box-shadow only for `.sao-btn`;
  - move the focus indication into the clipped `.sao-btn::after` plate via inset glow so it matches the SAO/cyber button shape.

Post-correction record:

- Updated final `.sao-btn:focus-visible` override to remove the global rectangular outline and host box-shadow.
- Disabled the old host-level `saoFocusPulse` animation on `.sao-btn:focus-visible`; that legacy animation still wrote rectangular `box-shadow` even after the outline was removed.
- Added the focus glow to the clipped `.sao-btn::after` plate with inset highlighting, preserving keyboard focus visibility without a rectangular hover/focus frame.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation after focus correction:

- `npm run sync:login-mother`: passed.
- `git diff --check`: passed.
- `npm run check`: passed.
- `npm run test:a11y`: 3 passed, axe impact counts `{}`.
- `npm run test:visual:update`: 14 passed.
- `npm run build`: passed.

Validation after disabling legacy host focus pulse:

- `npm run sync:login-mother`: passed.
- `git diff --check`: passed.
- `npm run check`: passed.
- `npm run test:a11y`: 3 passed, axe impact counts `{}`.
- `npm run test:visual:update`: 14 passed.
- `npm run build`: passed.

Final deployment verification:

- Commit deployed after this correction: `b3dfcc3 fix(s13.1): suppress legacy SAO focus pulse shadow`.
- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- `npm run smoke:hosting`: passed.
- Cache-busted deployed HTML check passed:
  - `saoButtonRgbSplit 1.68s` present;
  - `.sao-btn:focus-visible` host animation disabled;
  - clipped focus inset glow present;
  - login materialize `clipPath` WAAPI frame present.
- Deployed hover screenshot:
  - `output/playwright/s13-1-reference-rebuild/deployed-button-hover-final-0900ms.png`
  - `output/playwright/s13-1-reference-rebuild/deployed-button-hover-final-1780ms.png`
- Runtime computed deployed hover state:
  - host `box-shadow: none`;
  - host animation `none 0s`;
  - `saoCyberGlitch 1.84s`;
  - `saoButtonRgbSplit 1.68s`.

## S13.1 Button Shadow Removal Follow-Up

Timestamp: 2026-05-29 Asia/Taipei.

Pre-change confirmation:

- Latest user request: remove the shadow-like thing behind all buttons.
- The visible rear shadow is primarily the `.sao-btn::before` displaced underplate, plus `saoUnderplateDrift` / `saoUnderplateJolt` and state box-shadows.
- Scope:
  - hide the `.sao-btn::before` underplate for all SAO buttons;
  - stop all underplate hover/focus/boot animations from drawing anything;
  - remove SAO button host shadows in hover/focus/active/danger states;
  - remove the login CTA padding that existed only to reserve space for the old underplate;
  - keep the main clipped plate, scan/glitch/RGB text layers, button ids, Firebase/Auth, draft/history, native dialog, ARIA, focus-visible, reduced-motion, and Traditional Chinese copy unchanged.

Implementation update:

- Removed the old visible rear slab by forcing `.sao-btn::before` and the higher-specificity workbench/account/history/dossier button variants to `display: none`, `opacity: 0`, `box-shadow: none`, `filter: none`, and `animation: none`.
- Removed underplate hover/focus animation effects from those same button variants.
- Removed the danger override window button's old `0 18px 40px` outer shadow.
- Removed login CTA right/bottom padding that only existed to reserve room for the old displaced underplate.
- `npm run sync:login-mother`: passed after edits, updating `public/worldforge-login.html`.

Manual visual / computed evidence:

- Desktop screenshot: `output/playwright/s13-1-shadow-removal/login-button-no-shadow.png`.
- Mobile screenshot: `output/playwright/s13-1-shadow-removal/mobile-login-button-no-shadow.png`.
- Runtime computed check: 15 `.sao-btn` elements inspected; offenders = 0 for host outer `box-shadow`, visible `::before`, `::before` shadow, `::before` filter, and `::before` animation.

Validation after implementation:

- `git diff --check`: passed with existing LF/CRLF working-copy warnings only.
- `npm run check`: passed.
- `npm run test:a11y`: 3 passed, axe impact counts `{}`.
- `npm run test:visual:update`: 14 passed; regenerated `login-1366-chromium-win32.png` and `login-390-chromium-win32.png` because the login CTA rear underplate was removed.
- `npm run build`: passed.
- Commit: `d978992 fix(s13.1): remove SAO button rear shadows`.
- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- `npm run smoke:hosting`: passed.
- Cache-busted deployed HTML check passed:
  - `--sao-cyber-underplate: transparent;` present;
  - final `.sao-btn::before` removal block present;
  - `.override-window .danger-btn` keeps `box-shadow: none;`;
  - Google-only auth action padding stays `0`.

## S13.2 Animation Visibility Recovery

Timestamp: 2026-05-29 Asia/Taipei.

Pre-change confirmation:

- Latest user correction: do not shut down; button effects still read as weak, core/page/menu animations are not visually obvious, and mobile menu/dialog panels can overflow the viewport.
- Root-cause notes:
  - Formal visual tests disable animations, so a passing screenshot baseline does not prove animation quality.
  - The previous rear-shadow removal correctly removed `.sao-btn::before`, but the remaining hover effect relied too much on text-only RGB split. It needs visible horizontal button-slice distortion that does not reintroduce the rear shadow.
  - Touch devices do not have reliable hover, so button effects must also trigger on pointer/tap focus with a short `.is-glitching` state.
  - Mobile system menu and central panels need viewport-bounded `left/right/top/bottom` rules instead of narrow centered transforms that can exceed the visible Chrome viewport.
- Reference notes from user-supplied material:
  - Jhey Tompkins' Cyberpunk 2077 button article describes the core technique as duplicated hidden text/layers with `clip-path` slices and `transform` shifts on hover, plus decorative content hidden from screen readers.
  - Warren Uhrich's SAO-UI reference keeps SAO menus readable through clear panel staging and item-level motion rather than relying on static glow alone.
- Planned safe scope:
  - keep button ids, Firebase/Auth, draft/history, native dialog semantics, ARIA, focus-visible, reduced-motion, and Traditional Chinese copy intact;
  - keep the user-requested removal of the rear shadow/underplate;
  - strengthen hover/focus/tap visual glitch layers using CSS/DOM only;
  - strengthen menu materialization keyframes and mobile fit rules;
  - validate with real screenshots in addition to tests.

Implementation update:

- Button effects:
  - kept `.sao-btn::before` disabled so the rear shadow/underplate stays removed;
  - strengthened `.sao-btn-glitch` into a full in-button horizontal slice layer with copper/black plate interference, cyan/red RGB split, and scanline slice flashes;
  - added `.is-glitching` so pointer/tap/keyboard activation on mobile triggers the same effect as hover/focus;
  - kept host `box-shadow: none` for the affected buttons.
- Menu/dialog effects and mobile fit:
  - strengthened `saoSystemMenuClipResolve` with opacity/filter staging so system menu opening is not only a static clip change;
  - added `saoMenuSignalFlicker` for visible menu scan/signal motion;
  - changed mobile system menu to viewport-bounded `left/right/top` layout with no centered translate;
  - changed mobile account/history panels and override/logout dialogs to viewport-bounded rules;
  - added mobile-specific override dialog materialize/dissolve keyframes to avoid `translate(-50%, -50%)` overflow.
- JavaScript:
  - `hydrateSaoButton` now binds a one-time pointer/key activation handler that applies `.is-glitching` for 980ms;
  - `playPanelOpen` no longer applies desktop centered transforms on mobile panels.

Manual visual / computed evidence:

- Desktop button hover screenshot: `output/playwright/s13-2-animation-recovery/desktop-button-hover-520ms.png`.
- Mobile system menu screenshot: `output/playwright/s13-2-animation-recovery/mobile-system-menu-fit.png`.
- Mobile logout dialog settled screenshot: `output/playwright/s13-2-animation-recovery/mobile-logout-dialog-fit-settled.png`.
- Runtime mobile system menu rect at 390x844: `left=10`, `right=380`, `top=82`, `bottom=286`, `overflowX=false`, `overflowY=false`, animation `saoSystemMenuClipResolve`.
- Runtime mobile logout dialog rect at 390x844: `left=10`, `right=380`, `top=10`, `bottom=304.48`, `overflowX=false`, `overflowY=false`, animation `overrideMaterializeMobile`.

Validation after implementation:

- `git diff --check`: passed with existing LF/CRLF working-copy warnings only.
- `npm run check`: passed.
- `npm test`: 23 passed.
- `npm run test:visual`: 14 passed.
- `npm run build`: passed.
- `npm run test:a11y`: 3 passed, axe impact counts `{}`. The first attempt was invalid because it was launched in parallel with another Playwright suite and both tried to start `127.0.0.1:5173`; the standalone rerun passed.
- Commit: `516b279 fix(s13.2): restore visible SAO motion and mobile panel fit`.
- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- `npm run smoke:hosting`: passed.
- Cache-busted deployed HTML check passed:
  - `saoButtonPanelGlitch` present;
  - `saoButtonSliceFlash` present;
  - `.is-glitching` tap/focus state present;
  - `saoMenuSignalFlicker` present;
  - `overrideMaterializeMobile` present;
  - mobile `left/right` safe-area bounded fit rules present.

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

## S13.1 Animation Evidence Follow-Up

Timestamp: 2026-05-28 Asia/Taipei.

Pre-change confirmation:

- Shutdown was checked with `shutdown /a`; Windows reported no shutdown was in progress.
- Playwright screenshots must be captured with `animations: "allow"` for animation evidence. Earlier static screenshots and default screenshots can fast-forward finite animations, so they are not enough for visual acceptance.
- Real time-frame captures with `animations: "allow"` confirmed:
  - login modal materializes from a thin horizontal line into the full panel;
  - system menu opens with runtime WAAPI expansion over 2.8s;
  - workbench reveal starts from collapsed state and settles by 4.2s.
- Remaining issue before editing:
  - `.sao-btn .sao-btn-rgb` runs only one iteration on hover/focus, so the 2077-style RGB separation disappears if the pointer stays on the button.
  - `.sao-btn:hover` still adds a rectangular `box-shadow`, which reads as a hover rectangle instead of a clipped SAO/cyber glitch surface.

Planned safe scope:

- Keep Firebase/Auth, draft/history, button ids, native dialog, ARIA, focus-visible, skip-link, reduced-motion, 44x44 touch targets, and Traditional Chinese copy unchanged.
- Change only shared `.sao-btn` normal-motion hover/focus behavior:
  - remove hover-only rectangular box-shadow;
  - keep focus-visible affordance for keyboard users;
  - make RGB separation and scan layer loop while hovered/focused;
  - keep dark black/gold/copper palette.

Post-change record:

- Removed the hover-only rectangular `box-shadow` from `.sao-btn:hover`.
- Kept keyboard `:focus-visible` feedback, but scoped it separately from hover.
- Changed hover/focus `.sao-btn-scan::before` from one-shot to infinite scan.
- Changed hover/focus `.sao-btn-glitch` from a slower 2.4s cycle to a more visible 1.6s loop.
- Changed hover/focus `.sao-btn-rgb` from one-shot to infinite RGB slice separation.
- No Firebase/Auth, data, button id, native dialog, ARIA, reduced-motion, touch target, or Traditional Chinese copy changes were made.

Animation evidence:

- Live-frame screenshots with `animations: "allow"`:
  - `output/playwright/s13-1-animation-liveframes/login-live-0120ms.png`
  - `output/playwright/s13-1-animation-liveframes/login-live-0900ms.png`
  - `output/playwright/s13-1-animation-liveframes/menu-live-0120ms.png`
  - `output/playwright/s13-1-animation-liveframes/menu-live-1800ms.png`
  - `output/playwright/s13-1-animation-liveframes/workbench-live-0160ms.png`
  - `output/playwright/s13-1-animation-liveframes/workbench-live-2900ms.png`
- Button follow-up screenshots after the hover fix:
  - `output/playwright/s13-1-animation-liveframes-after-button-fix/button-fixed-hover-0080ms.png`
  - `output/playwright/s13-1-animation-liveframes-after-button-fix/button-fixed-hover-2500ms.png`
  - `output/playwright/s13-1-animation-liveframes-after-button-fix/button-fixed-hover-3600ms.png`
- Computed hover result after the fix:
  - `box-shadow: none`
  - `.sao-btn-rgb`: `saoButtonRgbSplit`, `infinite`
  - `.sao-btn-glitch`: `saoCyberGlitch`, `infinite`
  - `.sao-btn-scan::before`: `saoButtonDarkScan`, `infinite`

Validation after the fix:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `npm run build`: passed.
- `git diff --check`: passed; Windows line-ending warnings only.
- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- `npm run smoke:hosting`: passed.
- Cache-busted deployed HTML check: passed for hover `box-shadow: none`, RGB infinite loop, glitch 1.6s infinite loop, and scan infinite loop.

## S13.1 Animation Correctness Follow-Up 2

Timestamp: 2026-05-28 Asia/Taipei.

Pre-change confirmation:

- User acceptance is still not met; continue editing until the effect reads correctly.
- Additional code review found `AnimationTimeline.playAuthPanelMaterialize()` still running a short 1.55s subtle WAAPI on top of the intended 3.4s CSS materialization, making the login ritual visually too weak in the real app.
- Button hover was improved, but the underplate is still mostly ambient drift during `body.boot-complete`; hover/focus needs an explicit displaced slab jolt, not only scan/RGB overlays.
- The desired button behavior is effect-first:
  - dark black/gold/copper palette;
  - no rectangular hover box;
  - visible offset backing plate;
  - repeated horizontal glitch slices;
  - RGB/text split that stays aligned to the main label and remains visible while hovered.

Planned safe scope:

- Replace the weak login WAAPI frames with the full horizontal-line to vertical-panel materialization.
- Make button underplate jolt during hover/focus.
- Make hover/focus text split and RGB slices more frequent and aligned.
- Keep Firebase/Auth, draft/history, existing button ids, native dialog, ARIA, focus-visible, skip-link, reduced-motion, touch targets, and Traditional Chinese copy intact.

Post-change record:

- Replaced `AnimationTimeline.playAuthPanelMaterialize()` with the full 3.4s panel materialization:
  - starts as a bright horizontal line;
  - widens first;
  - vertically unfolds into the full auth panel;
  - content resolves in staggered stages after the frame is visible.
- Added `saoUnderplateJolt` and bound it to `.sao-btn:hover::before` / `:focus-visible::before`, including `body.boot-complete` override, so hover has a visible displaced backing slab instead of passive drift.
- Changed hover/focus main plate strike to infinite.
- Strengthened `saoButtonRgbSplit` so RGB slices stay visible through the loop and shift farther horizontally.
- Strengthened `saoCyberGlitch` opacity and timing so horizontal slices recur more often.
- Added label-level `saoLabelGlitch` on hover/focus for `.sao-btn-label`, `.btn-label`, and `.nav-label`.
- Added `saoSystemMenuClipResolve` so the system menu itself clips from a line to a panel while the WAAPI transform opens it.
- Synced `public/worldforge-login.html` from `public/index.html`.

Animation evidence:

- Follow-up live-frame screenshots:
  - `output/playwright/s13-1-animation-correctness-2/button-hover-0650ms.png`
  - `output/playwright/s13-1-animation-correctness-2/button-hover-2500ms.png`
  - `output/playwright/s13-1-animation-correctness-2/menu-0120ms.png`
  - `output/playwright/s13-1-animation-correctness-2/menu-0820ms.png`
  - `output/playwright/s13-1-animation-correctness-2/menu-1800ms.png`
- Computed hover result:
  - `box-shadow: none`
  - `::before`: `saoUnderplateJolt`, `infinite`
  - `::after`: `saoButtonStrike`, `infinite`
  - `.sao-btn-rgb`: `saoButtonRgbSplit`, `infinite`
  - `.sao-btn-glitch`: `saoCyberGlitch`, `infinite`
  - `.sao-btn-label`: `saoLabelGlitch`, `infinite`

Validation after follow-up 2:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `npm run build`: passed.
- `git diff --check`: passed; Windows line-ending warnings only.
- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- `npm run smoke:hosting`: passed.
- Cache-busted deployed HTML check: passed for `saoUnderplateJolt`, `saoSystemMenuClipResolve`, full login WAAPI materialization frames, visible RGB split opacity, and label glitch.

## S13.1 Reference Rebuild Follow-Up 3

Timestamp: 2026-05-28 Asia/Taipei.

Pre-change confirmation after web review:

- The dev.to Cyberpunk 2077 reference is structurally simple:
  - button is transparent and positioned;
  - `::before` is the displaced shadow/backing plate;
  - `::after` is the main plate;
  - a duplicate glitch text layer sits above the main label;
  - `clip-path` keyframes cut horizontal slices and translate them left/right.
- Previous implementation still had the main label above the glitch layer in the late override, so the visible effect could read like a lower decorative strip instead of text slicing.
- The project needs the reference behavior, recolored to black/gold/copper, not more static ornament.

Planned safe scope:

- Reorder SAO button layers so glitch/RGB copy text layers sit above the main label.
- Add low-frequency ambient glitch in normal motion so effects are visible even without hover.
- Keep hover/focus as the high-frequency 2077-style glitch state.
- Keep Firebase/Auth, draft/history, button ids, native dialog, ARIA, focus-visible, skip-link, reduced-motion, touch target, and Traditional Chinese copy intact.

## S13.1 Reference Rebuild Follow-Up 4

Timestamp: 2026-05-29 Asia/Taipei.

Pre-change confirmation:

- Web reference re-check: the 2077 button effect is not a bright hover state. The visible behavior must come from a translated underplate, a clipped main plate, and duplicate text layers cut into horizontal glitch slices.
- Current local frame capture shows the layer order is now correct (`scan` z=3, normal label z=4, glitch z=8, rgb z=9), but the visual still reads too much like a bottom scan strip at some frames.
- Current login/workbench animation rules exist, but several content keyframes start at opacity `1`, making the sequence look already present instead of materializing.
- Fix scope for this pass:
  - strengthen the button glitch so hover/focus keeps visible duplicate text and RGB offsets for the full pointer hold;
  - make login modal and workbench entry use clip-path horizontal generation followed by vertical unfold;
  - make staged content enter from opacity `0` with blur/scan, so the effect is visible without changing copy, ids, Firebase/Auth, draft, or history contracts.

Post-change record:

- Rebuilt the SAO button hover/focus timing again:
  - `saoCyberGlitch` now keeps stronger duplicate text slices visible instead of disappearing into a weak lower strip;
  - `saoButtonRgbSplit` now uses larger left/right offsets and a longer loop, so the pointer-hold state keeps showing RGB/text slicing;
  - the shared `.sao-btn` final override now raises the local glitch shift and keeps the displaced underplate moving longer.
- Reworked modal/workbench materialization:
  - `panelMaterialize` now starts as a center horizontal line, expands into a thin rail, then unfolds vertically into the full login panel;
  - `deckMaterialize`, `contentSlideUp`, `ctaWake`, mobile login keyframes, and `saoWindowSettle` now use opacity `0` starts plus clip-path unfold states;
  - the GSAP workbench handoff timeline now also animates `clipPath` and clears it after completion.
- Deleted no data logic. Firebase/Auth, draft/history data flow, button ids, native dialog structure, ARIA, focus-visible, skip-link, reduced-motion support, and 44px touch targets remain in place.

Screenshot evidence:

- Button hover frames:
  - `output/playwright/s13-1-reference-rebuild/button-hover-strong-0080ms.png`
  - `output/playwright/s13-1-reference-rebuild/button-hover-strong-0900ms.png`
  - `output/playwright/s13-1-reference-rebuild/button-hover-strong-1780ms.png`
- Login materialize frames:
  - `output/playwright/s13-1-reference-rebuild/login-materialize-paused-0180ms.png`
  - `output/playwright/s13-1-reference-rebuild/login-materialize-paused-0620ms.png`
  - `output/playwright/s13-1-reference-rebuild/login-materialize-paused-2080ms.png`
- Workbench materialize frames:
  - `output/playwright/s13-1-reference-rebuild/workbench-materialize-paused-0280ms.png`
  - `output/playwright/s13-1-reference-rebuild/workbench-materialize-paused-1700ms.png`
  - `output/playwright/s13-1-reference-rebuild/workbench-materialize-paused-4080ms.png`

Validation after this pass:

- `npm run sync:login-mother`: passed.
- `git diff --check`: passed.
- `npm run check`: passed.
- `npm run test:visual:update`: 14 passed.
- `npm run test:a11y`: first run was blocked by a stale local 5173 webServer; rerun after the port released passed 3/3 with axe impact counts `{}`.
- `npm run build`: passed.

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

## 2026-05-28 S13 Final Animation Completion

Pre-change confirmation:

- User confirmed all animation work should be completed, recorded before and after, then the machine may shut down.
- Existing production checks showed the login content hotfix is deployed, but several visible animation hooks remain incomplete or too subtle.
- Specific gaps found in `public/index.html` before editing:
  - `markLoginModalEntering()` resets `login-modal-entering` but does not re-add it, so the CSS login materialization path can be skipped.
  - Workbench CSS materialization runs only when GSAP is unavailable; production normally loads GSAP, so the visible deck sweep can be missed.
  - History entries explicitly use `animation: none`, leaving the drawer list static.
  - Button underplates pulse by brightness only; the offset slab does not visibly move enough to read as the requested Cyberpunk-style effect.
  - Analysis progress rails have a glow dot but no clear system-scan sweep.

Planned changes:

- Re-enable login modal entering class while keeping the fail-safe visible-first keyframes.
- Run workbench materialization CSS even when GSAP is present, with visible staged deck/session/panel/action/dossier entrance.
- Restore menu/list entrance motion for account and history panels.
- Make SAO button underplates physically shift during the ambient pulse and add a darker scan layer inside the main plate.
- Add non-image CSS scan motion to analysis progress bars.
- Preserve reduced-motion handling, native dialog structure, ARIA, Firebase/Auth/draft/history contracts, and 44px touch targets.

Post-change record:

- `markLoginModalEntering()` now re-adds `login-modal-entering`, so login modal materialization CSS and WAAPI both fire while keeping visible-first fail-safes.
- Workbench materialization class now runs whenever motion is allowed, including production where GSAP is loaded.
- Workbench entrance now stages session nav, codex panel, analyze CTA, and dossier surfaces.
- History entries now use `historyEntryIn`; account menu buttons receive a short visible entrance.
- SAO button main plates gained a dark scan layer; underplates now animate their actual offset position instead of brightness only.
- Analysis progress bars now use CSS-generated rail scans; no image/texture asset was added.
- `public/worldforge-login.html` was synced from `public/index.html`.

Validation after change:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `npm run build`: passed.
- `git diff --check`: passed; Windows line-ending warnings only.

Deploy / production audit:

- Commit: `a82e266 fix(s13/animations): finish visible ritual motion`.
- Firebase Hosting deploy: passed.
- `npm run smoke:hosting`: passed.
- Production static audit against cache-busted hosted HTML confirmed:
  - `@keyframes saoRailScan` deployed.
  - `login-modal-entering` trigger deployed.
  - `workbench-materializing` no longer depends on GSAP absence.
  - `historyEntryIn` deployed for history rows.
  - underplate offset shift deployed.
- Computed animation audit confirmed:
  - Login panel: `panelMaterialize`.
  - Login button underplate: `saoUnderplatePulse`.
  - Login button plate: `saoHeroPlateBreath`.
  - Workbench deck: `deckMaterialize`.
  - Workbench session: `contentSlideUp`.
  - Workbench panel/dossier: `saoWindowSettle`.
  - Mobile output progress rail: `saoRailScan` plus `saoLeadingPulse`.
  - Mobile output action buttons remain single-column, 294px wide and 46px high in the 390px viewport.
- Screenshots reviewed:
  - `output/playwright/production-final-static-login-animation.png`
  - `output/playwright/production-final-static-workbench-animation.png`
  - `output/playwright/production-final-static-mobile-output-animation.png`

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

## 2026-05-28 S13.1 Final Animation Rework

Pre-change confirmation:

- User explicitly rejected the prior S13/S10.9 visual result: buttons still read as bright plates or clipped bars, not Cyberpunk 2077-style glitch-offset effects.
- Old assumption corrected: three visual layers are not enough. The required button model is five layers: black-copper offset underplate, black-gold main plate, dark scan layer, hover/focus horizontal glitch slice layer, and text/RGB split layer.
- Old assumption corrected: passing Playwright, a11y, build, and deploy checks does not mean the user-facing animation standard is met.
- Old assumption corrected: existing account/history dropdowns are not the requested SAO system menu. Non-copy workbench actions must move into one system-menu flow.
- Old assumption corrected: the central `.arcane-lens` visual reads as a pasted foreground graphic and must be removed or demoted so it cannot compete with UI effects.
- Confirmed current tracked worktree is clean before edits; only untracked `output/` exists.

Implementation plan before editing:

- Delete or replace old CSS/JS when it blocks the target effect, instead of layering compatibility fixes over it.
- Remove `.primary-btn`, `.secondary-btn`, and `.ghost-btn` rectangular hover/bright sweep interference from `.sao-btn` controls.
- Replace too-short login/workbench materialization timing with visible ritual-length sequences: login about 3.4s, auth handoff about 4.6s, workbench about 4.2s, menu open about 2.8s.
- Keep all existing button ids and data contracts stable: Firebase/Auth, drafts, history, native login dialog, ARIA, focus-visible, skip-link, reduced-motion fallback, and 44x44 touch targets.
- Update this section after each implementation group with concrete changes, removed legacy logic, validation commands, and screenshot paths.

Implementation group 1, old-interference cleanup and final motion architecture:

- Changed `public/index.html` so `.primary-btn`, `.secondary-btn`, and `.ghost-btn` legacy hover/shine rules no longer apply to `.sao-btn`. This removes the old rectangular hover frame path from SAO buttons.
- Replaced the button runtime hydration with five concrete layers for every `.sao-btn`: underplate pseudo-layer, main plate pseudo-layer, `.sao-btn-scan`, `.sao-btn-glitch`, and `.sao-btn-rgb`.
- Added a final S13.1 CSS override for darker black-copper / black-gold buttons, visible offset slab motion, dark scan sweep, hover/focus glitch slices, and RGB text split. The old bright yellow/orange look is no longer the final button source.
- Removed the `.arcane-lens` DOM node from the live scene so the center no longer shows the pasted-looking foreground lens. The old CSS selectors remain inert until a later cleanup pass can delete them safely.
- Added runtime SAO system-menu construction: one `systemMenuToggle` is inserted into the workbench nav, then existing `historyToggle`, `accountToggle`, `reanalyzeButton`, and `clearDraftButton` are moved into `systemMenuPanel` without changing their ids.
- Converted history and account surfaces to fixed central panels, with system-menu open timing at about 2.8s and close timing at about 1.4s.
- Extended visible timing: login panel about 3.4s, auth handoff about 4.6s, workbench reveal about 4.2s, logout/override modal open about 2.8s.
- Mobile overrides now keep the system menu within the 390px viewport, increase workbench/output text readability, keep touch targets at 50px where possible, and make output action buttons full-width rather than covering text.
- Removed legacy early-hide behavior by delaying auth handoff display cleanup until after collapse timing and by keeping `workbench-materializing` active for the full reveal duration.

Removed old logic:

- `.sao-btn` no longer inherits the `.primary/.secondary/.ghost` rectangular shine path.
- The center `.arcane-lens` HTML has been deleted from the rendered document.
- Workbench history/account/reanalyze/clear controls no longer stay in nav/dossier layout space after initialization; they are moved into the SAO system menu.

Current risk before validation:

- Runtime DOM relocation must be verified in browser because the initial HTML still contains the original buttons before JavaScript moves them.
- The new system-menu WAAPI timing and CSS item stagger may need visual tuning after screenshots.
- `public/worldforge-login.html` has not been synced yet in this phase.

Implementation group 2, validation-driven corrections:

- Screenshot review found the mobile system menu was anchored at `left: 50%` without a matching `translateX(-50%)`, causing the menu to extend off the right side of a 390px viewport. Fixed the mobile transform and the WAAPI base transform.
- Screenshot review found the desktop system menu first item was too high and could hide behind the top HUD. Moved the desktop menu lower and narrowed it to 360px so the `historyToggle`, `accountToggle`, and `clearDraftButton` are all visible.
- Added static visual-test support for the runtime system-menu relocation because the baseline helper strips scripts. `tests/visual/helpers.ts` now creates the same system menu and hydrates the new scan/rgb button layers for screenshots.
- `public/worldforge-login.html` was resynced from `public/index.html` after the final CSS corrections.

Validation after S13.1 implementation:

- `npm run sync:login-mother`: passed.
- `npm run test:visual:update`: passed, 14/14. Updated workbench/history/account snapshots for the new system-menu layout.
- `npm run check`: passed.
- `npm run test:a11y`: passed, 3/3, axe impact counts `{}`.
- `npm run build`: passed.
- `git diff --check`: passed; Windows line-ending warnings only.

Animation duration audit:

- Login modal materialization: about 3.4s.
- Auth handoff: about 4.6s.
- Workbench reveal: about 4.2s.
- SAO system menu open: about 2.8s.
- SAO system menu close: about 1.4s.
- Logout / override modal open: about 2.8s.
- Button hover/focus glitch layer: 2.4s loop with 1.18s RGB split burst.

Screenshot review paths:

- Desktop workbench: `output/playwright/s13-1-review-desktop-workbench.png`.
- Desktop button hover: `output/playwright/s13-1-review-desktop-button-hover.png`.
- Desktop system menu: `output/playwright/s13-1-review-desktop-system-menu.png`.
- Desktop history modal: `output/playwright/s13-1-review-desktop-history-modal.png`.
- Desktop logout modal: `output/playwright/s13-1-review-desktop-logout-modal.png`.
- Mobile workbench/output: `output/playwright/s13-1-review-mobile-workbench.png`.
- Mobile system menu: `output/playwright/s13-1-review-mobile-system-menu.png`.

Mobile audit:

- 390px viewport body scroll width: 390px, no horizontal overflow in the reviewed state.
- Mobile system menu rect: x=12, width=366, within the viewport.
- Output body font size: about 17.3px.
- Visible action buttons reviewed at 44px or taller; most mobile controls are 48-52px.

Remaining risk before deploy:

- The screenshots are browser-rendered static states with scripts stripped for deterministic review; production runtime still needs deploy smoke and cache-busted verification.

Deploy / production verification:

- `firebase deploy --only hosting --project project-7276420283723642146`: passed.
- Hosting URL: `https://project-7276420283723642146.web.app`.
- `npm run smoke:hosting`: passed.
- Cache-busted production HTML verification passed:
  - Five-layer button hydration markers exist: `sao-btn-scan`, `sao-btn-glitch`, `sao-btn-rgb`, `sao-btn-tag`.
  - System menu runtime exists: `ensureSystemMenu()` and `systemMenuPanel`.
  - Mobile centering fix exists: `translateX(-50%)` and `saoSystemMenuDissolveMobile`.
  - Live DOM no longer contains `<div class="arcane-lens">`.
