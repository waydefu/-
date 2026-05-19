# Fantasy Lore Guardian (西幻設定守門人)

AI 西幻單段文學級審查系統：Groq 推理 + Firebase Serverless。使用者貼上一段草稿後，系統以 SSE 串流回傳文學級重寫與精簡審查摘要。

> 狀態：production 運行中。Groq API key 已完成輪替，production 由 Firebase Secret Manager 管理；Markdown 文件不保留任何 key、key prefix 或緊急輪替紀錄。

---

## 核心特色

- **修改後全文**：保留原意與情節，提升文明感、歷史重量、空氣感、潛台詞、階級與宗教質地。
- **精簡審查摘要**：指出核心問題引句、最缺的重量與最終裁定，摘要長度控制在重寫內容的四分之一內。
- **五大審查面向**：西幻語感、角色存在感、世界真實性、情緒滲透、現代人格污染。
- **即時禁詞提示**：`spellcheck.worker.js` 背景比對 `forbidden-words.json`，結果顯示在 `#spellList` chip 清單。
- **SSE 串流與本機快取**：分析結果以 uid + SHA-256 key 隔離，LocalStorage 24 小時快取；草稿亦採 per-uid 儲存。
- **雲端歷史同步**：Firebase Auth（Google popup + 訪客）+ Firestore，歷史資料依帳號隔離。

---

## 技術架構

- **前端**：Vanilla JS ES Modules，無框架、無 build step，原生 CSS，Firebase JS SDK v10。
- **登入體驗**：Three.js 登入背景、HUD、WebAudio ambience；WebGL 或音訊不可用時不影響主要功能。
- **Service Worker**：舊版 PWA 快取已退役；`swkill.js` 與 `sw.js` 用於反註冊殘留 SW 與清除 Cache Storage，`sw-register.js` 保留作為舊入口的清理輔助。
- **後端**：Firebase Cloud Functions v2 `analyzeV2`，Node 22，Cloud Run，TypeScript，Groq `llama-3.3-70b-versatile`，SSE 長連線。
- **資料層**：Firebase Admin 驗 ID token；Firestore 儲存歷史紀錄；後端以 per-uid Firestore 文件做每日配額。
- **金鑰**：`GROQ_API_KEY` 使用 Firebase Secret Manager 與 `defineSecret`，不寫入程式碼或文件。
- **安全**：CSP `script-src` 無 `unsafe-inline`；CDN script 使用 `sha384` SRI；AI 回應以 DOMPurify 清理後渲染。

---

## 設計邊界

Groq 免費 on-demand tier 的 TPM 約束會限制 prompt + max_tokens 總量。本版定位為單段深度審查：

- 單次輸入上限：前後端皆為 1800 字。
- 不逐項對照外部《設定書》：依草稿內在邏輯與通用西幻文明法則審查。
- 後端 prompt 不注入外部知識庫，以控制 token 成本並維持免費 tier 內的單段審查定位。

---

## 主要路徑

- 前端入口：[public/index.html](public/index.html)
- 前端主流程：[public/js/app.js](public/js/app.js)
- API 串流：[public/js/api.js](public/js/api.js)
- 前端設定：[public/js/config.js](public/js/config.js)
- Cloud Function：[functions/src/index.ts](functions/src/index.ts)
- 系統 prompt / CORS：[functions/src/config.ts](functions/src/config.ts)
- Firestore rules：[firestore.rules](firestore.rules)

---

## 全專案優化方案

以下是 production 狀態下的建議順序：先保護成本與資料，再收斂前後端契約，最後提升體驗與維護效率。

### Phase 1：安全與成本防護

- 修正後端配額信任邊界：已移除前端提供 `batchId` 的免扣配額路徑，後端改以 server-generated quota event 計次與退還。
- 導入 Firebase App Check，降低外部腳本直接呼叫 `analyzeV2` 的風險。
- 收斂匿名使用策略：保留訪客體驗，但搭配 App Check、節流與更可靠的濫用偵測。
- 強化 Firestore rules：已將 `hasAll` 收緊為 `hasOnly`，限制多餘欄位，並檢查 `historyId == id`、`id` 格式、`ts` 合理範圍與欄位長度。
- 維持 Secret hygiene：文件、程式碼、issue、截圖都不保存 key、key prefix 或 Secret Manager 輸出。

