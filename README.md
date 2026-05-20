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
- 中央認證面板：Email / Password 註冊與登入已嵌入中央動畫核心內，作為主要體驗。待機時顯示「登入 / 註冊」切換；欄位以半透明琥珀玻璃面板從環狀 HUD 中展開，不做成獨立白底表單或外部風格卡片。
- 四段式登入節奏：以 `ORIGIN LIGHT`、`TOKEN CHECK`、`LINK START`、`WORKSPACE RENDER` 取代原作五感同步與角色創建。使用者送出 Email、Google 或訪客登入後，中央核心先亮起，狀態列依序脈衝，表示 Auth / App Check / Firestore / SSE 通道正在接入。
- 初始連線儀式：第一次顯示登入頁時，先以夜間友善的暖黑背景跑終端機打字檢查（核心初始化、AES-256、guardian protocol、latency、App Check channel、secure status），完成後印出 `[ SECURE CONNECTION ESTABLISHED ]`。
- 暗金歡迎與展開：連線檢查後不使用白屏，改以低亮度暗金 veil 與符文環展開，中央淡入 `WELCOME TO FANTASY LORE GUARDIAN`，再以暗金碎片退場揭露黑金 HUD；中央核心、側邊面板與登入按鈕依序展開。
- 註冊體驗：首次使用者走「建立通行證」流程，依序填入顯示名稱、email、密碼、確認密碼；送出後呼叫 Firebase Auth 建帳，成功後進入完整 warp。
- 既有帳號登入：登入模式只保留 email 與密碼，視覺上仍放在中央核心；按下登入後依實際 Auth 結果決定成功轉場或顯示錯誤。
- 旁側身份入口：Google 登入已移到次要 HUD 模組 `EXTERNAL IDENTITY`；訪客登入保留在同一模組下方，降低視覺優先級但保留可用路徑。
- 認證觸發：使用者點擊 Google、訪客或未來 Email / Password 登入後，登入按鈕鎖定，中央核心由一點亮光啟動，HUD 開始顯示 `AUTH REQUEST`、`TOKEN CHECK`、`SECURE CHANNEL`。不要做假帳密自動填入動畫，以免和真實驗證狀態混淆。
- 光纖隧道：驗證成功後才進入 LINK START warp。視角從中央光點高速穿入由金色光纖、符文線、資料粒子與環形軌道組成的隧道；主色仍是黑、琥珀、金，淡藍只作為少量狀態高亮，不改成冷藍 cyber 風。
- 系統自檢：穿梭期間用半透明 HUD 快速跑狀態列，不宣稱真實五感同步；改用符合本網站的項目，例如 `DISPLAY`、`AUDIO`、`AUTH TOKEN`、`APP CHECK`、`FIRESTORE SYNC`、`ENCRYPTION`、`STREAM CHANNEL`，成功顯示 `[ OK ]`，未導入項目顯示 `[ PENDING ]` 或不出現。
- 登入確認：隧道盡頭以低亮度金色光霧覆蓋，接著浮現自有文案，例如 `GUARDIAN ACCESS CONNECTED`、`WELCOME, LORE KEEPER` 或 `FANTASY LORE GUARDIAN ONLINE`。避免整頁白屏與純黑硬切，讓夜間使用不刺眼。
- 降臨主工具：金色光霧退去後不是角色創建，而是主工具頁逐步渲染：導覽列、草稿輸入、分析面板、歷史面板依序淡入；語意是「進入守門人工作台」，不是「進入遊戲世界」。
- 失敗與取消：驗證失敗不播放完整 warp，只在登入卡片內以低亮度紅琥珀提示錯誤，保留重試按鈕；使用者取消 Google popup 時不顯示錯誤，回到待機狀態。
- 低效能與可及性：`prefers-reduced-motion`、WebGL 不可用、手機低效能時跳過隧道與強光，只保留簡短 HUD 掃描與淡入；所有動態都不得阻斷鍵盤 focus trap、aria-live 與登入錯誤提示。

