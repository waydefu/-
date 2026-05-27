# S11 字體 9 層與 WebGL 強化執行紀錄

Last updated: 2026-05-27 Asia/Taipei

## Pre-Edit Confirmation

- Baseline commit created before S11: `2e0737c chore(s10.9/handoff): preserve current ui baseline`.
- Source of truth remains `public/index.html`; `public/worldforge-login.html` must be regenerated with `npm run sync:login-mother`.
- Red lines confirmed before edits: do not change Firebase/Auth semantics, draft/history persistence, existing button ids, native dialog structure, ARIA, focus-visible, skip-link, reduced-motion paths, 44 x 44 touch target, WCAG AA contrast, 200% zoom, 320px reflow, CLS < 0.1.
- S11 will be committed as 8 ordered commits after the baseline preservation commit.

## Commit Plan

1. `feat(s11/type): 9-tier font hierarchy`
2. `feat(s11/bloom-layer): selective bloom mechanism`
3. `feat(s11/bloom-enable): enable layer on hero CTA`
4. `feat(s11/ca): chromatic aberration pass`
5. `feat(s11/link-start-shader): polar rainbow tunnel`
6. `feat(s11/link-start-trigger): on auth handoff`
7. `feat(s11/glass-material): MeshPhysicalMaterial backplate`
8. `feat(s11/glass-integrate): show/hide on dialog`

## Phase A - Before

- Current typography uses a smaller shared `--text-btn` and `--text-hero` token.
- Several Chinese and English labels share letter spacing rules, causing Chinese text to inherit display-style tracking in some compact regions.
- Status elements update by direct `textContent` assignment in multiple paths, so aria-live visual feedback is inconsistent.

## Phase A - Completed

- Implemented 9-tier text tokens in `public/index.html`: nano, HUD, status, body, Chinese button, English button, input, core, section, Chinese hero, English hero.
- Added explicit Chinese and English tracking tokens so Traditional Chinese interface copy keeps `letter-spacing: 0`, while English HUD/decorative labels retain controlled tracking.
- Reworked login title, workbench title, HUD labels, session badge, buttons, textarea, result sections, history previews, and status text to use the tiered tokens.
- Added `setLiveStatus()` and routed `#ritualStatus`, `#operationalStatus`, and `#sessionSyncState` status changes through it for short aria-live visual feedback without changing the Traditional Chinese copy.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run test:visual:update` passed: 14/14.
- `npm run check:frontend` passed.

Screenshot review:

- `login-1366`: login modal title, copy, and Google button remain centered and readable; black-gold button underplate offset is visible.
- `workbench-1366`: workbench title, nav labels, textarea, and CTA align without overlap.
- `login-390` / `workbench-390`: mobile reflow remains single-column with no horizontal overflow; larger text remains contained.

Risk:

- Medium: Playwright baselines changed because typography tokens affect every major surface.
- Low: status brightness flash is a visual-only class and does not change ARIA semantics.

## Phase B1 - Before

- Current WebGL pipeline applies `UnrealBloomPass` directly inside the main `EffectComposer`, so bright non-system geometry can bloom together with intended luminous UI elements.
- The S11 plan and `sao.txt` reference recommend selective bloom with a dedicated layer, temporary dark-material masking, and a final additive mix pass.
- Confirmed edit scope before changes: post-processing only in `public/index.html`; no Firebase/Auth/draft/history logic and no DOM ids are changed.

## Phase B1 - Completed

- Added `BLOOM_SCENE` and a dedicated `THREE.Layers` bloom mask for the post-processing pipeline.
- Split bloom into `bloomComposer` plus the original main `composer`, then mixed the bloom render target back through `selectiveBloomCompositeShader`.
- Added temporary dark-material masking for non-bloom meshes, lines, line segments, and points during the bloom pass, then restored original materials before final rendering.
- Kept `prefers-reduced-motion` respected by reducing final bloom mix strength on reduced-motion sessions.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366`: dialog remains centered; WebGL background is not black and no longer over-blooms the panel text.
- `workbench-1366`: workbench title, textarea, and CTA remain clear with restrained background glow.
- `history-drawer-1366` / `account-menu-1366`: floating layers remain readable and unaffected by the WebGL masking pass.

Risk:

