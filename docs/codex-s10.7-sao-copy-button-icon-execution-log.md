# S10.7 SAO Copy, Button, Icon Execution Log

Date: 2026-05-26
Branch: codex/arcane-sage-core-20260522
Scope: public/index.html first, then sync public/worldforge-login.html with npm run sync:login-mother.

## User Confirmation

- User requested start after S10.5/S10.6 completion.
- User added references:
  - https://dev.to/jh3y/css-cyberpunk-2077-buttons-taking-your-css-to-night-city-43l0
  - https://github.com/WarrenUhrich/SAO-UI
- User explicitly allowed Traditional Chinese copy polish: "繁中也美化開始".

## Active Red Lines

- Do not change Firebase, Auth data flow, draft storage, history storage, native dialog structure, or existing button ids.
- Do not remove ARIA, focus-visible, skip-link, reduced-motion support, or 44x44 touch targets.
- Keep WCAG 2.1 AA contrast and reflow behavior usable.
- Copy polish must preserve existing product meaning and avoid changing functional semantics.
- Record changes before and after each code edit chunk.

## Research Notes

- Cyberpunk button reference: useful techniques are clipped button geometry, pseudo-element scan/glitch slices, CSS variables, and aria-hidden duplicate decoration. Adapt as black-gold SAO rather than red/blue Cyberpunk.
- WarrenUhrich/SAO-UI: useful direction is SAO system-message/modal feeling, fast translucent system panels, touch-oriented interaction cues, and layered menu affordances.
- Implementation decision: use CSS pseudo-elements and existing child spans where possible. Avoid duplicating button labels in DOM unless needed, so screen reader output stays stable.

## Pre-Change Inventory

- Main UI source: public/index.html.
- Synced page: public/worldforge-login.html.
- Current git status before edits: clean.
- Current S10.6 state already has `.sao-btn`, ripple, success/error/confirm states, native login dialog, workbench nav buttons, drawer/menu buttons, analysis buttons, and dynamic result/history buttons.
- Copy targets:
  - Login prompt/status
  - Workbench subtitle and operational copy
  - Draft field helper, placeholder, status text
  - Progress and result empty states
  - Toast/HUD messages
  - Account/history action labels
- Button/icon targets:
  - OAuth login button
  - History/account nav chips
  - Logout/history/clear/copy/reanalyze buttons
  - Analyze ritual button
  - Dynamic result-section copy buttons
  - Dynamic history rows and delete buttons

## Planned Commits

1. docs(s10.7): record scope, references, redlines, and inventory.
2. feat(s10.7/copy): polish Traditional Chinese UI copy while preserving meaning.
3. feat(s10.7/icons): add SAO-style button glyph wrappers for static and dynamic buttons.
4. feat(s10.7/buttons): add black-gold clipped/glitch button finishing and typography refinements.
5. chore(s10.7/validate): sync, visual/a11y/smoke review notes and screenshot paths.

## Before Edit Confirmation - Part 1

Confirmed safe to add this documentation file only. No runtime files changed in this part.

## Before Edit Confirmation - Part 2 Copy

Planned runtime file: public/index.html.

Allowed by user: Traditional Chinese copy polish.

Constraints checked:
- Keep all ids, ARIA attributes, handlers, Firebase/Auth/draft/history contracts unchanged.
- Preserve Google-only login meaning.
- Preserve analysis/history/draft operation semantics.
- Avoid copy that expands buttons enough to threaten 44x44, reflow, or mobile layout.

Target changes:
- Make hero/login/workbench copy more elegant and consistent with Great Sage / SAO black-gold tone.
- Polish status/toast/progress copy for clarity.
- Keep action labels concise.

## After Edit - Part 2 Copy

Changed public/index.html only.

What changed:
- Polished product metadata/title, login prompt, workbench headline, draft helper, progress notes, result empty states, history/account wording, and HUD/toast status copy.
- Replaced some "診斷卷宗" visible states with "鑑定卷宗" for stronger product tone.
- Kept Google-only login meaning, all ids, ARIA wiring, handlers, Auth/Firebase/draft/history code paths, and native dialog structure intact.

Next required action:
- Run npm run sync:login-mother so public/worldforge-login.html matches public/index.html.
- Then run git diff --check before committing Part 2.

Part 2 commit: 1f96bcc feat(s10.7/copy): polish Traditional Chinese UI tone.

## Before Edit Confirmation - Part 3 Icons

Planned runtime file: public/index.html.

Constraints checked:
- Button ids and event listeners stay unchanged.
- Decorative icons must use aria-hidden and not replace accessible labels.
- Dynamic buttons must keep data attributes and click behavior.
- Static Google button label must still be updated by LoginController.setAuthCopy.

Target changes:
- Add `.sao-btn-symbol` and `.sao-btn-label` for consistent icon/text layout.
- Wrap static button labels with decorative SAO glyphs where safe.
- Add a helper for dynamic button glyph creation.
- Add icons to result copy buttons, history delete buttons, and history row buttons.

## After Edit - Part 3 Icons

Changed public/index.html only.

What changed:
- Added `.sao-btn-symbol` and `.sao-btn-label` CSS for black-gold SAO glyph badges.
- Wrapped static action buttons with aria-hidden decorative glyphs and preserved readable label spans.
- Added helper functions for dynamic glyph buttons so result copy/history delete/history row buttons keep consistent icon treatment.
- Updated copy/logout/history confirm label changes to preserve icon wrappers instead of replacing button DOM with plain text.
- Added reduced-motion coverage for glyph transitions.

Next required action:
- Run npm run sync:login-mother.
- Run git diff --check before committing Part 3.

