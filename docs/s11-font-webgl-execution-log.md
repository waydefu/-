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