#### App Check 落地決策

App Check 不需要另做登入頁。登入頁負責 Firebase Auth；App Check 是安全層，應在現有 Firebase 初始化流程中啟動，並保護後續 API / Firestore 請求。

目前 `analyzeV2` 是 `onRequest + SSE`，不建議為了 App Check 改成 callable function，否則會破壞串流回應模型。建議採用 Firebase App Check 的 custom backend 模式：

- 在 Firebase Console / Google Cloud 建立並註冊 Web reCAPTCHA Enterprise site key。
- 在 `public/index.html` 載入 Firebase App Check compat SDK。
- 在 `public/js/config.js` 保存 reCAPTCHA Enterprise site key（這是 public site key，不是 secret）。
- 在 `public/js/ui/auth.js` 的 `initFirebase()` 中，於 `firebase.initializeApp()` 後啟動 `firebase.appCheck()`，並開啟 token auto-refresh。
- 在 `public/js/api.js` 呼叫 `analyzeV2` 前取得 App Check token，放入 `X-Firebase-AppCheck` header。
- 在 `functions/src/index.ts` 中，於 Auth、quota、Groq 呼叫前驗證 `X-Firebase-AppCheck`；驗證失敗直接回 `401`，不消耗 Groq。
- 在 CORS preflight 的 `Access-Control-Allow-Headers` 加入 `X-Firebase-AppCheck`。

Rollout 建議：

- 第一階段：App Check 基礎管線已接好；`APP_CHECK_CONFIG.RECAPTCHA_ENTERPRISE_SITE_KEY` 已填入 public site key。前端會送 token，後端會驗證並記錄缺失/失敗，但 `ENFORCE_APP_CHECK = false` 時不阻擋。
- 第二階段：確認 App Check metrics 與錯誤率正常後，再強制拒絕未驗證請求。
- 本機開發：使用 App Check debug token，避免 localhost / emulator 開發被 reCAPTCHA 卡住。
- UI 原則：App Check 對使用者應不可見，不新增獨立頁面；若未來另做登入頁，應視為 UI / 效能架構決策，而不是 App Check 的必要條件。

### Phase 2：前後端契約收斂

- 統一輸入限制：已將前端 `LIMITS.MAX_INPUT_CHARS`、HTML `maxlength` 與後端 `MAX_DRAFT_CHARS` 對齊為 1800 字。
- 統一 timeout 策略：前端 UX timeout 已調整為 180 秒；Cloud Function 保留 540 秒作為 server hard cap，避免長串流被平台過早截斷。
- 統一錯誤格式：後端 HTTP 錯誤已回 `{ code, message }`，前端保留舊 `{ error }` 相容解析並優先顯示 `message`。
- 對齊 config 命名：`public/js/config.js` 與 `functions/src/index.ts` 的限制值、錯誤碼、配額語意要保持一致。

### Phase 3：測試與維護

- 建立 root-level `package.json`：已集中提供 `check`、`build:functions`、`check:frontend`、`check:functions`、`audit:functions` 等命令。
- 加最小測試集：SSE parser、input validation、Firestore rules contract 與 quota transaction 已補。
- 將 README 的常用檢查擴成固定維護流程，避免每次人工記命令。
- 定期追蹤 `npm audit` low-severity 依賴鏈，但不要直接套用 breaking `--force` 修復。

### Phase 4：UI 設計與體驗

設計方向應延續目前 Fantasy Lore Guardian 的原 UI：黑暗西幻、琥珀金 HUD、守門人儀式感、Three.js 登入背景與工具型主介面。不採用冷藍 cyber 帳密卡、陌生品牌名或與現有世界觀無關的科技登入頁。