- 主介面定位應維持工具型：讓輸入、分析、歷史、帳號狀態一眼可掃，不做 landing page 或大型說明頁。
- 登入頁保留強風格，但要收斂成「西幻守門人系統」：保留 `#loginScreen`、`#loginGl`、HUD、ambient、LINK START warp；只優化層級、文案、按鈕與表單密度，不重做成另一套視覺語言。
- 色彩沿用深黑、焦褐、琥珀金、羊皮紙文字與微紅警示；藍色或冷色只可作為極少量輔助狀態，不作為主視覺。
- 登入卡片應像魔法終端或守門人認證面板：保留盾牌 / 守門人品牌訊號、角標、細線分隔、光暈與低對比 HUD；避免厚重霓虹框、大面積藍色漸層、過亮科技背景。
- Email / Password 帳密登入已整合在中央動畫認證面板內：使用「登入 / 註冊」切換，欄位樣式沿用琥珀玻璃輸入框；Google 登入與訪客登入移到旁側次要 HUD 模組，不刪除既有可用路徑。若 production 顯示 `auth/operation-not-allowed`，需在 Firebase Console 啟用 Email/Password sign-in provider。
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

### Phase 6：現代網頁工程化路線圖

此階段目標是把目前可運行的 Firebase Serverless 專案，逐步提升到更接近現代前端工程標準的維護方式。導入順序建議保守推進，避免一次改成 Vite / CI/CD / env 管線時同時破壞 production。

#### Security & Configurations

- 目前狀態：Groq secret 已由 Firebase Secret Manager 管理；前端 Firebase web config、reCAPTCHA Enterprise site key、Cloud Function URL 是 public runtime config，不應當成 secret，但仍應集中管理與避免散落在多個檔案。
- 下一階段：若導入 Vite，將 public runtime config 移到 `.env` / `.env.production`，使用 `VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_PROJECT_ID`、`VITE_FUNCTIONS_URL`、`VITE_RECAPTCHA_SITE_KEY` 等名稱注入 build。
- 注意：`VITE_*` 變數會被打包到前端，不能放 Groq API key、Firebase Admin credential、private key 或任何真正的 server secret。
- 本專案已不使用 `APPS_SCRIPT_URL` / GAS；目前後端入口是 Firebase Functions `analyzeV2`，安全邊界應放在 Firebase Auth、App Check、CORS、quota、Firestore rules 與 Secret Manager，而不是隱藏 URL。
- 開發 / production 切換：若未導入 build tool，暫時維持 `public/js/config.js` 作為單一 public config；若導入 Vite，再將 dev/prod 對應到不同 Firebase project 或 emulator config。

#### IME 與中文輸入體驗

- 目前狀態：`public/js/app.js` 已使用 `compositionstart` / `compositionend` 搭配 `AppState.ime`，中文注音 / 拼音組字期間不觸發字數統計、禁詞掃描與草稿儲存。
- 維護原則：未來若新增自動分析、即時提示、快捷鍵或 spell worker 行為，都要避開 IME composing 階段，避免使用者還沒選字就觸發昂貴或干擾性的流程。
- 測試方向：補一個小型 DOM / event 測試，覆蓋 `compositionstart -> input -> compositionend` 時只在選字完成後更新 char count 與 schedule scan/save。

#### Canvas / HUD Performance

- 目前狀態：登入 Three.js 動畫使用 `requestAnimationFrame`，handoff / close 時會透過 `stopLoginFx()` 執行 `cancelAnimationFrame`、移除 resize listener、dispose geometry/material/composer/renderer，並嘗試 `forceContextLoss()` 釋放 WebGL context。
- 維護原則：任何新增動畫 loop 都必須有明確 cleanup；離開登入頁、WebGL context lost、reduced-motion、頁面 unload 都要能停止 CPU/GPU 工作。
- 優化方向：簡單 HUD 線條與角標優先使用 CSS transform / opacity；高成本 Canvas / WebGL 僅保留在真正需要 3D 或粒子深度的區域。
- 行動裝置策略：持續保留 `prefers-reduced-motion` 與 WebGL fallback；手機低效能時跳過長隧道、降低粒子數與 bloom 強度。

#### Robust API Architecture

- 目前狀態：分析流程已使用 `AbortController`，每次新分析會中斷前一筆請求，並以 `API_CONFIG.FETCH_TIMEOUT_MS` 做 180 秒 UX timeout；AbortError 會轉成 timeout 文案，避免 `isAnalyzing` 卡死。
- 維護原則：所有長時間 async request 都必須具備 timeout、取消、finally 狀態復原與可辨識錯誤文案。
- 後續方向：可以增加「取消分析」按鈕，直接呼叫目前保存在 `AppState.analyzeAbort` 的 controller；同時補測試確認取消後按鈕、loading、step timers、SSE buffer 都能復位。

