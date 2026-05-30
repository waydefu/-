# S16 全專案稽核報告

## 進度區塊（最新）
- 分支：`codex/arcane-sage-core-20260522`　工作樹：有未提交/未追蹤（`.claude/`、`output/`）　HEAD：`e39da5f`
- 已掃完面向：✅ [A 前置基準] ✅ [B 後端正確性與安全] ✅ [C 前端架構與死碼] ✅ [D UI/UX 行為] ✅ [E 無障礙 a11y] ✅ [F 效能] ✅ [G 前端安全] ✅ [H 一致性與漂移] ✅ [I 依賴與建置] ✅ [J 邊界/錯誤路徑]
- 進行中：無
- 下一個面向：S16/S17 修復驗證完成；後續新增需求另開單
- 已記錄問題數：P0=0 P1=3 P2=7 P3=3

## 修復狀態（2026-05-31）
- 已修：App Check missing log、CSP/SRI、SSE 中途錯誤退還 quota、Groq 錯誤正規化、前端 network error 繁中訊息、登出清本機草稿/歷史、依賴 patch、`output/` ignore。
- 已修 S17 UI/UX：SYSTEM menu 可抵達帳號中樞、1366 首屏密度、reduced-motion connection final state、可見按鈕 44px target assertion、手機草稿短提示、工作區選單本地化、互動 visual tests。
- 依最新使用者指示：Auth 暫時只留 Google 登入；S16 P1 的匿名/Email 方向先略過，不實作。
- 本地驗證：`npm run check`、`npm test`、`npm run test:visual -- --reporter=line --workers=1`、`npm run test:a11y -- --reporter=line --workers=1`、`npm run build`、root/functions `npm audit --audit-level=moderate`、`git diff --check` 均通過。

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

## E. 無障礙 a11y

### 掃描摘要
- `npm run test:a11y` 已在 A 面向執行：登入頁、工作區、歷史抽屜 3 項通過，axe impact counts `{}`，critical/serious 違規 0。
- viewport meta 為 `width=device-width, initial-scale=1.0, viewport-fit=cover`，未見 `maximum-scale`。
- skip-link 存在：`public/index.html:5053` 指向 `#draftField`；CSS 有 `.skip-link:focus` 與全域 `:focus-visible`。
- dialog / modal ARIA：`#overrideWindow` 與 `#logoutConfirmWindow` 有 `role="alertdialog"`、`aria-modal="true"`、`aria-labelledby`、`aria-describedby`；登入 `<dialog id="ritualStack">` 有 `aria-labelledby` / `aria-describedby`。
- live region：`#connectionWindow`、`#ritualStatus`、`#operationalStatus`、`#spellList`、`#analysisDossier`、`.notification-stack`、`#announcer` 均有 `aria-live` 或 `role=status` 路徑。
- textarea：`#draftField` 有 `<label for="draftField">`，並以 `aria-labelledby="draftFieldLabel"`、`aria-describedby="draftFieldHelp charCount spellWarn"` 關聯輔助文字。
- `prefers-reduced-motion` 分支存在並覆蓋全域動畫/transition、主要背景/視窗/按鈕動畫；D 面向已另列 connection popup reduced-motion final state 缺口。
- WCAG AA 對比：README 既有 baseline 記錄主文字、placeholder、狀態、按鈕等估算皆通過；本輪未另跑色彩工具，信心標中。

### E 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P2 | E | `public/index.html:1958`、`public/index.html:3736`、`public/index.html:5218`、`public/index.html:5220` | ❓待確認：結果區 `#copyAllButton` / `#clearDraftButton` 宣告 `min-height:44px`，但 headless rendered rect 量到桌機約 40.6px、手機約 42.4px，疑似受祖先 `contentSlideUp` transform/fill 影響。 | 可能低於 44×44 target size 基準，對觸控與精細動作使用者較不友善。 | 用真實 runtime final state 再確認；若成立，調整按鈕實際渲染高度或避免長駐 transform 壓縮可點擊面積。 | 中 |

## F. 效能