#### 登入頁動態流程規劃

登入頁可以借鑑 SAO 式「登入即進入另一個世界」的節奏，但要轉譯成 Fantasy Lore Guardian 的守門人系統，不直接使用 `Sword Art Online`、`Aincrad`、角色名稱、原作歡迎字樣或角色創建流程。角色素體、捏臉、外觀參數調整整段跳過，避免登入頁膨脹成遊戲角色系統。

- 待機狀態：沿用目前參考圖方向，中央是琥珀金儀式核心與環狀 HUD，左右維持 `SYSTEM STATUS`、`REAL TIME SYNC`、`SYSTEM ANALYSIS`、`DEVICE INFO`、`CORE LOAD`、`CONSOLE LOG` 等半透明面板。登入按鈕置中，畫面看起來像黑暗西幻版 tactical arcane interface。
- 中央認證面板：Email / Password 註冊與登入應嵌入中央動畫核心內，作為主要體驗。待機時顯示「建立守門人通行證 / 已有通行證」切換；欄位以半透明琥珀玻璃面板從環狀 HUD 中展開，不做成獨立白底表單或外部風格卡片。
- 註冊體驗：首次使用者走「建立通行證」流程，依序填入顯示名稱、email、密碼、確認密碼；每完成一欄，周圍 HUD 可短暫亮起對應狀態，例如 `IDENTITY`、`MAIL LINK`、`PASS SEAL`。送出後才呼叫 Firebase Auth 建帳，成功後進入完整 warp。
- 既有帳號登入：登入模式只保留 email 與密碼，視覺上仍放在中央核心；按下登入後進入短版認證掃描，再依實際 Auth 結果決定成功轉場或顯示錯誤。
- 旁側身份入口：Google 登入不要放在主按鈕位置，改放右側或下方的次要 HUD 模組，例如 `EXTERNAL IDENTITY`。訪客登入可放在同一模組下方，標示為 `GUEST ACCESS`，降低視覺優先級但保留可用路徑。
- 認證觸發：使用者點擊 Google、訪客或未來 Email / Password 登入後，登入按鈕鎖定，中央核心由一點亮光啟動，HUD 開始顯示 `AUTH REQUEST`、`TOKEN CHECK`、`SECURE CHANNEL`。不要做假帳密自動填入動畫，以免和真實驗證狀態混淆。
- 光纖隧道：驗證成功後才進入 LINK START warp。視角從中央光點高速穿入由金色光纖、符文線、資料粒子與環形軌道組成的隧道；主色仍是黑、琥珀、金，淡藍或白光只作為少量高亮，不改成冷藍 cyber 風。
- 系統自檢：穿梭期間用半透明 HUD 快速跑狀態列，不宣稱真實五感同步；改用符合本網站的項目，例如 `DISPLAY`、`AUDIO`、`AUTH TOKEN`、`APP CHECK`、`FIRESTORE SYNC`、`ENCRYPTION`、`STREAM CHANNEL`，成功顯示 `[ OK ]`，未導入項目顯示 `[ PENDING ]` 或不出現。
- 登入確認：隧道盡頭以短促白光覆蓋，接著浮現自有文案，例如 `GUARDIAN ACCESS CONNECTED`、`WELCOME, LORE KEEPER` 或 `FANTASY LORE GUARDIAN ONLINE`。白光需限制亮度與時間，避免手機上刺眼或造成轉場白屏誤判。
- 降臨主工具：白光退去後不是角色創建，而是主工具頁逐步渲染：導覽列、草稿輸入、分析面板、歷史面板依序淡入；語意是「進入守門人工作台」，不是「進入遊戲世界」。
- 失敗與取消：驗證失敗不播放完整 warp，只在登入卡片內以低亮度紅琥珀提示錯誤，保留重試按鈕；使用者取消 Google popup 時不顯示錯誤，回到待機狀態。
- 低效能與可及性：`prefers-reduced-motion`、WebGL 不可用、手機低效能時跳過隧道與白光，只保留簡短 HUD 掃描與淡入；所有動態都不得阻斷鍵盤 focus trap、aria-live 與登入錯誤提示。