#### CI/CD 與部署自動化

- 目前狀態：專案沒有 GitHub remote，且你目前不打算部署到 GitHub；因此不應強行加入 GitHub Actions 作為必要流程。
- 現階段做法：保留本機 `npm.cmd run check`、`npm.cmd test`、`npm.cmd run test:rules`、`npm.cmd run smoke:hosting`、`firebase deploy --only hosting/functions` 的手動發布流程，並用本機 Git commit 作 rollback 點。
- 可選未來路線：若之後要接 GitHub，只建立 CI 驗證 workflow（check/test/rules/smoke dry run）也可以，不一定要自動部署。
- 若未來確認要用 GitHub Actions 自動部署，再加入 Firebase Hosting deploy workflow：push 到 `main` 時執行 build/check/test，成功後用 GitHub Secrets 中的 Firebase service account 發布 Hosting；Functions 可維持手動或獨立 workflow，降低後端變更風險。
- 導入 Vite 後再做 build 壓縮與 asset hashing；目前無 build step，所以 Hosting smoke 仍以 `js/app.js?v=30` 檢查快取版本。

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
npm.cmd run smoke:hosting
npm.cmd run build:functions
npm.cmd run audit:functions
```

---

## 登入後煙霧測試

每次改登入頁、Auth、Hosting 或 Functions 後，先跑自動 smoke，再做一次人工登入後檢查：

```powershell
npm.cmd run smoke:hosting
```

自動 smoke 覆蓋：

- Hosting 首頁 200。
- 首頁載入目前 `js/app.js?v=31`。
- Email/Password 登入表單存在。
- `EXTERNAL SEALS` Google / 訪客入口存在。
- App Check SDK 與 public site key 存在。
- `result-parser.js` 已部署。
- 未登入 POST `analyzeV2` 會回標準 `401 { code, message }`，不碰 Groq。

Firestore rules 官方 emulator 測試：

```powershell
npm.cmd run test:rules
```

此測試會透過 Firebase Firestore emulator 驗證 owner CRUD、匿名/跨帳號拒絕、欄位與長度拒絕、default deny。`firebase.json` 已將 Firestore emulator 固定在 `127.0.0.1:8099`，避免撞到本機常見的 `8080` 服務。

人工登入後 smoke checklist：

- Email 註冊成功，導覽列顯示 displayName。
- Email 登入成功，帳號面板顯示 email 或 email 前綴。
- Google 登入成功。
- 訪客登入成功，帳號面板顯示訪客模式。
- 登出後結果面板不殘留上一個帳號的分析內容，密碼欄位已清空。
- 送出一段短草稿後，SSE 有開始輸出，結果分成「修改後全文」與「審查摘要」。
- 歷史紀錄會新增並同步；換帳號後歷史不互相污染。
- 手機寬度下登入面板、鍵盤、歷史面板與結果操作按鈕不擠壓。

## App Check 強制模式前置

目前 App Check 仍維持 report-only：前端會嘗試送 `X-Firebase-AppCheck`，後端會驗證並把 `appCheckStatus` 寫進 structured logs，但 `ENFORCE_APP_CHECK = false` 時不阻擋。

2026-05-20 log 觀察：登入帳號與訪客各送出短草稿後，`analysis_start` / `analysis_done` 仍顯示 `appCheckStatus: 'missing'`，瀏覽器 console 也出現 `appCheck/recaptcha-error`，因此暫時不能切 `ENFORCE_APP_CHECK = true`。前端已補上初始化後 token warmup、分析前一般取 token 與強制刷新備援；部署後再次以 Email、Google、訪客各送一次短草稿，Functions log 仍是 `missing`。已確認當時缺少 Firebase Console > App Check 綁定；補上後需再重新跑三種登入短草稿，確認 Functions log 變成 `valid` 才能進入強制模式。

切強制前必須先確認：

- production 網址 `https://project-7276420283723642146.web.app` 的 reCAPTCHA Enterprise domain 設定正確。
- 使用 Email、Google、訪客三種登入後各送一次短草稿，Functions log 的 `analysis_start` / `analysis_done` 都是 `appCheckStatus: 'valid'`。
- 沒有新的 `app_check_invalid` 警告。
- 手機與桌機都能拿到 App Check token。
- App Check metrics 顯示合法流量穩定後，再改 `functions/src/index.ts` 的 `ENFORCE_APP_CHECK = true` 並部署 Functions。

