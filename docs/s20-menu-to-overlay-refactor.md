# S20：帳號中樞 / 歷史紀錄 → 獨立彈窗重構

日期：2026-06-03
起始 HEAD：`8fc1847`（乾淨可復原）

## 問題
- account-menu / history-drawer 原在 `operational-deck` 內，該容器 `clip-path` 成為 fixed 後代的裁切上下文 → 兩選單被裁切、視覺遮擋、點不到。
- system-menu / 登出彈窗（override-window）正常，因它們在 deck 外（`.interface` 之前，body 直接子層）。

## 使用者決定
- 改成「像登出彈窗一樣的獨立彈窗」架構（脫離裁切）。
- **帳號中樞**：內容少 → 置中卡片。
- **歷史紀錄**：項目多 → 可滑動面板（內部捲動）。
- 輸出區（審稿結果）字體再加大一階。
- 舊碼可移除；相關程式都可動；逐項記錄。

## 技術依據（網路）
- Portal Pattern（Radix/Headless/MUI 標準）：把節點移到裁切容器外（body / 外層）脫離 clip-path/overflow 裁切。
- WebKit bug 160953：fixed 被有 overflow/clip-path 的祖先錯誤裁切。

## 範本 = override-window（登出彈窗）
- HTML：在 `.interface` 之前、body 直接子層；`aria-hidden` + `hidden` 控制。
- JS：`SaoWindowController` 的 `open(target)` / `close(target)`。
- 不被 clip-path 裁。

---

## 變更紀錄

### 過程教訓（重要）
- 第一次嘗試「大改 CSS base + 改 controller」引入多個 bug（h:0、定位飛出、grid 塌），且 preview 瀏覽器**內部快取**多次讓「改了沒生效」誤導判斷（磁碟/HTTP 都已更新，但 preview 渲染舊版）。
- 決策：**回退 index.html/main.js 到 HEAD，改用最小改動**：
  1. 只搬 HTML（account/history 出 deck → body 直接子層）。
  2. CSS base 完全不動（沿用既有 fixed 置中規則）。
  3. 在 `</style>` 前加一段 `body > #accountMenu/#historyDrawer` 的**高優先 `!important` 覆寫**，統一定位為 fixed 置中彈窗（壓過舊的 deck-context 規則如 position:static / :not([hidden]) 的 display:grid）。
  4. 顯隱沿用 `hidden` 屬性（controller open/close 已會切 hidden），`[hidden]` 時 `display:none !important`。

### Step 1 — HTML 搬移（完成）
- `#accountMenu`、`#historyDrawer` 從 `<nav>` 內移到 `<main class="interface">` 之前（body 直接子層）。
- 實測：parent=BODY、`has_clip_path_ancestor=false`（脫離裁切，核心修復）。

### Step 2 — CSS 權威覆寫（完成）
- `</style>` 前新增 `body > #accountMenu/#historyDrawer` `!important` 段：fixed 置中、account=flex 直欄/min(360px)、history=block 可捲動/min(500px)、`[hidden]` → display:none。

### Step 3 — 輸出區字體再加大一階（完成）
- 手機 `.result-section-body`（620px media）：`clamp(1.25rem…1.5rem)` → `clamp(1.375rem, 1.2rem+1.9vw, 1.75rem)`（22-28px）、line-height 2。
- 桌面 base：`var(--text-body)` → `clamp(1.125rem, 1.04rem+0.45vw, 1.3125rem)`（18-21px）、line-height 1.85。

### 驗證
- `npm run check` 0 error、CSS 大括號平衡 704/704、`npm test` 23/23。
- ⚠️ account/history 開啟後的實際顯示**因 preview 快取無法在開發環境確認**，需使用者實機（強制重整/無痕）驗收。CSS `!important` 特異性絕對足夠，磁碟/HTTP 已確認含新規則。

### Step 4 — 修頻閃 / 一條線 / 閃一下（playPanelOpen 重寫）
- 症狀：SYS 點擊後頻閃、帳號中樞只有一條線、鑑定紀錄閃一下才正常。
- 根因（兩個疊加）：
  1. `body > #accountMenu/#historyDrawer` 的 `transform/opacity/visibility !important` 鎖死了 `playPanelOpen` 的 WAAPI 動畫起始幀 → 卡成「一條線」。
  2. `playPanelOpen` 動畫每幀變 `filter:blur` + 逐幀 `clip-path`（共 16 處 blur）→ 手機 GPU 每幀重算高斯模糊跟不上 → 頻閃/卡幀（三選單共用此函式，故三者都中）。
- 修法：
  1. CSS 覆寫改用 `inset:0 + margin:auto` 置中（不碰 transform/opacity/visibility），不再與動畫衝突；只管定位+尺寸。
  2. `playPanelOpen` 重寫為純 `transform:scaleY + opacity` 的 3 幀塌展（移除所有 blur 與逐幀 clip-path），時長 760→320ms。只用 GPU 合成屬性，順暢不閃。
  3. account/history 已 CSS 置中，動畫不再疊 `translate(-50%,-50%)`（`baseTransform=""`）。
- 驗證：check 0、test 23/23、CSS 平衡。動效順暢需實機（preview 有快取）。

### Step 5 — 徹底改用「登出彈窗配方」+ 找到 !important 真兇
- 症狀（前幾步仍未解）：SYS 頻閃、帳號中樞看不到、鑑定紀錄閃一下沒置中。
- 真因（終於定位，computed 數值鐵證）：`body > #accountMenu` 覆寫的 `transform/opacity` 加了 **`!important`**。**CSS animation 無法覆蓋 !important 宣告**，所以 `overrideMaterialize` 動畫被鎖死在 0% 起始幀 `scaleX(0) scaleY(0.02)` → 面板永遠是「一條線 / 看不到」。登出彈窗正常正是因為它 base 的 transform/opacity **沒有 !important**。
- 修法（完整複製登出彈窗配方）：
  1. CSS：account/history 用 `body > #...` 完整套 override-window 配方（display:none → `[aria-hidden=false]` display:block + `overrideMaterialize` 動畫；`[data-closing]` → `overrideDissolve`）。**關鍵：transform/opacity 不加 !important**（只有 left/top/display/z-index 等定位用 !important 壓過舊規則）。
  2. JS：toggleAccount/toggleHistory 改用極簡 `openOverlayPanel`/`closeOverlayPanel`（只切 aria-hidden + hidden + data-closing，動畫全交 CSS），**棄用 playPanelOpen**（其逐幀 blur 是頻閃源）與 SaoWindowController（其 setLock/showDialogSurface/4500ms focus 副作用會干擾）。
- 驗證（computed 數值）：動畫 finish 後 `transform: matrix(1,0,0,1,…)` = scaleX(1) 完整展開、rect 347×134、置中、visible:true。✅

### 待移除（後續清理，非本次）
- 舊 `.account-menu[hidden]` / `:not([hidden])` / `.is-closing` / 手機 `position:static` 規則現被 `!important` 覆寫壓過、無害但冗餘，可於確認線上 OK 後清理。
