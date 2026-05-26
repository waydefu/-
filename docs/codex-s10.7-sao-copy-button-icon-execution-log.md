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