### 掃描摘要
- `public/index.html` 計數：`@keyframes=26`、`filter:` 77、`backdrop-filter:` 18、`box-shadow:` 68、`animation ... infinite` 8。
- 常駐/循環動畫命中：boot scan/progress/sigil、button spinner、glyph spin、`corePulse 4.4s infinite`；`body.operational .core-pulse i` 會調為 3.4s。這些多屬 VFX 語言，且 reduced-motion 分支會關閉/縮短。
- WebGL lifecycle：`SceneManager` 與 `LinkStartFX` 皆有 `webglcontextlost` / `webglcontextrestored` listener；`SceneManager.cleanup()` 呼叫 `disposeObjectTree(this.scene)`；主 runtime 有 `visibilitychange` pause/resume 與 `cancelAnimationFrame`。
- CLS：A 面向 `npm run test:visual` 14 項通過，包含 `tests/visual/cls.spec.ts`，且 static boot-complete layout CLS < 0.1。
- 首屏載入：head 內已有 fonts / Firebase / jsDelivr / Functions preconnect，並有 core/services/utils/webgl modulepreload。
- 外部 Firebase compat scripts 皆 `defer crossorigin="anonymous"`；Three 由 importmap 指向 jsDelivr。SRI/CSP 風險留到 G 面向記錄。

### F 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| - | F | - | 未記錄 P0-P3 問題。 | 效能掃描未見新的阻塞性退化；高 VFX 成本目前由 reduced-motion、visibility pause、dispose 與 visual/CLS tests 承接。 | 後續若新增 VFX，持續追蹤 filter/backdrop/filter/box-shadow 與 infinite baseline 是否膨脹。 | 中 |

## G. 前端安全

### 掃描摘要
- CSP：`firebase.json` 使用 `Content-Security-Policy-Report-Only`，不是 enforce header；`script-src` / `script-src-elem` 仍含 `'unsafe-inline'`。
- SRI：外部 Firebase compat scripts 與 importmap 指向的 jsDelivr Three URL 未見 `integrity=`。
- XSS 寫入點：主要使用者/模型輸出路徑為 `renderAnalysisResult()` → `createResultSection()` → `renderMarkdownLite()`；`renderMarkdownLite()` 先 `escapeHtml()` 再轉換有限 Markdown tag，未見 DOMPurify/marked 直接信任 HTML。
- 其他 `innerHTML`：分析進度 shell 與 HUD/system 靜態模板為固定字串；visual test helper 的 `innerHTML` 不屬產品 runtime。
- 前端 secret 掃描：`public/js/core/config.js` 內 Firebase web `apiKey`、Functions URL、reCAPTCHA Enterprise site key 為 README 定義的 public runtime config；未見 Groq key / server secret / `sk-` / `gsk_`。
- localStorage：`draftKey()` / `historyKey()` 使用 uid/guest session suffix，跨帳號讀取隔離；但登出流程沒有清除目前 uid 的本機草稿/歷史。

### G 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P1 | G | `firebase.json:50`、`firebase.json:51`、`public/index.html:24` | CSP 仍是 Report-Only，且 `script-src` / `script-src-elem` 允許 `'unsafe-inline'`；外部 Firebase/jsDelivr 資源未見 SRI。 | 瀏覽器目前只回報不阻擋，若有 XSS 或供應鏈腳本異常，前端防線偏弱。 | 先以 hash/nonce 收斂 importmap/inline script，移除 script `unsafe-inline`，再從 Report-Only 切 enforce；外部 CDN 補 SRI 或改成本機 pin 版資產。 | 高 |
| P2 | G | `public/index.html:8747`、`public/index.html:8751`、`public/index.html:9435`、`public/index.html:9440` | 登出前會 `saveDraft()`，但只移除 `worldforgeGuest`；per-uid `flg_draft_v1_<uid>` / `flg_history_v2_<uid>` 仍留在 localStorage。 | 同一瀏覽器/裝置上仍殘留上一位使用者草稿與分析歷史，雖不會跨 uid 自動載入，但有共享裝置隱私風險。 | 登出時提供「清除此裝置本機草稿/歷史」或至少清除目前 uid draft cache；若保留是設計，需在 UI/README 明示。 | 高 |