- Medium: pipeline now renders bloom and final scene separately, so later luminous objects must opt into `BLOOM_SCENE`.
- Low: the dark-material swap is limited to render-time and restores original material references immediately after bloom rendering.

## Phase B2 - Before

- Selective bloom mechanism is in place, but no scene objects are intentionally assigned to `BLOOM_SCENE` yet.
- Confirmed edit scope before changes: enable bloom only on luminous WebGL objects and mark the hero CTA for DOM-side optical emphasis. Button ids, auth handlers, Firebase, drafts, history, and ARIA remain unchanged.

## Phase B2 - Completed

- Added `enableBloomLayer()` and assigned `BLOOM_SCENE` only to luminous WebGL targets: core mesh, edge shell, geometry rings, scan bands, manuscript orbitals, runes, particles, Raphael core/ring, magicule particles, reference glyphs, and gold bokeh.
- Exposed runtime diagnostics via `window.__FLG_BLOOM_SCENE__`, `data-selective-bloom`, `data-bloom-layer`, and `data-bloom-targets`.
- Marked the login hero CTA with `data-bloom-target="hero-cta"` and added restrained black-gold optical emphasis without changing `#openRitualBtn` or its auth submit behavior.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366` / `login-390`: hero CTA keeps the project black-gold tone, offset underplate, and readable text; no over-bright cyan drift.
- `workbench-1366` / `workbench-390`: background bloom is visible but restrained; content, textarea, and CTA remain readable and contained.

Risk:

- Medium: bloom target list is intentionally selective; any future luminous WebGL module must call `enableBloomLayer()` or opt in explicitly.
- Low: DOM CTA changes are visual-only and keep existing button id, label, form submit behavior, and focus path.

## Phase C - Before

- Existing `cinematicShader` has a small built-in RGB offset tied to `uShock`, but there is no standalone chromatic aberration pass with controllable runtime pulses.
- Confirmed edit scope before changes: add a final post-processing shader pass and runtime trigger only. No Firebase/Auth semantics, DOM ids, draft/history storage, native dialog structure, or Traditional Chinese copy will be changed.

## Phase C - Completed

- Added `chromaticAberrationShader` as a standalone `ShaderPass` after the selective bloom mix and before `OutputPass`.
- Added `PostProcessingPipeline.triggerChromaticAberration()` with reduced-motion guard and a decay-based pulse.
- Routed small WebGL pulses through the CA pulse path and exposed `window.__FLG_TRIGGER_CA__` for later Link Start/auth handoff phases.
- Kept idle CA very low and disabled idle/pulse CA under `prefers-reduced-motion`.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366`: title, copy, CTA, and HUD labels remain readable; no heavy RGB split.
- `workbench-1366`: textarea and workbench title remain sharp enough for editing.
- `history-drawer-1366` / `logout-confirm-1366`: overlay text remains readable and aligned.

Risk:

- Medium: CA is a full-screen pass, so future pulse intensities must stay low around text-heavy states.
- Low: reduced-motion disables CA pulses and idle offset.

## Phase D1 - Before

- No Link Start shader canvas exists yet; auth handoff currently relies on DOM/GSAP collapse, shockwave, and boot veil only.
- Confirmed edit scope before changes: add an `aria-hidden` / `pointer-events:none` WebGL canvas and controller only. Auth trigger logic remains untouched until Phase D2.

## Phase D1 - Completed

- Added `#linkStartFX` canvas with `link-start-fx` styling, isolated z-index, `aria-hidden`, and `pointer-events:none`.
- Implemented `LinkStartFX`, a WebGL1 polar rainbow tunnel shader with cached program/attributes/uniforms and resize handling.
- Exposed `window.__FLG_LINK_START__` and `data-link-start-shader` diagnostics.
- Disabled the canvas path under `prefers-reduced-motion`.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation so far:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366` / `workbench-1366`: inactive Link Start canvas does not alter baseline layout, text, dialog, or workbench surfaces.
- Active shader preview `test-results/s11-link-start-active.bmp`: rainbow polar tunnel renders correctly after replacing reverse `smoothstep()` calls with forward-compatible forms; it is not a blank canvas.

Risk:

- Medium: the active Link Start shader is a full-screen overlay and must only be triggered during intentional handoff windows.
- Low: canvas is `aria-hidden`, `pointer-events:none`, and disabled under reduced motion.

## Phase D2 - Before

- `LinkStartFX` exists and can render the tunnel, but it is not connected to auth handoff yet.
- Confirmed edit scope before changes: call visual FX only after `beginAuthentication()` passes existing auth checks. Firebase provider setup, sign-in calls, redirect handling, and user/session state remain unchanged.

## Phase D2 - Completed

- Added `triggerLinkStartHandoff()` to `LoginController`.
- Triggered `window.__FLG_LINK_START__.start(2600)` and a short CA pulse only after `authenticateBeforeCore()` returns success inside `beginAuthentication()`.
- Kept failed auth, cancelled popup, and pre-auth force-sync paths from starting the handoff FX.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366`: login baseline unchanged before auth.
- `workbench-1366`: workbench baseline remains readable after static operational setup.
- `logout-confirm-1366`: modal overlay remains centered and readable.