Part 3 commit: 8e634cc feat(s10.7/icons): add SAO glyphs to action buttons.

## Before Edit Confirmation - Part 4 Button VFX

Planned runtime file: public/index.html.

Constraints checked:
- CSS-only visual finishing; no button ids, handlers, Firebase/Auth/draft/history/native dialog changes.
- Keep 44x44 touch minimum and reduced-motion support.
- Avoid layout-shifting hover effects. Transforms and opacity only for motion.
- Keep Cyberpunk reference as technique inspiration, not a red/blue palette shift.

Target changes:
- Add black-gold clipped-corner finishing to `.sao-btn`.
- Add glitch/slice shimmer layer inspired by Cyberpunk button technique.
- Tighten button typography with label text-shadow and icon hover state.
- Preserve SAO frame corner lines from S10.6.

## After Edit - Part 4 Button VFX

Changed public/index.html only.

What changed:
- Added clipped-corner treatment to `.sao-btn`.
- Added label slice shimmer and short transform-only glitch animation.
- Strengthened black-gold icon/label hover glow without changing layout dimensions.
- Added reduced-motion coverage for the new label and glyph motion.

Next required action:
- Run npm run sync:login-mother.
- Run git diff --check and check:frontend before committing Part 4.

Part 4 commit: 6c1c53a feat(s10.7/buttons): add black-gold clipped glitch button polish.

## Before Validation - Part 5

Planned validation:
- npm run sync:login-mother
- git diff --check
- npm run check
- npm test
- npm run test:visual:update
- Review updated screenshots manually
- npm run test:visual
- npm run test:a11y
- npm run build

Notes:
- Visual snapshots are expected to update because copy, icon wrappers, and button VFX changed.
- No deploy requested for S10.7 in the latest instruction; smoke:hosting only reflects the deployed S10.6 hosting version unless a deploy is explicitly performed.

## Before Edit Confirmation - Part 5 Visual Fixtures

Planned test file: tests/visual/helpers.ts.

Reason:
- The product now renders dynamic buttons with `.sao-btn-symbol` and `.sao-btn-label`.
- Existing visual helpers manually injected old plain-text dynamic buttons, which would make screenshots less representative.

Constraints checked:
- Test fixture only; no production ids, handlers, Firebase/Auth/draft/history/native dialog changes.
- Keep same fixture behavior and visible sample content.

## After Edit - Part 5 Visual Fixtures

Changed tests/visual/helpers.ts only.

What changed:
- Updated fixture result copy buttons to include SAO glyph/label wrappers.
- Updated fixture history row and delete button to mirror production dynamic markup.

Next required action:
- Re-run npm run test:visual:update.
- Manually review regenerated screenshots.

## Validation Finding - Touch Target Fix

DOM metric check found visible dossier action buttons at 38px height on desktop:
- copyAllButton
- clearDraftButton

Fix applied:
- Raised `.dossier-action`, `.dossier-copy`, and `.result-section-copy` to global min-height 44px.
- Added flex/gap alignment to `.result-section-copy` so dynamic copy buttons match the glyph layout.

## Validation Results - Part 5

Commands:
- npm run sync:login-mother: passed.
- git diff --check: passed.
- npm run check: passed.
- npm test: passed, 22 tests.
- npm run test:visual:update: passed, 12 tests. Snapshots updated.
- npm run test:visual: passed, 12 tests.
- npm run test:a11y: passed after rerun, 3 tests, axe impact counts `{}`.
- npm run build: passed.
- npm run smoke:hosting: passed. Note: no S10.7 deploy was requested, so this checks the currently deployed hosting health, not a deployed S10.7 UI.

Manual screenshot review:
- tests/visual/worldforge.spec.ts-snapshots/login-1366-chromium-win32.png: OK, new login copy visible, no overflow.
- tests/visual/worldforge.spec.ts-snapshots/login-390-chromium-win32.png: OK, mobile login copy wraps cleanly.
- tests/visual/worldforge.spec.ts-snapshots/workbench-1366-chromium-win32.png: OK, nav glyph buttons and polished copy fit.
- tests/visual/worldforge.spec.ts-snapshots/history-drawer-1366-chromium-win32.png: OK, history drawer button glyphs visible; no incoherent overlap.
- tests/visual/worldforge.spec.ts-snapshots/account-menu-1366-chromium-win32.png: OK, logout glyph/label fits.

DOM metric check:
- Desktop 1366x768: overflowX 0, no visible buttons below 44x44, no unlabeled visible buttons.
- Mobile 390x844: overflowX 0, no visible buttons below 44x44, no unlabeled visible buttons.

Known note:
- test:a11y initially failed once because it was launched in parallel with another Playwright webServer on port 5173. Sequential rerun passed.

## Deploy Follow-Up

User requested deploy after S10.7.

Pre-deploy:
- git status --short: clean.
- npm run build: passed.

Deploy:
- firebase deploy --only hosting --project project-7276420283723642146: passed.
- Hosting URL: https://project-7276420283723642146.web.app

Smoke finding:
- Initial npm run smoke:hosting failed because scripts/smoke-hosting.mjs still asserted the old analysis CTA copy "啟動奧術解析引擎".
- S10.7 intentionally changed the visible CTA to "啟動手稿鑑定引擎".
- This is a smoke assertion drift, not a hosting deploy failure.

Planned fix:
- Update smoke assertion to verify the stable `data-op="analyze"` action and the new S10.7 CTA copy.
- Update editorial copy assertion to match S10.7 metadata.

After fix:
- npm run smoke:hosting: passed.
- Only scripts/smoke-hosting.mjs and this log changed after deploy; deployed public assets were already current.