## H. 一致性與漂移

### 掃描摘要
- `public/index.html` 與 `public/worldforge-login.html` SHA256 完全一致：`D598E58AB43CB250D1B2AFF0D79271AF18DA32A619DF4FC825E33162B149F0EC`；兩者大小皆 `356931` bytes。
- `.clinerules` 與 `.cursorrules` hash 不同；逐行比對只看到標題檔名不同，內容實質一致。
- 產品 HTML：`gsap` 0、`.sao-btn-glitch` 0、根目錄 `script.js` 不存在；與 README / rules 的部分敘述不一致。
- 繁中/英文字串：產品內有大量 HUD 英文（`SYSTEM HANDSHAKE`、`APPRAISAL ENGINE` 等），符合 README 的 VFX 語彙；未將其列為文案問題。`placeholder` 為繁中。

### H 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P1 | H | `README.md:89`、`README.md:278`、`README.md:366`、`public/index.html:5126`、`public/index.html:7905` | 登入規格漂移：README 同時宣稱 Google-only、Email/Password、匿名訪客；產品碼只呈現 Google popup，且未找到 `signInAnonymously` / Email Auth 路徑。 | 執行單宣稱真實架構含匿名 Auth，但目前 UI/runtime 看起來無匿名登入，訪客 quota 與匿名流程可能實際不可用或只剩本機 guest flag。 | 先決策正式支援範圍：若要 Google+匿名，補匿名 Auth UI/runtime 與驗收；若只保留 Google，更新 README/rules/測試與配額敘述。 | 高 |
| P2 | H | `.clinerules:47`、`.cursorrules:47`、`firebase.json:51` | 輔助規則檔宣稱 CSP 已移除 `unsafe-inline` 並加 SRI，但目前 Firebase header 仍 Report-Only + `unsafe-inline`，外部 scripts 未見 SRI。 | 舊規則會誤導後續安全判斷，可能讓下一輪 agent 誤以為 G 面向問題已解。 | 依 README 單一真相政策退役或改寫 `.clinerules` / `.cursorrules` 的安全段落；安全現況以本報告與 `firebase.json` 為準。 | 高 |
| P3 | H | `README.md:69`、`README.md:253`、`README.md:506` | README 仍提 GSAP、GSAP timeline cleanup 與舊 `maximum-scale=1.0` a11y baseline；產品 HTML 已無 GSAP，viewport 也已移除 maximum-scale。 | 文件雜訊會拖慢接手判斷，但目前不影響 runtime。 | 在下一輪文件清理中刪除或標註歷史段落，保留真正現況。 | 高 |

## I. 依賴與建置

### 掃描摘要
- root `npm outdated`：`firebase` current `12.13.0`、wanted/latest `12.14.0`。
- functions `npm outdated`：`groq-sdk` current `1.2.0`、wanted/latest `1.2.1`；`typescript` current/wanted `5.9.3`、latest `6.0.3`。
- root scripts：`check`、`test`、`test:visual`、`test:a11y`、`smoke:hosting` 已在 A 面向通過；`build:functions` 也由 `npm test` 執行。
- `.gitignore` 已排除 `functions/lib/`、`test-results/`、`playwright-report/`、`artifacts/`、`.npm-cache/`、`.tmp/`。
- `git status` 顯示 `output/` 目前未追蹤，且 `.gitignore` 未排除。

### I 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P3 | I | `package.json`、`functions/package.json` | 依賴有小幅漂移：root `firebase` patch update、functions `groq-sdk` patch update；TypeScript 6 是 major，不宜自動升。 | 目前 audit 為 0 漏洞且測試通過，屬維護排程，不是即時風險。 | 下一張維護單分開升 patch 依賴並重跑完整測試；TypeScript 6 另開相容性評估。 | 高 |
| P3 | I | `.gitignore`、`output/` | `output/` 目前未追蹤但未列入 `.gitignore`。 | Playwright/人工驗證產物容易長期污染工作樹，影響稽核與 commit 範圍判斷。 | 將 `output/` 納入 ignore，或定義其為有意保留的人工驗證輸出並建立清理規則。 | 高 |

