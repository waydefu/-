# deadcode/ — 死碼封存區

**此資料夾不部署**（在 `public/` 之外，Firebase Hosting 不會帶上）。
這裡的檔案在 2026-06-12 清理時已確認**零程式引用**，僅為保留歷史而封存；
若確定永遠不用，整個資料夾可直接刪除。

| 檔案 | 原位置 | 死因 |
|---|---|---|
| `webgl/`（6 檔） | `public/js/webgl/` | 舊版「強模組」WebGL 法陣（青藍配色時代）。原規劃 Phase 2 接回，後被 SAGE CORE IGNITION 引擎（`public/js/effects/sage-vfx.js`）整體取代，無人 import。 |
| `great-sage-vfx-poc.html` | `poc/` | 初代 VFX PoC，已被 `poc/vfx-lab.html`（共用 sage-vfx 真源的薄殼）取代。 |
| `sw-register.js` | `public/` | Service Worker 註冊入口；SW 已全面退役（`swkill.js` 負責清除舊註冊），僅剩註解提及。 |
| `spellcheck.worker.js` | `public/` | 禁詞掃描 worker；掃描已內建於 `main.js` 主執行緒（資料 `/forbidden-words.json`），零引用。 |
| `6c489817-….jpeg` | repo 根目錄 | 誤入庫的截圖附件。 |

仍保留在 `public/` 的相關檔（**不是死碼**）：
- `swkill.js` — index.html 仍載入，負責清除歷史 SW 註冊。
- `sw.js` — firebase.json 有專屬 header；舊客戶端 SW 更新檢查的安全墊。
- `forbidden-words.json` — `main.js` 執行期 fetch。
