# 復原點：Worldforge Operational Mode 收尾版

> 歷史快照：本檔只記錄 2026-05-22 當時的復原點與操作方式，不是目前 source of truth。目前規格、架構、驗收與最新復原狀態請看 `../README.md`。

日期：2026-05-22

## 目的

本復原點保存目前已部署的「禁忌魔導書庫 / 西方奇幻小說 AI 編修系統」狀態。

主要包含：

- `public/index.html` 正式入口。
- `public/worldforge-login.html` 視覺母體同步版。
- `AGENTS.md` 與 `README.md` 的不可違反規則。
- `docs/aaa-review-progress.md` 的進度紀錄。
- `docs/worldforge-ultimate-rebuild-plan.md` 的重建規劃。
- `scripts/smoke-hosting.mjs` 的 Hosting smoke 驗證。

## 本輪規則

- 小型明確錯誤：直接修正並回報。
- 大型架構、登入契約、資料流、部署風險、刪檔或可能破壞既有功能的錯誤：先詢問。
- 發現可優化項：可以主動通知。
- 執行時需要最新資訊：可直接上網搜尋，優先官方或高可信來源。

## 已驗收

```powershell
git diff --check
npm.cmd run check:frontend
npm.cmd run check:functions
npm.cmd test
npm.cmd run build
firebase deploy --only hosting --project project-7276420283723642146
npm.cmd run smoke:hosting
```

## 部署位置

```text
https://project-7276420283723642146.web.app
```

## 復原方式

若目前分支仍保留本復原點，可直接切回：

```powershell
git switch codex/worldforge-operational-restore-20260522
```

若只想從復原點取回指定檔案，先確認復原分支或 commit 存在，再執行：

```powershell
git restore --source codex/worldforge-operational-restore-20260522 -- AGENTS.md README.md public/index.html public/worldforge-login.html scripts/smoke-hosting.mjs docs/aaa-review-progress.md docs/worldforge-ultimate-rebuild-plan.md docs/restore-point-2026-05-22.md
```

復原後至少執行：

```powershell
git diff --check
npm.cmd run check:frontend
npm.cmd run check:functions
npm.cmd test
npm.cmd run build
```
