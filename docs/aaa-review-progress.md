# 禁忌魔導書庫 AAA 進度紀錄

## 目前狀態

- 已從正式 Hosting 取回大型 WebGL `public/index.html`，復原被覆寫成 24KB 模組版的入口檔。
- 已重新套用最近一輪 Operational Mode 修正：右上帳號列、歷史紀錄空白收回、登出二次確認、分析時輸出區讀條、工作區加寬與垂直滾動。
- 正式入口仍是 `public/index.html`；視覺母體規格仍以 `public/worldforge-login.html` 為準。

## 已完成 / 部分完成

### P0 語義與可用性

- 登入前 HUD 狀態從 `REVISION ENGINE READY` 修正為 `REVISION ENGINE SEALED`。
- 登入後動態切換為 `DIMENSIONAL SEAL LIFTED / REVISION ENGINE ONLINE`。
- 過小 HUD 字級提升到可讀底線。
- `prefers-reduced-motion` 改為讀取 `matchMedia`。
- 820px 平板 Grid 重疊邏輯修正。

### P1 核心與儀式感

- `RuneSystem` 重構為七層分析環：`LORE CHECK`、`CHARACTER INDEX`、`RACE CODEX`、`STYLE MATRIX`、`PLOT LOGIC`、`WORLD RULES`、`ABYSS / REVISION`。
- 加入 `.core-pulse` 三層核心脈衝。
- 登入面板加入四角符文刻印、頂部符文條、加大標題與更厚重的封印視覺。
- 登入成功加入 Canvas 2D 粒子化崩解，並在 reduced motion 下跳過。

### P2 工作台與 RWD

- 手機 560px 保留最小化底部 HUD 與 `mobile-diag-strip`。
- 建立 9 層字級 token 系統。
- 主分析按鈕升級為 `啟動奧術解析引擎`，加入 loading 掃描線。
- Boot fallback watchdog：GSAP 若未掛上，11 秒後仍會進入可操作狀態；筆電開場節奏已放慢，登入面板延後具現化。
- Operational Mode 字級、草稿區、輸出區放大。
- `EDITORIAL MODE ONLINE` 避免壓住草稿/輸出內容。
- 右上固定操作列：
  - 歷史紀錄移到右上。
  - 登入者名稱改成帳號膠囊，顯示頭像、名稱與同步狀態。
  - 頭像選單內提供登出，第一次點擊只進入二次確認。
  - 歷史抽屜點擊空白處會收回。
- 原本靜態三排 `世界觀同步 / 深淵法典 / 草稿記憶` 已隱藏，改為按下分析後在輸出區顯示讀條，結果回來後自動替換。
- Operational Mode 的 `.interface` 可用滑鼠滾輪垂直移動，並避免水平溢出。
- 1366×768 筆電與 390×844 手機登入面板改回 viewport 置中，不再被 820px / 560px RWD grid 推到上方。
- 緊湊螢幕取消密碼欄 / 註冊欄位自動 focus，避免手機鍵盤把登入彈窗頂上去。
- Email 驗證後會嘗試查詢 Firebase sign-in methods；未存在的印記直接進入「締結作者契約」註冊流程，並補上 6 字元密鑰前端檢查。
- 覆寫 / 締約彈窗的 GSAP `xPercent/yPercent` 已固定，避免具現化時失去 `translate(-50%, -50%)` 而跑位。
- 「修改後全文」輸出區已移除內部滾動條，改由工作台主容器捲動；字級與行高再放大，按下分析後自動下移到輸出區。
- 分析期間輸出區維持三排讀條與接收字數，完成後才替換成完整結果。

### 規則文件

- `AGENTS.md` 已補上正式入口 / 視覺母體同步判準。
- 不可違反條款已補上 `HUDSystem`。
- 已明確禁止為了 HUD 氛圍犧牲主要操作可讀性。
- 「開始分析」舊規則已改為唯一分析主按鈕，並標明目前文案是「啟動奧術解析引擎」。
- 「小型 HUD」規則已改為「可讀、可點擊的小型 HUD」。
- Operational Mode 已明定為長時間閱讀與編修工作台，字級、行高、操作尺寸不可低於可用性底線。
- 驗收規則已分成文件-only 與程式 / 部署兩種。
- `README.md` 已同步以上規則。

## 待辦

- P3-1：分析環 DOM 標籤 overlay，讓每層分析環語義更清楚。
- P3-2：手機 `visualViewport` 鍵盤感知，避免鍵盤遮住登入面板或草稿區。
- P3-3：登入前 HUD 數值改成真實低值，登入過程逐步提升。
- P3-4：Three.js 赤道掃描波 mesh。
- P3-5：ParticleSystem 資料吸入流。

## 驗收指令

```powershell
git diff --check
npm run check:frontend
npm run check:functions
npm test
npm run build
```

部署後：

```powershell
firebase deploy --only hosting
npm run smoke:hosting
```

## 注意

- 目前工作樹曾被外部操作覆寫，恢復來源為正式 Hosting 的 `index.html`，並重新套用本輪修正。
- 若再次發生檔案被覆寫，優先檢查 `.tmp/recovery-before-hosted-restore.index.html` 與正式 Hosting 內容。
- `scripts/smoke-hosting.mjs` 已同步改為驗證大型 Worldforge inline shell，不再檢查舊 `js/app.js?v=44` 模組入口。
