# S21-A Navbar Handoff

## Recovery Block

- Scope: replace the workbench SYS menu with a fixed top navbar.
- Primary files: `public/index.html`, `public/js/main.js`.
- Synced file: `public/worldforge-login.html` must be regenerated with `npm run sync:login-mother` after entry changes.
- Do not edit the body-level `#accountMenu` / `#historyDrawer` overlay recipe or the `overrideMaterialize` / `overrideDissolve` transform rules.
- Keep stable ids: `#historyToggle`, `#accountToggle`, `#clearDraftButton`, `#reanalyzeButton`, `#logoutButton`.
- `#logoutButton` remains inside `#accountMenu`.

## Final Target

| Control | Destination | Mobile Behavior |
|---|---|---|
| `#historyToggle` | fixed top navbar | icon-only visual label, keeps `aria-label` |
| `#accountToggle` | fixed top navbar | avatar/icon-only visual label, keeps `aria-label` |
| `#clearDraftButton` | workbench input action area | full text button |
| `#reanalyzeButton` | dossier action area | full text button when visible |
| `#logoutButton` | account overlay | unchanged |

## Change Log

- 2026-06-06: Started S21-A after reading README and execution sheets A-00 through A-04.
- 2026-06-06: Confirmed existing `--z-menu` is higher than `--z-modal-critical`; navbar must stay below overlays by using a modal-safe z-index rather than `--z-menu`.
- 2026-06-06: Added body-level `.app-navbar` before `main.interface`; it is CSS-hidden until `body.operational`.
- 2026-06-06: Removed the in-deck `workbench-nav` shell and retired the SYS menu DOM/CSS/JS path.
- 2026-06-06: Replaced `ensureSystemMenu()` with `ensureNavbar()` in `public/js/main.js`; history/account are appended to `.app-navbar-actions`, clear/reanalyze are guarded back into workbench containers.
- 2026-06-06: Updated visual/smoke helpers so tests no longer recreate or assert the retired SYS menu.
- 2026-06-06: Ran `npm run sync:login-mother`; `public/worldforge-login.html` now mirrors the navbar changes from `public/index.html`.

## Structure

```text
body
  #logoutConfirmWindow
  #accountMenu
  #historyDrawer
  header.app-navbar
    .app-navbar-inner
      .app-navbar-brand
      nav.app-navbar-actions
        #historyToggle
        #accountToggle
  main.interface
    #ritualStack
    #operationalDeck
      .codex-panel
        .operational-actions
          [data-op="analyze"]
          #clearDraftButton
        .analysis-dossier
          .dossier-actions
            #copyAllButton
            #reanalyzeButton
```

## CSS / RWD Notes

- `.app-navbar` is fixed at the top and uses `z-index: calc(var(--z-modal-critical) - 10)` so body-level account/history overlays remain above it.
- `body.operational #operationalDeck` gets `padding-top: calc(56px + clamp(8px, 2vw, 20px))` to avoid content being covered.
- Navbar content is constrained to `760px` to align with the S21 single-column workbench.
- At `max-width: 640px`, navbar buttons keep 44px targets and hide visual text with clipping while preserving `aria-label`.

## Deleted Runtime Surface

- `#systemMenuToggle`
- `#systemMenuPanel`
- `.sao-system-menu`
- `ensureSystemMenu()`
- `toggleSystemMenu()`
- SYS menu visual-test construction

## Pending Verification

- `npm run sync:login-mother` passed.
- `npm run check` passed.
- `npm test` passed: 25 tests.
- `npm run test:a11y` passed: 3 tests, axe critical / serious empty.
- `npm run test:visual` initially produced expected layout pixel diffs for workbench/modal snapshots; after manual review, snapshots were updated with `npm run test:visual:update`, and final `npm run test:visual` passed: 17 tests.
- Local Playwright computed check:
  - Desktop 1366: navbar inner 760x56, navbar z-index 110, account/history overlay z-index 120, history button 154x44, account button 165x44, no horizontal overflow.
  - Mobile 390: navbar inner 390x56, history/account buttons 44x44, labels visually clipped, no horizontal overflow.
  - `#clearDraftButton` parent is `.operational-actions`; `#reanalyzeButton` parent is `.dossier-actions`.
- Deployment and post-deploy online Playwright verification require user approval.
- Mobile animation/touch feel remains pending user incognito real-device validation.