- 主介面定位應維持工具型：讓輸入、分析、歷史、帳號狀態一眼可掃，不做 landing page 或大型說明頁。
- 登入頁保留強風格，但要收斂成「西幻守門人系統」：保留 `#loginScreen`、`#loginGl`、HUD、ambient、LINK START warp；只優化層級、文案、按鈕與表單密度，不重做成另一套視覺語言。
- 色彩沿用深黑、焦褐、琥珀金、羊皮紙文字與微紅警示；藍色或冷色只可作為極少量輔助狀態，不作為主視覺。
- 登入卡片應像魔法終端或守門人認證面板：保留盾牌 / 守門人品牌訊號、角標、細線分隔、光暈與低對比 HUD；避免厚重霓虹框、大面積藍色漸層、過亮科技背景。
- 若新增 Email / Password 帳密登入，應整合在中央動畫認證面板內：使用「登入 / 註冊」切換，欄位樣式沿用琥珀玻璃輸入框；Google 登入與訪客登入移到旁側次要 HUD 模組，不刪除既有可用路徑。
- 註冊流程只收必要欄位：顯示名稱、email、密碼、確認密碼；登入流程只收 email 與密碼。密碼規則與錯誤提示需短、清楚、貼近現有語氣。
- 登入文案維持專案語感，例如「進入守門人系統」、「註冊後同步審查歷史」、「訪客模式不保證跨裝置保存」；不要使用範例圖中的外部品牌或不相關口號。
- 主工具進入後要降低視覺噪音：登入頁可以有儀式感，但工作區應偏安靜、清晰、可長時間閱讀與修改草稿。
- 統一狀態文案：loading 步驟需對齊實際後端流程，避免出現「載入世界資料庫」這類已不符合實作的提示。
- 強化結果閱讀：已分區顯示「修改後全文」與「審查摘要」，並提供完整複製、分區複製、重新分析、回到輸入位置。
- 優化歷史面板：已強化目前選中項、單筆刪除確認、批次刪除確認與手機文字擠壓處理。
- 行動裝置檢查：測試登入動畫、textarea 高度、鍵盤彈出、歷史下拉、結果閱讀在手機上的可用性；登入框不得被 HUD、鍵盤或安全區遮住。
- 效能防護：Three.js 登入背景維持 lazy import，並確認 WebGL cleanup、reduced-motion、低階手機 fallback 都穩定。
- 可及性：保留 keyboard flow、focus trap、aria-live；新增或調整互動元件時同步檢查 focus、label、對比與文字溢出。

### Phase 5：部署與觀測

- 增加 structured logging：已記錄 request id、uid hash、latency、status、quota result，不記錄草稿內容或原始 uid。
- 補部署後驗證清單：Hosting 載入、Google 登入、訪客登入、SSE 首字輸出、Firestore 歷史同步、CSP 無錯誤、舊 SW 已清除。
- 保留最小 rollback 路徑：functions 與 hosting 分開部署，避免 UI 與後端契約同時失配時難以回復。

---

## 部署

本機 C 槽空間不足時，請在 PowerShell 同一段命令內指定 F 槽 cache/tmp：

```powershell
$env:npm_config_cache="F:\npm-cache"; $env:TEMP="F:\tmp"; $env:TMP="F:\tmp"; $env:FUNCTIONS_DISCOVERY_TIMEOUT="120"
Set-Location "F:\瀏覽器下載\小說網站"
firebase deploy --only functions
firebase deploy --only hosting
```

Functions deploy 會透過 `firebase.json` 的 predeploy 自動執行 `npm --prefix "$RESOURCE_DIR" run build`。

