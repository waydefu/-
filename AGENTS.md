# AGENTS.md

先讀 `README.md`。本檔只保留後續 Agent 的行為契約；專案架構、功能矩陣、掃描結論與驗收指令已整合到 `README.md`。

## 執行原則

- 採用 Spec-First。改程式前先確認 `README.md` 的不可違反條款與驗收重點。
- 遇到瀏覽器相容、Three.js、Firebase、CSS、效能、可存取性或 UX 問題時，可上網查官方或高可信來源再改。優先來源：Three.js 官方文件、MDN、web.dev、W3C、Firebase 官方文件、Nielsen Norman Group、Baymard。
- 不要刪除用途不明檔案；先用 `rg --files`、`rg` 和引用掃描確認。
- 保留使用者現有修改，不要還原 unrelated changes。
- 小型明確錯誤可直接修並回報；大型架構錯誤、會刪檔、會改登入/部署/資料契約的錯誤必須先詢問。
- 執行時若需要最新資訊，可直接上網搜尋；優先使用官方或高可信來源。
- 修改 `public/index.html` 前，先判斷是否需要同步 `public/worldforge-login.html`。若改的是視覺母體、WebGL 類別、登入儀式、HUD 層、Operational Mode 架構或 RWD 核心規則，兩者必須同步；若只改正式站資料服務、部署 smoke、Firebase 串接或正式入口專用文案，可只改 `public/index.html`，但需在回報中說明未同步原因。

## 不可違反

- 唯一視覺與架構母體是 `public/worldforge-login.html`，正式入口是 `public/index.html`。
- 不可刪除、替換或降級 `CoreEngine`、`RuneSystem`、`ParticleSystem`、`HUDSystem`、`PostProcessingPipeline`、`LoginController`、`OperationalModeController`。
- 不可用普通 dashboard、普通 SaaS、卡片工具頁、簡化 Canvas 或靜態背景取代 WebGL 母體。
- 不可移除左右 HUD、底部 HUD、四角 HUD、SAO 視窗具現化、其他登入彈窗、覆寫警告、`EDITORIAL MODE ONLINE` 轉場。
- 不可讓登入後跳轉到另一個乾淨頁面；主站功能必須寄生在 Operational Mode。
- Firebase Auth / Google / Guest 成功後才可進入 Operational Mode。
- 不可為了 HUD 氛圍犧牲主要操作可讀性。草稿、輸出、登入欄位、錯誤訊息、主要按鈕與帳號/歷史操作必須比裝飾 HUD 更清楚、更可點擊。

## 必須保留

- `#webgl-container` 持續可見並運轉。
- 全螢幕裝飾層維持 `pointer-events: none`；按鈕、輸入框、法典面板等可操作元素才使用 `pointer-events: auto`。
- 中央「黑曜石法典」保留草稿輸入與唯一分析主按鈕；目前正式文案是「啟動奧術解析引擎」。
- 歷史紀錄、登出、複製卷宗、清空等次要操作只能放在可讀、可點擊的小型 HUD 操作列或卷宗區，不得做成難以辨識的微型裝飾字。
- Operational Mode 是長時間閱讀與編修工作台，不是登入展示頁。字級、行高、輸入框高度、按鈕點擊區和輸出區高度不可低於可用性底線。
- 手機版可降低 HUD 密度，但不可丟失登入儀式、核心身份與主要工作流。
- 所有使用者可見文字使用繁體中文；英文只作 HUD 氛圍標籤。

## 最低驗收

文件-only 修改至少執行：

```powershell
git diff --check
```

改到前端、Functions、Firebase、CSS、WebGL、登入流程、Operational Mode 或部署相關檔案時，完成任務前至少執行：

```powershell
npm run check:frontend
npm run check:functions
npm test
npm run build
```

部署後執行：

```powershell
firebase deploy --only hosting
npm run smoke:hosting
```
