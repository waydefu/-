# S17 UI/UX 專項稽核報告

## 進度區塊（最新）
- 分支：`codex/arcane-sage-core-20260522`　工作樹：有未提交/未追蹤（`.claude/`、`output/`、本報告）　HEAD：`1d0fd8c`
- 稽核範圍：UI/UX 專項，不修改產品程式、不部署、不 push。
- 已掃完面向：✅ [A 前置基準] ✅ [B 桌機工作台] ✅ [C 手機 RWD] ✅ [D 彈窗與狀態回饋] ✅ [E Reduced Motion 與 A11y] ✅ [F 優先修復彙整]
- 進行中：無
- 下一個面向：等待 S17 修復單
- 已記錄問題數：P0=0 P1=2 P2=3 P3=2

## 稽核原則
- `public/index.html` 與 `public/worldforge-login.html` 不整檔讀取；只用 grep/定位後小窗讀取。
- 只診斷與寫報告；看到想修的項目只列入建議欄。
- UI 驗證優先用 Playwright / DOM rect / computed style eval；WebGL screenshot 不是必要依賴。
- 不確定項目標記 `❓待確認`，不以臆測當結論。

## A. 前置基準

### 指令基準
| 指令 | 結果 | 摘要 |
|---|---|---|
| `npm run test:visual -- --reporter=line --workers=1` | 通過 | 14 tests 全通過；涵蓋登入頁、工作區、歷史抽屜、帳號選單、登出確認、CLS、200% / 400% zoom。 |
| `npm run test:a11y -- --reporter=line --workers=1` | 通過 | 3 tests 全通過；登入頁、工作區、歷史抽屜 axe critical/serious 違規皆 0，impact counts `{}`。 |

### 驗證註記
- 先前平行跑 `test:visual` / `test:a11y` 曾在 120 秒超時；清掉殘留 Functions 子行程後，以 `--workers=1` 重跑通過。
- 本輪主要看既有 visual snapshots、測試 helper 與定位小窗，不整檔讀 `public/index.html`。
- 已檢視快照：
  - `tests/visual/worldforge.spec.ts-snapshots/login-390-chromium-win32.png`
  - `tests/visual/worldforge.spec.ts-snapshots/workbench-1366-chromium-win32.png`
  - `tests/visual/worldforge.spec.ts-snapshots/workbench-390-chromium-win32.png`
  - `tests/visual/worldforge.spec.ts-snapshots/account-menu-1366-chromium-win32.png`
  - `tests/visual/worldforge.spec.ts-snapshots/history-drawer-1366-chromium-win32.png`

### A 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| - | A | - | 基準測試最終通過。 | 無新增阻塞。 | 後續問題以 UI/UX source 與快照觀察列入。 | 高 |

## B. 桌機工作台

### 掃描摘要
- `workbench-1366` 快照顯示 1366×768 首屏只看得到工作區標題、說明文字與大型 textarea 上半段；主分析 CTA「啟動手稿鑑定引擎」與結果卷宗需要往下捲。
- 桌機 CSS 讓 `.codex-panel` 具 `min-height: clamp(480px, 68dvh, 780px)`，`draft-field-shell` 具 `min-height: clamp(300px, 42dvh, 460px)`，textarea 又吃滿 `min-height:100%`；共同把主 CTA 推出常見筆電首屏。
- `workbench-1366` 和 `account-menu-1366` 快照頂部 navigation 都只剩 `SYS SYSTEM`，看不到帳號狀態或帳號中樞按鈕。