常用檢查：

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build:functions
npm.cmd run audit:functions
```

---

## 維護注意

- 不要在 Markdown、程式碼、截圖或 issue 內記錄任何 API key、key prefix 或 Secret Manager 輸出。
- 若重新部署 Functions 後 URL 改變，需同步更新 `public/js/config.js` 的 `API_CONFIG.FUNCTIONS_URL` 與 `public/index.html` 的 CSP `connect-src`。
- 後續優化依「全專案優化方案」順序推進，優先處理安全、成本與資料規則，再做 UI 與體驗調整。

---

## 優化紀錄

- 已初始化本機 Git baseline，可用 `git status`、`git diff`、`git restore <path>` 檢查與復原。
- 已新增 root-level `package.json`，統一前端 JS 與 Functions TypeScript 檢查命令。
- 已強化 Firestore history rules：只允許固定欄位、文件 id 必須等於資料內 `id`、限制 id 格式、時間戳與字串長度。
- 已修正配額信任邊界：分析請求不再接受前端 `batchId` 作為免扣依據，輸入驗證也移到扣配額之前。
- 已統一輸入上限：前端、HTML 與後端都以 1800 字為單段審查限制。
- 2026-05-19 已部署 Firebase：`functions`、`hosting`、`firestore.rules` 皆已發布；Hosting URL 為 `https://project-7276420283723642146.web.app`，Function URL 維持 `https://analyzev2-yxfwrism4q-uc.a.run.app`。
- 已統一 HTTP 錯誤格式並部署：後端改回 `{ code, message }`，前端可解析新格式並相容舊 `{ error }`。
- 已加入並部署 App Check report-only 管線：前端支援 reCAPTCHA Enterprise site key、送出 `X-Firebase-AppCheck`，後端可驗證並記錄但尚未強制阻擋。
- 已調整並部署 timeout 與 loading 文案：前端分析等待改為 180 秒，進度文案改為安全連線、Groq 串流審閱、整理重寫與摘要。
- 已調整 App Check 與 Functions logging：site key 未啟用時不刷 missing-token log，Functions 改用 structured logging，記錄 request id、uid hash、latency 與狀態，不記錄草稿內容。
- 已修正 SSE error handling：串流期間若後端送出 `data: { error }`，前端會正確中斷並顯示錯誤，不會被 JSON parse fallback 吞掉。
- 已填入 App Check reCAPTCHA Enterprise public site key，仍維持 report-only，不強制阻擋請求。
- 已新增 SSE helper 最小測試：覆蓋 chunk 邊界、`[DONE]`、串流錯誤 payload 與新舊後端錯誤格式。
- 已抽出、測試並部署後端草稿驗證：覆蓋空值、非字串、超長、結構性 system prompt 標記與正常小說對白誤殺防護。
- 已新增 Firestore rules contract 最小測試：覆蓋 owner-only、固定欄位、id/ts 範圍、草稿/結果/preview 長度與 default deny；官方 emulator 套件安裝因本機 npm 逾時，先採零依賴測試鎖住規則意圖。
- 已抽出 quota transaction helper 並新增最小測試：覆蓋每日重置、server-generated event id 冪等扣款、匿名/登入每日上限、Groq 失敗退還與退還冪等。
- 已優化歷史面板：目前載入項會顯示「目前」標記與更明確的 active 狀態；單筆刪除改為二次確認；手機版調整確認列、按鈕與長文字換行。
- 已優化結果閱讀：分析結果分成「修改後全文」與「審查摘要」兩塊，新增完整/分區複製、回到輸入與重新分析操作，並補 result parser 測試。

---

## 死碼清理紀錄

已移除目前入口不使用的維護噪音：

- 根目錄舊版單檔前端 `script.js`。
- 沒有對應 `package.json` 的根目錄 `package-lock.json`。
- 未接入後端 prompt 的 `functions/src/knowledgeData.ts` 與其舊編譯輸出。
- 未可達的前端長稿分段流程與 `CHUNK_SIZE` 設定；目前只保留單段審查路徑。

保留 `swkill.js`、`sw.js` 與 `sw-register.js` 作為舊 Service Worker / Cache Storage 的退場清理機制。

---

## 授權與宣告

- 作者：Fantasy Lore Guardian Team
- All rights reserved.
