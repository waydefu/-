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