### B 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P1 | B | `tests/visual/worldforge.spec.ts:17`、`tests/visual/worldforge.spec.ts:21`、`public/index.html:1901`、`public/index.html:1904`、`public/index.html:2583`、`public/index.html:2588`、`public/index.html:2639` | 1366×768 桌機首屏看不到唯一主分析 CTA；大型標題、說明與 textarea min-height 把「啟動手稿鑑定引擎」推到 fold 以下。 | 使用者貼完稿後需要先找按鈕/捲動，主流程的下一步不在第一視野，與「中央法典保留唯一分析主按鈕」的可用性要求衝突。 | 降低桌機首屏垂直占用：縮短桌機 h2/說明區、用 `minmax` 讓 textarea 高度吃剩餘空間，或把分析 CTA 做成 sticky/固定在草稿框下緣可見。 | 高 |
| P1 | B | `public/index.html:5161`、`public/index.html:8690`、`public/index.html:8772`、`public/index.html:8794`、`public/index.html:8806`、`public/index.html:8860`、`public/index.html:8916`、`tests/visual/helpers.ts:116`、`tests/visual/helpers.ts:138`、`tests/visual/helpers.ts:265` | SYSTEM menu 重構後，`accountToggle` 被 `navActions.replaceChildren(toggle)` 從 DOM 移除，但沒有被移入 `systemMenuPanel`；`toggleAccount()` 仍綁在不可見的 account button 上。既有「帳號選單」視覺測試直接 remove hidden，沒有走使用者可點擊路徑，快照也未顯示帳號選單。 | 使用者無法開啟帳號中樞，也看不到 session badge / sync state；測試名稱會誤導後續維護者以為帳號選單仍可用。 | 把帳號中樞納入 SYSTEM menu，或恢復可見 account toggle；同步改測試為「點 SYSTEM -> 點帳號中樞 -> accountMenu 可見」。若帳號中樞已退役，移除 nav 文案與死路徑。 | 高 |

## C. 手機 RWD

### 掃描摘要
- `login-390` 快照：登入 dialog 置中、Google CTA 可見，未見橫向溢出。
- `workbench-390` 快照：手機首屏能看到 SYSTEM menu、草稿輸入框、分析 CTA 與卷宗起始，主要工作流比桌機首屏完整。
- 手機 `<=560px` 隱藏 `.workbench-nav-title`，並把 `.draft-field-help` 變成 1px / clipped 的視覺隱藏文字；螢幕閱讀器仍有描述，但視覺使用者看不到「1,800 字以內、先完整重寫再摘要」這段操作提示。

### C 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P3 | C | `public/index.html:4189`、`public/index.html:4197`、`tests/visual/worldforge.spec.ts-snapshots/workbench-390-chromium-win32.png` | 手機版把草稿說明整段視覺隱藏，只留下 label、placeholder 與字數計數。 | 新使用者在手機上較難立即知道 1,800 字限制與輸出行為；a11y 不壞，但可學習性降低。 | 手機保留一行極短提示，例如「1,800 字內，先重寫再摘要」，或在 char count 附近顯示可折疊說明。 | 中 |

## D. 彈窗與狀態回饋

### 掃描摘要
- `login-390`：登入 dialog 不溢出，Google CTA 可見。
- `history-drawer-1366`：歷史抽屜可見，但開在工作區中段並覆蓋標題/輸入區；若保留浮動抽屜設計，需確保使用者能快速收合且不誤以為它是 modal。
- `account-menu-1366`：快照其實沒有顯示 account menu，只有一般 workbench + SYSTEM toggle；這已在 B 面向列為 P1。
- 登出確認已有 `role="alertdialog"` / `aria-modal` 路徑，S16 已驗證在桌機與手機 viewport 內。

### D 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P3 | D | `public/index.html:8780`、`public/index.html:8781`、`public/index.html:8788`、`public/index.html:8791`、`tests/visual/worldforge.spec.ts-snapshots/workbench-390-chromium-win32.png` | 主要 navigation 在手機/桌機都收斂成 `SYS SYSTEM`，`aria-label` 也是英文 `SYSTEM MENU`；它實際承載歷史、清除、重新鑑定、登出等核心操作。 | 視覺風格允許 HUD 英文，但核心操作入口過於泛化，繁中使用者不一定知道這是工作區操作選單。 | 保留 `SYS` 作裝飾 tag，但可見 label / aria-label 改成「系統選單」或「工作區選單」，menu 內再分組顯示歷史/草稿/帳號操作。 | 中 |

## E. Reduced Motion 與 A11y

### 掃描摘要
- `npm run test:a11y -- --reporter=line --workers=1` 通過，axe critical/serious 皆 0。
- `zoom.spec.ts` 200% / 400% visual tests 通過，400% zoom 無水平頁面捲動。
- `prefers-reduced-motion` 分支有大量動畫/transition 關閉規則，但 S16 已發現 `connectionWindow` 缺少 final visible state；本輪 source 小窗仍確認 `.connection-window[aria-hidden="false"]` 只被關動畫，沒有像 `.override-window` 補 opacity/transform final state。
- 既有 visual/a11y tests 不涵蓋 SYSTEM menu 使用者點擊路徑、mobile SYSTEM menu open、reduced-motion connection popup，也沒有 assertion 量 44×44 target size。

