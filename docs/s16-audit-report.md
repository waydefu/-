# S16 全專案稽核報告

## 進度區塊（最新）
- 分支：`codex/arcane-sage-core-20260522`　工作樹：有未提交/未追蹤（`.claude/`、`output/`）　HEAD：`5259365`
- 已掃完面向：✅ [A 前置基準] ✅ [B 後端正確性與安全] ✅ [C 前端架構與死碼] ✅ [D UI/UX 行為]
- 進行中：無
- 下一個面向：E 無障礙 a11y
- 已記錄問題數：P0=0 P1=1 P2=2 P3=0

## 稽核原則
- 只診斷、只寫報告；不修改程式、不部署、不 push。
- `public/index.html` 與 `public/worldforge-login.html` 不整檔讀取；只用 grep/計數或定位後小窗讀取。
- 每完成一個面向即更新本報告並建立對應 commit。
- 不確定項目標記 `❓待確認`，不以臆測當結論。

## A. 前置基準

### Git 基準
- 分支：`codex/arcane-sage-core-20260522`
- A 掃描前 HEAD：`1113780`
- 近 10 筆 commit：
  - `1113780 docs(s15): record remaining fix deploy`
  - `01ba737 docs(s15): record remaining fix validation`
  - `760a5b8 fix(s15-a): open google popup before visual preflight`
  - `aec514d chore(s15): clear functions audit findings`
  - `68a0da4 chore(s15): clear root audit finding`
  - `2e58d71 docs(s15): record remaining issue audit`
  - `e299f37 docs(s15): mark firebase deploy complete`
  - `5862827 docs(s15): record full firebase deploy`
  - `59f850d docs(s15): mark acceptance audit complete`
  - `63a7a05 docs(s15): record acceptance audit findings`
- 掃描前工作樹：未追蹤 `.claude/`、`output/`。

### 指令基準
| 指令 | 結果 | 摘要 |
|---|---|---|
| `npm run check` | 通過 | frontend `tsc --project jsconfig.json --noEmit`、functions `tsc --noEmit` 通過。 |
| `npm test` | 通過 | 5 suites / 23 tests 全通過；涵蓋 Firestore rules contract、validation、quota、result parser、SSE helpers。 |
| `npm run test:visual` | 通過 | 14 tests 全通過；涵蓋 CLS、登入/工作區桌機與手機、歷史抽屜、帳號選單、登出確認彈窗。 |
| `npm run test:a11y` | 通過 | 3 tests 全通過；登入頁、工作區、歷史抽屜 axe critical/serious 違規皆 0。 |
| `npm audit --audit-level=moderate` | 通過 | root `found 0 vulnerabilities`。 |
| `npm --prefix functions audit --audit-level=moderate` | 通過 | functions `found 0 vulnerabilities`。 |
| `npm run smoke:hosting` | 通過 | hosting shell/config/parser/HUD module/unauthorized contracts/quotaPeek checks 通過。 |

### `public/index.html` 計數基準
- 行數：`9904`
- `@keyframes` 出現數：`26`
- `console.` 出現數：`23`

### A 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| - | A | - | 未記錄 P0-P3 問題。 | 目前基準檢查全通過。 | 後續面向若發現風險再分級列入。 | 高 |

## B. 後端正確性與安全

### 已確認契約
- CORS 使用 `ALLOWED_ORIGINS` allowlist；未看到 `origin:true`。
- `analyzeV2` 與 `quotaPeek` 都有 `verifyIdToken` 驗證路徑。
- Groq 建連在 SSE headers 前完成；建連失敗會回 `503 ai-unavailable` 並呼叫 `refundQuota`。
- Secret 使用 `defineSecret("GROQ_API_KEY")` + `.value()` + `secrets:[GROQ_API_KEY]`；`functions/src/*` 未見 `process.env` 或硬編 Groq key。
- `validation.ts` 以 `MAX_DRAFT_CHARS = 1800`、結構性 system marker 偵測與 `invalid-format` 阻擋 prompt injection 標記。
- `quota.ts` 以 transaction 寫入 `quota/{uid}`，匿名 5、登入 30，`batches` 去重，`refundQuota` 會刪除 batchId 並避免負數。
- `firestore.rules` 僅開 `users/{uid}/history/{historyId}` owner read/delete/create/update，固定欄位白名單、id 格式、字串大小限制與 default deny 皆存在。

