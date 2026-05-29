# S14-1 Execution Log - 行動版彈窗修復與字級系統

## 恢復區塊（最新狀態）
- 分支：codex/arcane-sage-core-20260522　工作樹：有未提交（既有未追蹤 `.claude/`、`output/`；本 log 更新尚未 commit）
- 已完成：`44aa217` - 初始化 S14-1 執行 log；`a9974fb` - 記錄 Step 0 commit hash；`d6e1759` - 記錄修改前彈窗基準截圖；`ec9fa99` - 記錄修改前基準 commit hash；`1e635b6` - 修復行動版 override/logout 彈窗置中；`ea359cd` - 記錄 Part A commit hash；`ac3b0c2` - 盤點固定 px 字級；`7d7fd67` - 統一功能文字字級 token
- 進行中：無
- 下一步：Step 5 執行本單收尾驗證：sync、check、test、test:visual、headless after 截圖整理
- 未決 / 待我確認：無
- 待裝置驗收：字級手感需使用者在 POCO F6 Pro 或實機確認

## 前置狀態
- 已讀：`README.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\00-總綱-架構與共用紅線.md`
- 已讀：`C:\Users\wayde.fu\OneDrive\桌面\FLG-重做執行單-S14\01-行動版彈窗修復與字級系統.md`
- 分支：`codex/arcane-sage-core-20260522`
- 開工時工作樹：有既有未追蹤 `.claude/`、`output/`
- `docs/s14-1-execution-log.md`：開工時不存在，本步新增

## 步驟紀錄

### Step 0 - 初始化執行 log
- 狀態：完成
- 目的：建立本單唯一恢復來源，避免後續靠對話記憶續工
- 修改：新增本檔與固定恢復區塊
- 風險：文件-only，無產品行為風險
- 結果：完成
- Commit：`44aa217`

### Step 1 - 修改前基準截圖
- 狀態：完成
- 目的：在改 CSS 前留下桌面 1280 與行動 375x812 的版面證據
- 方式：本機 headless server 服務 `public/`，Playwright 開啟頁面；為避免外部 CDN / WebGL 截圖超時，截圖時封鎖外部請求但使用本機 `public/index.html` 與 CSS
- 產物：
  - `output/s14-1/before/desktop-1280-page.png`
  - `output/s14-1/before/desktop-1280-overrideWindow.png`
  - `output/s14-1/before/mobile-375x812-page.png`
  - `output/s14-1/before/mobile-375x812-overrideWindow.png`
  - `output/s14-1/before/metrics.json`
- 結果：桌面 `#overrideWindow` centeredDelta `(0,0)`；行動版 `#overrideWindow` `left:10px; top:10px`，centeredDelta `(0,-251)`，確認行動版目前不是置中模型
- 風險：只產生本機截圖與更新 log，無產品行為風險
- Commit：`d6e1759`

### Step 2 - Part A 行動版彈窗置中修復
- 狀態：完成
- 修改：
  - `public/index.html:6007-6040`：`overrideMaterializeMobile` 與 `overrideDissolveMobile` 每個 keyframe 都補 `translate(-50%, -50%)`
  - `public/index.html:6279-6294`：行動版 `.override-window` 改用 `top:50%` / `left:50%` / `width:min(94vw,460px)` / `transform-origin:center center`
  - `public/worldforge-login.html`：已執行 `npm run sync:login-mother`，同步同版修改
- 原因：讓行動版 override/logout 彈窗與桌面及 GSAP inline transform 使用同一套置中模型，避免開啟或關閉動畫期間跑位
- 驗證：
  - `output/s14-1/part-a/metrics.json`
  - 桌面 1280：`connectionWindow`、`overrideWindow`、`logoutConfirmWindow` 均在 viewport 內，centeredDelta `(0,0)`
  - 行動 375x812：三個視窗均在 viewport 內；`overrideWindow`、`logoutConfirmWindow` centeredDelta `(0,0)`，rect `left:11 top:261 right:364 bottom:551`
  - 行動 reduced-motion：`overrideWindow`、`logoutConfirmWindow` 均可見、置中、無動畫，centeredDelta `(0,0)`
- 風險：只影響 `@media (max-width: 620px)` 的 `.override-window` 與 mobile keyframes；可能改變小螢幕彈窗垂直位置，但驗證結果符合置中需求
- Commit：`1e635b6`

### Step 3 - Part B 固定 px 字級盤點
- 狀態：完成
- 指令：`rg -n "font(-size)?: *[0-9.]+px" public/index.html`
- 結果：共 37 個命中
- L1 功能層優先替換候選：
  - `2091`, `2139`：工作台 nav action / avatar
  - `2353`, `2434`, `2446`：帳號/歷史操作與空狀態
  - `2554`, `2571`, `2580`：手稿 meta / spell chip
  - `2965`, `2985`, `3049`, `3162`：結果操作、複製、狀態 / 進度
  - `4924`, `5020`, `5030`, `5043`, `5047`, `5086`, `5100`, `5116`：行動版功能文字覆寫
- 先保留或延後候選：
  - `422`, `429`, `702`, `1036`, `1181`, `1827`, `2726`, `2776`, `2971`, `3225`, `4752`：偏裝飾 HUD / mono 角標或非主要閱讀文字，避免本單過度改動視覺語彙
  - `717`, `723`, `1850`, `2734`, `2803`, `2820`：需再看上下文，若屬功能文案再納入
- 備註：執行單給的 `rg -nE` 在此環境會被 ripgrep 視為 encoding 旗標而失敗，改用 ripgrep 原生 regex
- Commit：`ac3b0c2`

### Step 4 - Part B 字級 token 與 L1 功能層替換
- 狀態：完成
- 修改：
  - `public/index.html:68-83`：新增 `--fs-nano`、`--fs-caption`、`--fs-body`、`--fs-title`、`--fs-display`，並讓既有功能文字 token 指向新階梯
  - L1 功能文字改用 token：連線視窗、override 內文、工作台 nav/action、帳號/歷史操作、手稿 meta、禁詞 chip、結果卷宗、複製按鈕、進度/狀態列、手機版結果/按鈕覆寫
  - `public/worldforge-login.html`：已執行 `npm run sync:login-mother` 同步
- 固定 px 殘留：
  - `427`, `434` boot status
  - `1041` auth seal strip
  - `1832` override header
  - `2731` tool-module mono heading
  - `4757` mobile brand caption
  - 結論：上述為裝飾 / mono 角標或登入品牌 caption，非主要 L1 閱讀與操作文字，本單先保留
- 驗證：
  - `output/s14-1/part-b/metrics.json`
  - 手機 375x812：`draft`、`dossier`、`resultBody` computed font-size 約 `16.06px`，line-height 約 `27.3px`
  - 手機 375x812：`resultCopy` / `historyEmpty` 約 `12.45px`，`draftMeta` / `spellList` 約 `10.37px`
  - 桌面 1280：無水平溢出；手機 scrollWidth = viewport width `375`
  - `git diff --check` 通過
- 風險：視覺快照預期會有字級 diff；字級手感仍需使用者裝置確認
- Commit：`7d7fd67`