## J. 邊界/錯誤路徑

### 掃描摘要
- 後端 token/未登入：`401 unauthorized` 與 `403 invalid-token` 有繁中使用者訊息，不碰 Groq。
- 後端 quota：匿名 5 / 登入 30 達上限時回 `429 quota-exceeded` 與可讀訊息。
- 後端 Groq 建連失敗：在 SSE headers 前 catch、`refundQuota()`、回 `503 ai-unavailable`；但未依 Groq status/code 細分。
- SSE 中途錯誤：後端送 `stream-interrupted` SSE error，前端 `parseSsePayload()` 會轉成 `AI 分析中斷：...`；B 面向已列不退 quota 風險。
- 前端 timeout：`AbortController` 180 秒 abort，AbortError 會顯示 `MSG.TIMEOUT`。
- Google popup 取消：`auth/popup-closed-by-user` 只顯示取消訊息、不播放 handoff，符合 README。
- WebGL：init/context-lost/restored/fallback/dispose 路徑存在；CSS 有 `html[data-webgl-fallback="context-lost"]` fallback。

### J 面向發現
| 嚴重度 | 面向 | 位置 | 問題 | 影響 | 建議 | 信心 |
|---|---|---|---|---|---|---|
| P2 | J | `functions/src/index.ts:259`、`functions/src/index.ts:262` | Groq API 建連錯誤一律回 `503 ai-unavailable` 並拼入原始 `apiErr.message`，未區分 429 rate limit、413/token budget、上游 503。 | 使用者與前端無法判斷是暫時服務不可用、限流、還是 prompt/token 過大；也可能暴露過多供應商錯誤文字。 | 依 `apiErr.status` / `apiErr.code` 正規化為固定 `{code,message}`，例如 `ai-rate-limited`、`ai-token-budget`、`ai-unavailable`。 | 中 |
| P2 | J | `public/index.html:8343`、`public/js/core/config.js:80` | 前端非 API error 會優先顯示 `error.message`；離線或 CORS/network fail 可能顯示瀏覽器英文 `Failed to fetch`，而不是既有繁中 `MSG.FETCH_FAIL`。 | 離線/網路中斷時使用者訊息不穩定，也不利客服或截圖回報。 | 只對 `isApiError` 使用 `userMessage`；一般 `TypeError` / network fail 統一顯示 `MSG.FETCH_FAIL`，必要時把 raw message 送 console。 | 中 |

## 優先修復順序（收尾彙整）
### P0
- 無。

### P1
| 優先 | 面向 | 位置 | 建議執行 |
|---:|---|---|---|
| 1 | H | `README.md:89`、`README.md:278`、`public/index.html:5126` | 先決策正式登入範圍：若架構真相是 Google+匿名，補匿名 Auth 路徑與驗收；若只保留 Google，立即清掉 README/rules/測試中的 Email/訪客承諾。 |
| 2 | B | `functions/src/index.ts:14`、`functions/src/index.ts:15` | App Check 先開 missing log，再以正式流量驗證後分階段 enforce，避免匿名/公開端點濫用。 |
| 3 | G | `firebase.json:50`、`firebase.json:51`、`public/index.html:24` | 收斂 CSP：移除 script `unsafe-inline`、補 hash/nonce/SRI 或本機 pin 資產，再由 Report-Only 切 enforce。 |

### 最該先做的 3 件事
1. 釐清並落地 Auth 產品契約（Google-only vs Google+匿名），因為它同時牽動 UI、quota、App Check 驗收與文件。
2. 開啟 App Check missing log，拿到正式流量證據後再 enforce，先把濫用觀測補起來。
3. 修 CSP/SRI：目前前端安全邊界是最大橫向風險，且 rules/README 已誤稱完成，容易被忽略。