### B 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P1 | B | `functions/src/index.ts:14`、`functions/src/index.ts:15`、`functions/src/index.ts:177` | `ENFORCE_APP_CHECK=false` 且 `LOG_MISSING_APP_CHECK=false`，`analyzeV2` 對 missing/invalid App Check 只記狀態不阻擋也不記 missing log。 | 公開前端可被濫用匿名 Auth 反覆打 Groq，且目前缺少正式流量中 missing token 的觀測資料。 | 先開 `LOG_MISSING_APP_CHECK` 觀察 Email/Google/匿名正式流量，再分階段將 `ENFORCE_APP_CHECK` 切為 true。 | 高 |
| P2 | B | `functions/src/index.ts:261`、`functions/src/index.ts:287` | Groq 建連失敗會退 quota，但 SSE 串流中途 `stream_error` 只回 `stream-interrupted`，沒有退還或標記部分成功。 | 使用者可能收到失敗/不完整結果但仍消耗每日 5/30 次額度，會放大暫時性網路或上游串流錯誤的體驗成本。 | 明確定義「已輸出足量內容才算成功」或在 stream error 時依狀態退還 quota；同時補測試覆蓋。 | 中 |

## C. 前端架構與死碼

### 掃描摘要
- 產品 HTML `public/index.html` / `public/worldforge-login.html`：`gsap` 命中數皆為 0。
- `linkStart` 在兩份 HTML 各 35 次，且與 `#linkStartFX`、`LinkStartFX` runtime、metrics 與 lifecycle 路徑相連；未作為死殘留列 issue。
- `.sao-btn-glitch` 在兩份 HTML 命中數皆為 0；S14 移除層仍乾淨。
- 兩份 HTML 各有 `@keyframes=26`、`animation_names=25`，缺少對應 keyframes 的 animation name 為空。
- 兩份 HTML 各自檢查 `id="..."`，未發現同檔重複 id。
- 以函式/類別宣告列表抽查，兩份 HTML 的頂層 `function` / `class` 宣告未見同名重複。
- `public/js/*.js` 模組均可在入口 HTML、模組相依、tests、scripts、README 或 package script 中找到引用；未列孤兒模組。
- repo 內未找到根目錄或 public 根層的 `script.js` 檔案；未發現入口引用退役 `script.js`。
- README 仍提到 GSAP，但這屬文件漂移，保留到 H 面向記錄。

### C 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| - | C | - | 未記錄 P0-P3 問題。 | 前端死碼與架構抽查未見阻塞風險。 | H 面向再處理 README/文件漂移。 | 中 |

## D. UI/UX 行為

### 驗證方式與摘要
- 依執行單要求避免 screenshot 依賴，使用 Playwright headless + DOM rect/computed style eval。
- 嘗試啟 `5601` server 時 PowerShell/Start-Process 卡住；本機已有 `python -m http.server 5599` 服務同一份 public 首頁，故以 `http://127.0.0.1:5599/` 完成 DOM 驗證。
- 真實頁載入抽查：console error 0、request failed 0、HTTP 404 0。
- 桌機 `1280x800`：`#ritualStack` 560×304.5，置中且完整在 viewport 內；`#connectionWindow` 420×148.1、`#overrideWindow` 490.2×254.7、`#logoutConfirmWindow` 520×254.5，三者皆置中且完整在 viewport 內。
- 手機 `375x844`：`#ritualStack` 335.8×261.5，置中且完整在 viewport 內；`#connectionWindow` 337×138、`#overrideWindow` / `#logoutConfirmWindow` 352.5×288.7，皆完整在 viewport 內。
- 工作區按鈕：分析主按鈕、複製、清除手稿在桌機與手機均未超出父容器、未偵測文字 scroll overflow；`#reanalyzeButton` 因 hidden 為 0 寬，未列裁切問題。
- `body.workbench-materializing` 下 `.tool-module` 仍有 `contentSlideUp` stagger，delay 依序為 `0.12s`、`0.18s`、`0.24s`、`0.3s`、`0.36s`、`0.42s`。
- 歷史抽屜：DOM 僅 1 個 `#historyDrawer`；hidden 狀態 CSS 可落到 opacity 0 / visibility hidden，未列第二鬼影問題。
- 登入彈窗內文：`body.login-modal-entering` 對 `.auth-header`、`.seal-strip`、`#authTitle`、`#authPrompt`、`.auth-actions` 使用同一組 `contentSlideUp 0.36s ... 0.16s both`，屬整組同步淡入，不是逐條 stagger。

### D 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P2 | D | `public/index.html:665`、`public/index.html:699`、`public/index.html:3460` | `prefers-reduced-motion` 會關閉 `.connection-window[aria-hidden="false"]` 動畫，但未像 `.override-window` 補 final opacity/transform；headless reduced-motion 量到 connection popup 仍為 opacity 0 / scale 0。 | 偏好減少動態的使用者可能看不到「連線確認」狀態視窗，登入/同步回饋變弱。 | 在 reduced-motion 分支補 `.connection-window[aria-hidden="false"]` 的 opacity 1、`translate(-50%, -50%) scale(1)` 與 filter final state。 | 高 |

## 優先修復順序（收尾彙整）
- 尚未完成 B-J，待全掃描後彙整 P0/P1 與前三優先事項。
