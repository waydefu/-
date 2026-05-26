# S10.5 / S10.6 Execution Log

## 2026-05-26 Preflight

### 使用者要求

- 依序執行 `C:/Users/wayde.fu/OneDrive/桌面/FLG-UI-S10.5-SAO彈窗儀式重做-執行單.md`，共 5 commits。
- 再執行 `C:/Users/wayde.fu/OneDrive/桌面/FLG-UI-S10.6-全UI按鈕SAO化-執行單.md`，使用者指定 10 commits。
- 每跑完一份做 `npm run test:visual:update` 與截圖 review。
- 兩份各自 deploy 後做 `smoke:hosting`。
- 最終上網深度搜尋研究比對是否符合 SAO 系統 UI；若不符最高標準，先提出修改方案，完成後關機。

### 紅線確認

- 不可動 button id / name / click handler 語意。
- 不可動 Firebase / Auth / 草稿 / 歷史資料契約。
- 不可破壞 native `<dialog>` 結構與 `showModal()` / `cancel preventDefault`。
- 觸控目標維持 44x44 CSS px 以上。
- WCAG 2.1 AA 對比不可退步。
- `prefers-reduced-motion` 必須保留短路。
- CLS 必須維持 `< 0.1`。
- 繁中介面文字不動。

### 基線狀態

- HEAD: `9b1dd8b fix(s10/dialog): center native login modal`。
- 工作樹：乾淨。
- `package.json` 目前有 `test:visual`，尚無使用者指定的 `test:visual:update`；會納入 S10.5 Part 1 的同一個 commit，避免額外 commit 破壞 5 commits 要求。
- S10.6 文件列出 13 個 Part，但使用者指定 10 commits；執行策略是前 9 個主 UI Part 各一 commit，第 10 commit 整合 success/error flash、override、connection、spell-list 收尾，確保不漏文件範圍。

### 改動前動畫診斷

- `panelMaterialize` 仍是 0 / 55 / 100 三段，缺少「點 -> 線 -> 框 -> 過衝 -> 落定」的 SAO 視窗具現化節奏。
- `.frame-sweep` 使用 `frameSweepFade 1.2s 1s`，邊框光點晚於 panel 展開，視覺上脫節。
- `.ritual-stack::backdrop` 只有 `backdropFadeIn` opacity fade，缺中心漣漪與 scan-line。
- dialog 內 `.auth-header`、`#authTitle`、`#authPrompt`、`.auth-actions` 沒有 stagger cascade。
- 工作區按鈕分散在 `.primary-btn`、`.secondary-btn`、`.ghost-btn`、`.workbench-nav-actions > button`、`.dossier-copy`、`.result-section-copy`、`.history-delete` 等 selector，缺共用 SAO 狀態系統。
- `.account-menu[hidden]` 與 `.history-drawer[hidden]` 目前直接 `display: none`，開合缺過衝儀式感。
- `HUDSystem.showNotice()` 仍以 GSAP 淡入淡出為主，缺 toast 邊框 scan。

## Web Research

### 技術依據

- web.dev High-performance CSS animations: 動畫應優先使用 `transform` / `opacity`，避免 layout / paint 成本；本輪把主要視窗、按鈕、drawer/menu、toast 移動都鎖在 transform/opacity/filter，避免改 layout。
  Source: https://web.dev/articles/animations-guide
- web.dev Animations and performance: 現代瀏覽器對 `opacity` 和 `transform` 最能最佳化；新增 ripple / sweep 以 pseudo-element 或短生命週期 span 承載，避免改原本排版。
  Source: https://web.dev/animations-and-performance/
- MDN `<dialog>`: `showModal()` 會生成 modal backdrop，`::backdrop` 可樣式化；因此 S10.5 backdrop 改動只動 pseudo-element，不替換 native dialog。
  Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
- MDN Web Audio best practices / autoplay guide: AudioContext 必須在 user gesture 內建立或 resume；S10.5 音效需先 pointer/key 解鎖，未解鎖時安靜失敗。
  Sources: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices, https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN `prefers-reduced-motion`: 系統設定 reduce 時應移除或替代非必要 motion；所有新增 keyframes 會放入 reduced-motion 短路。
  Source: https://developer.mozilla.org/en-US/docs/Web/CSS/%40media/prefers-reduced-motion
