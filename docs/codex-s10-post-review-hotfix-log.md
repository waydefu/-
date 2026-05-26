# S10 Post-Review Hotfix Log

## 2026-05-26 登入框置中修正

### 變更前確認

- 使用者截圖顯示 live hosting 登入 `<dialog id="ritualStack">` 視覺位置偏右，需取消關機並立即修正。
- `shutdown.exe /a` 回覆 1116，表示當下沒有進行中的系統關機排程。
- 根因判定：S10 Part C 已改 native `<dialog>`，但 `.ritual-stack` 仍殘留舊 `left: 50%` / `top: 50%` / `translate(-50%, -50%)` 置中模型，`body.boot-complete` 與 mobile conjure keyframe 也會再套舊位移；native dialog 自身置中與舊位移疊加後造成實機偏移。
- 修正範圍限制：只調整 `public/index.html` 的 dialog positioning / animation reset，完成後以 `sync:login-mother` 同步 `public/worldforge-login.html`；不修改 Firebase / Auth / 草稿 / 歷史資料契約，不移除 ARIA / focus-visible / skip-link，不改繁中 UI 文案。

### 待完成

- [x] 修正 native dialog 置中 CSS 與 mobile keyframe。
- [x] 同步 `public/worldforge-login.html`。
- [x] 跑前端檢查、visual、a11y 與 live smoke。
- [x] 擷取修正後截圖。
- [x] 提交 hotfix commit，commit hash 於回報中列出。

### 已完成變更

- `public/index.html`：`.ritual-stack` 改採 native dialog 置中模型，使用 `inset: 0` 與 `margin: auto`，移除舊 `left/top/translate(-50%, -50%)` 疊加位移。
- `public/index.html`：`body.boot-complete .ritual-stack` 與 `mobileRitualStackConjure` 改為不依賴 `translate(-50%, -50%)`，避免登入框在 boot 完成或 mobile 進場動畫後偏移。
- `public/index.html`：開啟 dialog 前清掉可能殘留的 inline `display`，避免 operational handoff 後的 `display: none` 影響再次開啟。
- `public/worldforge-login.html`：已由 `npm.cmd run sync:login-mother` 同步母檔。

### 驗收紀錄

- `git diff --check`：通過。
- `npm.cmd run check:frontend`：通過。
- `npm.cmd run test:visual`：第一次只有 `login-1366` 因置中修正產生 expected 差異；人工 review actual / diff 後確認為登入框回到水平中心。
- `npm.cmd run test:visual -- --update-snapshots`：通過，僅重產 `login-1366-chromium-win32.png`。
- `npm.cmd run test:visual`：通過，12 tests passed。
- `npm.cmd run test:a11y`：通過，3 tests passed，axe impact counts `{}`。
- `npm.cmd run build`：通過，並再次同步 `worldforge-login.html`。
- `firebase.cmd deploy --only hosting --project project-7276420283723642146`：通過，Hosting URL `https://project-7276420283723642146.web.app`。
- `npm.cmd run smoke:hosting`：通過。
- live browser 量測：viewport `1280x720`，dialog rect `left=430 top=237 width=420 height=246`，center `640,360`，`centerDeltaX=0` / `centerDeltaY=0`，`open=true`，`bootComplete=true`。
- 修正後截圖：`artifacts/s10/hotfix-dialog-centered-1366.png`。
