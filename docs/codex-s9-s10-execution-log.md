# Codex S9/S10 執行紀錄

本檔用於保存本輪工作上下文，避免長任務或上下文壓縮後遺失順序、紅線、改動與驗收結果。

## 固定順序

1. 先執行 `C:\Users\wayde.fu\OneDrive\桌面\FLG-UI-S9-S1S4補強-codex執行單.txt`。
2. S9 完成後跑驗收，必要時更新 visual snapshots，然後 commit 並回報。
3. 暫停並不執行任何舊的「黑金 SAO 系統 UI 實作計劃」Part。
4. 改執行 `C:\Users\wayde.fu\OneDrive\桌面\FLG-UI-S10-黑金SAO系統UI-接管版-執行單.txt`。
5. S10 依接管版 11 個 Part 拆 11 個 commit；每個 Part 記錄 commit hash、風險與截圖。

## 紅線

- 不可動 Firebase / Auth / 草稿 / 歷史 schema。
- 不可動 `functions/src/*` 後端。
- 不可拿掉現有 ARIA / role / focus-visible / skip-link。
- WCAG 1.4.4 Resize Text 200% 與 WCAG 1.4.10 Reflow 必須可用。
- 繁中介面文字不動。
- 不執行已被推翻的舊 codex 計劃：三欄 modal、固定 px 字級、100% 手動同步 worldforge。

## 目前確認

- 已讀 `README.md`；它是專案唯一共用 source of truth。
- 已讀 S9 與 S10 桌面執行單。
- 目前分支：`codex/arcane-sage-core-20260522`。
- 目前基線：`d2bed37 Restore Great Sage online baseline`。
- 開始前 `git status --short --branch` 只顯示分支，無既有未提交改動。

## 變更前確認紀錄

### S9 預計改動

- `public/index.html`：收掉 S9 指定 8 組裝飾性 cyan，保留 status accent cyan。
- `package.json` / `package-lock.json`：新增 a11y / visual 測試所需 dev dependencies 與 scripts。
- `tests/visual/a11y.spec.ts`：新增 axe-playwright baseline。
- `README.md`：補 Accessibility baseline、對比表與 keyboard walkthrough 結果。
- 本檔：記錄每次改動與驗收結果。

### S10 預計改動

- 只在 S9 commit 後開始。
- 依接管版拆成 11 個 commit；Part B 字級改動後必須更新 snapshots 並逐張 review。

## 進度

- [x] 讀 README 與兩份桌面執行單
- [x] 建立本輪 MD 執行紀錄
- [x] S9 Part A 色票收尾
- [x] S9 Part B a11y 自動化與文件
- [ ] S9 驗收與 commit
- [ ] S10 11 個 Part

## S9 已執行紀錄

### Part A 色票收尾

- 檢查 `public/index.html` 與 `public/worldforge-login.html` 目前完全一致。
- 指定 8 組裝飾性 cyan 在目前基線已經是 gold / amber / deep blue。
- `rgba(0, 212, 255, ...)` 剩 5 處：3 個 token + 2 個 sync/status accent。
- `rgba(110, 231, 255, ...)` 剩 3 處：2 個 token + 1 個 sync/status accent。
- 未改動 Firebase / Auth / 草稿 / 歷史。

### Part B a11y / visual baseline

- 新增 dev dependencies：`@playwright/test`、`@axe-core/playwright`、`@axe-core/cli`。
- 新增 scripts：`test:a11y`、`test:visual`。
- 新增 `scripts/serve-public.mjs` 與 `playwright.config.ts`。
- 新增 `tests/visual/a11y.spec.ts`、`tests/visual/worldforge.spec.ts`、`tests/visual/helpers.ts`。
- 建立 visual snapshots：登入 1366、登入 390、工作區 1366、歷史抽屜 1366、帳號選單 1366。
- a11y：三狀態 axe critical / serious = 0；唯一 moderate 是 `meta-viewport`，留給 S10 Part A。
- 對比掃描：`seal-strip` 由 `rgba(214,166,77,0.62)` 提升到 `0.78`，10 項皆達 4.5:1。
- Keyboard walkthrough：發現 hidden button 可被 author CSS 覆蓋，新增全域 `[hidden] { display: none !important; }`，同步 `index.html` / `worldforge-login.html`。
- `.gitignore` 新增 `test-results/` 與 `playwright-report/`。
- README 新增 Accessibility baseline、Contrast baseline、Keyboard walkthrough。

### S9 驗收目前結果

- `npm.cmd run test:a11y`：通過。
- `npm.cmd run test:visual -- --update-snapshots`：通過並建立 5 張 snapshot。
- `npm.cmd run test:visual`：通過。
- `git diff --check`：通過。
- `npm.cmd run check:frontend`：通過。為避免新 dev dependency 的 `@types/node` 隱式拉入 `string_decoder` JS，已在 `jsconfig.json` 加 `"types": []`。
- `npm.cmd run check:functions`：通過。
- `npm.cmd test`：通過，22 tests passed。
- `npm.cmd run build`：通過。
- S9 commit：`3a46953 test(s9): add a11y and visual baselines`。
- S9 Hosting deploy：通過，Hosting URL `https://project-7276420283723642146.web.app`。
- S9 production smoke：`npm.cmd run smoke:hosting` 通過。

## S10 接管版執行紀錄

### 舊計劃暫停確認

- 不執行舊 codex「黑金 SAO 系統 UI 實作計劃」任何 Part。
- 已推翻且不得採用：三欄 modal、固定 px 字級、手動 100% 同步 worldforge。

### Part A 變更前確認

- 預計改動：`public/index.html` 與 `public/worldforge-login.html` viewport meta。
- 目標：移除 `maximum-scale=1.0`，加入 `viewport-fit=cover`。
- 風險：Low；iOS 可捏拉縮放，符合 WCAG 1.4.4。

### Part A 完成紀錄

- 已同步更新 `public/index.html` / `public/worldforge-login.html`。
- `npm.cmd run test:a11y`：通過，axe impact counts `{}`，`meta-viewport` moderate 已消失。
- `git diff --check`：通過。