- W3C WCAG 2.3.3 Animation from Interactions: 互動觸發 motion 可停用；雖是 AAA，本案紅線明確要求 reduced motion，按最高標準執行。
  Source: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- WCAG 2.5.5 Target Size: 44x44 CSS px 是 2.1 AAA target size；使用者紅線要求所有觸控目標維持此尺寸。
  Source: https://waic.jp/translations/WCAG21/Understanding/target-size
- web.dev CLS: good CLS threshold 是 `0.1` 或以下；本輪避免新增會推擠版面的位置與尺寸變更，並以現有 visual CLS spec 驗收。
  Source: https://web.dev/articles/cls

### SAO UI 參考

- Warren Uhrich SAO UI Experiment：單欄/縱向 SAO 選單靠延遲、斜切、快速啟動後落定形成「系統選單」印象；本輪沿用斜角、corner bracket、stagger cascade，而非新增三欄 modal。
  Source: https://warrenuhrich.github.io/SAO-UI/
- CodePen Sword Art Online Menu UI：常見 SAO menu 參考使用黑色遮罩、分段項目延遲與 transform/opacity 入場；本輪用 stagger 與 transform 類似語彙，但保留本產品黑金大賢者品牌。
  Source: https://codepen.io/glitchworker/pen/RJOjyM
- Sword Art Online Inspired Menu：參考點為高亮輪廓、遮罩、選單段落化，驗收時比對是否有「系統框、掃描線、分層啟動、角標」四要素。
  Source: https://codepen.io/eeieeipoo/pen/mJyvYK

### 執行準則

- 動畫主體：transform / opacity 優先；filter 只用於短時間 bloom/blur，避免長時間大面積 blur。
- SAO 感：點亮源頭、水平展開、垂直展開、過衝落定、子元素 stagger、corner bracket、scan/sweep、短促 chime。
- Accessibility：所有新增 motion 均需 reduced-motion 短路；所有按鈕保留 focus-visible 與 44px touch target；不改文案。
- Performance：新增動效不得導致 CLS；動態 ripple 必須自動 remove，避免 DOM leak。

## S10.5 Part 1 - Materialize

### 變更前確認

- 範圍：`panelMaterialize` keyframes、`.ritual-stack[open] .auth-panel` animation trigger、reduced-motion 短路、`test:visual:update` script。
- 不改 native dialog HTML，不改 Auth/Firebase/草稿/歷史，不改繁中文案。
- 預期 visual snapshot 會因登入框最後狀態細節而可能變動；S10.5 全部完成後統一 `npm run test:visual:update` 與截圖 review。

### 變更後更新

- `public/index.html`：`.ritual-stack[open] .auth-panel` 改為 `panelMaterialize 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)`，並固定 `transform-origin: center center`。
- `public/index.html`：`panelMaterialize` 改為 0 / 8 / 30 / 66 / 85 / 100 六個 keyframe，實現點、線、框、過衝、回彈、落定。
- `public/index.html`：`prefers-reduced-motion` 內明確短路 auth panel 動畫。
- `package.json`：新增使用者指定的 `test:visual:update` script。
- `public/worldforge-login.html`：已由 `npm.cmd run sync:login-mother` 同步。
- 驗收：`Select-String` 找到 1.4s trigger 與六段 keyframe；`git diff --check` 通過。

## S10.5 Part 2 - Dialog Stagger

### 變更前確認

- 範圍：新增 `contentSlideUp` / `textGlow` / `ctaWake` keyframes，並套用至 auth header、seal、title、prompt、actions。
- 不改 button id、不改 native dialog DOM、不改繁中 UI 文字。
- Reduced motion 必須讓所有 stagger 子動畫立即靜止。

### 變更後更新

- `public/index.html`：新增 auth header / seal / title / prompt / actions 五段 stagger selector。
- `public/index.html`：新增 `contentSlideUp`、`textGlow`、`ctaWake` keyframes。
- `public/index.html`：`prefers-reduced-motion` 中對五個子動畫明確 `animation: none`。
- `public/worldforge-login.html`：已同步。
- 驗收：`Select-String` 找到 stagger selectors 與三個 keyframes；`git diff --check` 通過。