### E 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P2 | E | `public/index.html:3447`、`public/index.html:3460`、`public/index.html:3466` | reduced-motion 分支有 `.connection-window[aria-hidden="false"] { animation:none }`，但 final state 只補給 `.override-window[aria-hidden="false"]`，沒有補 connection window 的 opacity / transform / filter。 | 偏好減少動態的使用者可能看不到「連線確認」視窗，登入/同步狀態回饋消失。 | 在 reduced-motion block 補 `.connection-window[aria-hidden="false"]` 的 opacity 1、`translate(-50%, -50%) scale(1)` 與 filter none。 | 高 |
| P2 | E | `public/index.html:1958`、`public/index.html:2926`、`public/index.html:2934`、`public/index.html:4262`、`public/index.html:4264` | ❓待確認：S16 量到 `#copyAllButton` / `#clearDraftButton` rendered height 曾低於 44px；本輪官方 visual/a11y 通過，但沒有目標尺寸 assertion。 | 若動畫/transform final state 確實壓縮實際 hit target，手機和精細動作使用者會較難操作。 | 新增 Playwright DOM rect assertion：在 normal final state、workbench-materializing、mobile 390 下檢查所有可見 button min 44×44。若重現，修 CSS final state 或 min-height。 | 中 |
| P2 | E | `tests/visual/helpers.ts:116`、`tests/visual/helpers.ts:138`、`tests/visual/helpers.ts:265`、`tests/visual/worldforge.spec.ts:39`、`tests/visual/a11y.spec.ts:36` | 視覺/a11y 測試目前會直接打開 account/history 狀態或只測靜態工作區，沒有驗證使用者可從 SYSTEM menu 抵達 account menu；也未測 reduced-motion connection popup。 | UI 主要入口壞掉仍可能快照通過，S17 的 account menu P1 就是被這個測試缺口遮住。 | 補互動式 UI tests：點 SYSTEM menu、逐項開 history/account/logout；加 mobile menu open 快照；加 reduced-motion connection final state；加 target-size assertion。 | 高 |

## F. 優先修復彙整

### P0
- 無。

### P1
| 優先 | 面向 | 位置 | 建議執行 |
|---:|---|---|---|
| 1 | B | `public/index.html:5161`、`public/index.html:8794`、`public/index.html:8806`、`tests/visual/helpers.ts:265` | 修復 account center 可達性：把帳號中樞放回可點擊路徑，或正式退役並清掉文案/測試。同步補「從 SYSTEM menu 開 account」互動測試。 |
| 2 | B | `public/index.html:1904`、`public/index.html:2588`、`public/index.html:2639`、`tests/visual/worldforge.spec.ts-snapshots/workbench-1366-chromium-win32.png` | 調整桌機首屏工作台密度，讓主分析 CTA 在 1366×768 不需捲動即可看見。 |

### P2
| 優先 | 面向 | 位置 | 建議執行 |
|---:|---|---|---|
| 3 | E | `public/index.html:3447`、`public/index.html:3460`、`public/index.html:3466` | 補 reduced-motion connection window final visible state。 |
| 4 | E | `tests/visual/helpers.ts:116`、`tests/visual/helpers.ts:265` | 補 SYSTEM menu / account / reduced-motion / target-size 互動測試，避免快照只驗靜態外觀。 |
| 5 | E | `public/index.html:1958`、`public/index.html:2926`、`public/index.html:4262` | 複驗並修正 copy/clear/reanalyze 等可見按鈕 44×44 hit target。 |

### P3
| 優先 | 面向 | 位置 | 建議執行 |
|---:|---|---|---|
| 6 | C | `public/index.html:4189` | 手機保留一行短版草稿說明，降低新手學習成本。 |
| 7 | D | `public/index.html:8780`、`public/index.html:8791` | 將核心操作入口可見 label / aria-label 本地化為「系統選單」或「工作區選單」，保留 `SYS` 作裝飾 tag。 |

### 最該先做的 3 件事
1. 修 account center 可達性，因為目前「帳號選單」測試通過但使用者路徑實際不可達。
2. 調整 1366×768 工作台首屏密度，讓唯一分析 CTA 不掉到 fold 以下。
3. 補 UI 互動測試：SYSTEM menu 真實點擊路徑、reduced-motion connection popup、所有可見按鈕 44×44 target。