Risk:

- Medium: Link Start overlay is intentionally full-screen during successful auth handoff; trigger is guarded after auth success and reduced-motion still disables it.
- Low: no auth provider, Firebase config, persistence, or DOM id changes.

## Phase E1 - Before

- Modal/login surfaces are currently DOM and CSS only; there is no WebGL glass backplate class available for optional modal depth.
- Confirmed edit scope before changes: add a standalone WebGL module only. No existing modal open/close logic, native dialog structure, button ids, Firebase/Auth, drafts, history, or Traditional Chinese copy will be changed.

## Phase E1 - Completed

- Added `public/js/webgl/modal-glass.js` exporting `ModalGlass`.
- Implemented a `MeshPhysicalMaterial` glass backplate with transmission, roughness, thickness, ior, clearcoat, transparency, and non-depth-writing behavior.
- Added additive holographic shade and rim layers plus `fitToRect()`, `show()`, `hide()`, `update()`, `setBloomLayer()`, and `dispose()`.
- Kept the module standalone; it is not imported or shown until Phase E2.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366` / `workbench-1366`: baseline unchanged, as expected for a non-integrated module.

Risk:

- Low: unused module only; actual visual and lifecycle risk moves to Phase E2 integration.

## Phase E2 - Before

- `ModalGlass` module exists but is not imported or displayed.
- Confirmed edit scope before changes: integrate WebGL show/hide calls around existing modal/window lifecycle only. Native dialog DOM, `SaoWindowController` focus behavior, button ids, Firebase/Auth, drafts, history, ARIA, and Traditional Chinese copy remain unchanged.

## Phase E2 - Completed

- Imported `ModalGlass` into `public/index.html`.
- Added `showModalGlass()` and `hideModalGlass()` helpers around existing modal/window lifecycle.
- Displayed the glass backplate for login dialog boot/open paths and `SaoWindowController.open()` targets, including connection, override, and logout confirmation windows.
- Hid the glass on auth handoff and operational entry; restored the login glass when a transient login-side window closes while the login dialog is still open.
- Added `window.__FLG_MODAL_GLASS__`, `data-modal-glass`, and `modalGlass.update()` in the animation loop.
- Synced `public/worldforge-login.html` from `public/index.html`.

Validation:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check:frontend` passed.
- `npm run test:visual:update` passed: 14/14.

Screenshot review:

- `login-1366` / `login-390`: login dialog remains centered, readable, and reflow-safe.
- `logout-confirm-1366`: confirmation modal remains centered and readable.
- `workbench-390`: mobile workbench layout remains contained; no new horizontal overflow.

Risk:

- Medium: live WebGL glass visibility depends on runtime script loading, while the existing Playwright visual baselines intentionally strip scripts for stable DOM snapshots.
- Low: integration does not alter native dialog structure, focus handling, Firebase/Auth, drafts, history, button ids, or Traditional Chinese copy.

## Final Validation And Deploy

Completed after all 8 S11 commits:

- `npm run sync:login-mother` passed.
- `git diff --check` passed.
- `npm run check:frontend` passed.
- `npm run check:functions` passed.
- `npm test` passed: 22/22.
- `npm run test:a11y` passed: 3/3, no critical/serious axe findings.
- `npm run test:visual:update` passed: 14/14.
- `npm run build` passed.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- `firebase deploy --only hosting --project project-7276420283723642146` passed.
- `npm run smoke:hosting` passed.