查 log 可用：

```powershell
firebase functions:log --only analyzeV2 -n 80
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
- 已新增 Email/Password 登入與註冊 UI：中央帳密面板支援登入/註冊切換、顯示名稱、密碼確認與本地錯誤提示；Google / 訪客登入移到 `EXTERNAL IDENTITY` 次要模組。需確認 Firebase Console 已啟用 Email/Password provider。
- 已收斂登入後帳號顯示：Email/Password、Google、訪客共用通用帳號文案；Email 帳號會優先顯示 displayName，否則顯示 email 前綴，登出/重回登入頁會清空密碼欄位。
- 已新增 Hosting smoke 腳本與登入後人工 smoke checklist；App Check 強制模式前置也已整理，目前因 log 仍出現 `appCheckStatus: 'missing'`，暫不切強制。
- 已補強 App Check 前端 token 流程：初始化後先暖身取 token，分析前若一般取 token 失敗或回空值，會再強制刷新一次；同時記錄 `appCheckStatus` / `appCheckError` 方便觀測。
- 已加入官方 Firestore emulator rules 測試：`npm.cmd run test:rules` 會用 `@firebase/rules-unit-testing` 驗證 owner-only、schema/長度限制與 default deny；Firestore emulator 固定使用 `127.0.0.1:8099`。
- 已精修登入頁第一輪：加入四段式 `ORIGIN LIGHT` / `TOKEN CHECK` / `LINK START` / `WORKSPACE RENDER` 狀態列，登入請求期間中央核心會亮起並脈衝；手機版登入畫面改為整頁可捲動以改善鍵盤擠壓。
- 已加入登入初始啟動儀式：暖黑 terminal 連線檢查、暗金 veil `WELCOME TO FANTASY LORE GUARDIAN`、低亮度碎片退場與 HUD/登入入口展開；`prefers-reduced-motion` 會跳過長動畫。
- 已修正登入 handoff：只有本次按下登入 / 註冊 / Google / 訪客時才播放 LINK START；重新整理後若 Firebase 已保留登入狀態，會直接進主工具，不再重播登入 boot、阻擋動畫或自動 focus 到輸入區。
- 2026-05-20 已完成 Worldforge Core 電影級登入重構：登入頁改為「禁忌魔導書庫 / 西方奇幻小說編修核心」語彙，保留 `#loginScreen`、`#loginGl`、`emailAuthForm`、`loginEmail`、`loginPassword`、`loginGoogleBtn`、`loginGuestBtn` 等 Firebase Auth 所需 DOM id；Email/Password、Google、訪客登入流程仍由既有 `auth.js` 接手，`loginfx.js` 只負責成功 handoff 動畫。
- 本次登入重構新增 `SceneManager`、`CoreEngine`、`RuneSystem`、`ParticleSystem`、`HUDSystem`、`PostProcessingPipeline`、`OperationalModeController` 架構；Three.js core/addons 維持 importmap 的 `0.160.0`，桌機正常模式目標 26 層 rune，手機正常模式 14 層，`prefers-reduced-motion` 會降到 10 層並關閉 SAO。
- 本次部署前檢查：`npm.cmd run check` 通過、`npm.cmd test` 通過（21 tests / 0 fail）、桌機 `1366x768` 無水平溢出、手機 `390x844` 無水平溢出且登入面板可垂直捲動；本機瀏覽器因 reCAPTCHA / App Check localhost 限制仍會出現 `appCheck/recaptcha-error`，所以 Email / Google / 訪客實登入需在正式網域部署後再人工驗證。
- 2026-05-20 已部署本次登入重構至 Firebase Hosting：只執行 `firebase deploy --only hosting --project project-7276420283723642146`，未部署 Functions、Firestore rules 或 App Check 強制模式；部署後 `npm.cmd run smoke:hosting` 通過，正式站首頁已載入 `js/app.js?v=31`。

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