Deployment:

- Hosting URL: `https://project-7276420283723642146.web.app`

Known residual risk:

- `npm run audit:functions` reports existing moderate transitive dependency advisories in the Functions dependency tree (`qs`, `uuid`, and related `firebase-admin` / Google Cloud packages). The suggested force path would install a breaking `firebase-admin` version, so no automatic dependency upgrade was made in this UI/WebGL task.

## Post-S11 Full Revalidation - Workspace Spacing And Mobile Output Type

User requested a fresh project recheck against the S10.9/S11 execution notes and reference files, with special attention on workbench spacing, mobile output area, and text size.

Before edit confirmation:

- Scope is CSS/layout only in `public/index.html`, followed by `npm run sync:login-mother`.
- No Firebase, Auth semantics, IME behavior, draft/history persistence, button ids, ARIA, focus-visible, skip-link, native dialog structure, 44 x 44 touch targets, or Traditional Chinese copy will be changed.
- Local Playwright layout probe showed mobile workbench hidden history/account panels are still 0 x 0, so the earlier S10.9 mobile blank-space bug is not back.
- Local Playwright layout probe showed mobile result output body text at about 14.6 CSS px, which is below the desired mobile reading floor for the output area.
- Local Playwright layout probe showed desktop brand-to-workbench vertical gap around 89 CSS px, which can feel loose on laptop-height screens.

Planned correction:

- Tighten operational-mode top spacing on desktop/laptop without affecting the login modal.
- Raise mobile result/output body text to a 16px floor and keep line-height comfortable for Traditional Chinese.
- Slightly raise mobile analyze CTA/status readability while preserving existing touch target sizes.

Completed correction:

- Updated only CSS in `public/index.html`, then regenerated `public/worldforge-login.html` with `npm run sync:login-mother`.
- Reduced operational-mode top row gap and operational deck top margin so laptop/desktop workbench starts higher without moving the login modal.
- Raised mobile result-section body text from about 14.6 CSS px to about 16.7 CSS px.
- Raised mobile result section headings to the same 16px floor, mobile status text to 14px, and the analyze CTA label to 16px.
- Re-ran the local Playwright layout probe: mobile document still has no horizontal overflow (`scrollWidth` equals `clientWidth` at 390px), and hidden history/account panels remain 0 x 0.

Post-edit measured values:

- Desktop 1366 brand-to-workbench gap: about 89px before, about 72px after.
- Mobile 390 brand-to-workbench gap: about 24px before, about 20px after.
- Mobile output body font: about 14.6px before, about 16.7px after.
- Mobile status font: about 13.5px before, 14px after.
- Mobile analyze CTA label: 16px after.

Validation after correction:

- `npm run sync:login-mother` passed.
- `git diff --check` passed with CRLF warnings only.
- `npm run check` passed.
- `npm test` passed: 22/22.
- `npm run test:a11y` passed: 3/3, axe impact counts `{}`.
- `npm run test:visual:update` passed: 14/14; workbench/account/history/logout snapshots regenerated and reviewed.
- `npm run test:visual` passed: 14/14.
- `npm run build` passed.
- `npm run test:rules` passed.
- `npm audit --omit=dev` passed with 0 vulnerabilities.
- `npm run audit:functions` still reports the known existing 10 moderate transitive advisories under Functions dependencies (`qs`, `uuid`, and Firebase/Google Cloud transitive packages). No dependency upgrade was made because the force path includes a breaking `firebase-admin` change and this correction touched only UI CSS.

Screenshot review after correction:

- `workbench-390`: no excessive blank space under the mobile header/nav, no horizontal overflow, nav buttons remain readable, and the first output area starts within the expected scroll flow.
- `workbench-1366`: workspace panel starts higher on laptop/desktop view, without overlapping top HUD or title content.
- `history-drawer-1366`, `account-menu-1366`, `logout-confirm-1366`: overlay positions remain stable after the spacing change.

Deployment after correction:

- Commit created for this revalidation correction: `fix(s11/audit): tighten workbench spacing and mobile output type`.
- `firebase deploy --only hosting --project project-7276420283723642146` passed.
- Hosting URL: `https://project-7276420283723642146.web.app`
- `npm run smoke:hosting` passed after deploy.
- User requested no shutdown after this pass; no shutdown command was scheduled.
