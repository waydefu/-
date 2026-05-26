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

## S10.5 Part 3 - Frame Sweep Sync

### 變更前確認

- 範圍：`.frame-sweep` animation timing 與 `frameSweepFade` keyframe。
- 不改 DOM、不改 dialog 結構、不改互動 handler。

### 變更後更新

- `public/index.html`：`.frame-sweep` 改為 `frameSweepFade 0.8s 0.3s`，使邊框掃描在 panel 展開初期淡入。
- `public/index.html`：`frameSweepFade` 增加 0 / 50 / 100 三段亮度節奏。
- `public/worldforge-login.html`：已同步。
- 驗收：`Select-String` 找到新 timing 與 keyframe；`git diff --check` 通過。

## S10.5 Part 4 - Backdrop Ripple

### 變更前確認

- 範圍：`.ritual-stack::backdrop` background / blur / animation，替換 `backdropFadeIn` 為 `backdropRipple`。
- 保留 native dialog backdrop，不新增自製 modal backdrop。
- Reduced motion 要短路 backdrop 動畫。

### 變更後更新

- `public/index.html`：`.ritual-stack::backdrop` 新增中心金色微光、暗化 vignette、scan-line 與 3px blur/saturate。
- `public/index.html`：`backdropFadeIn` 改為 `backdropRipple`，以 background-size 做中心擴散。
- `public/index.html`：`prefers-reduced-motion` 內明確停用 backdrop animation。
- `public/worldforge-login.html`：已同步。
- 驗收：`Select-String` 找到 `backdropRipple` animation property 與 keyframes；`git diff --check` 通過。

## S10.5 Part 5 - Audio Chime

### 變更前確認

- 範圍：新增輕量 `SaoAudio` Web Audio helper，dialog open trigger 呼叫 chime。
- 不新增靜音按鈕，避免新增 UI 文字與 touch target 檢查負擔；音效只在 user gesture 解鎖後播放，未解鎖時安靜略過。
- `prefers-reduced-motion` 時不播放音效，避免動效與聲效同時干擾。

### 變更後更新

- `public/index.html`：新增 `SaoAudio` helper，使用 user gesture 建立 `AudioContext`，以三個 oscillator/gain envelope 形成短促 chime。
- `public/index.html`：dialog 正常 boot open 與 forceBootComplete open 後呼叫 `window.__FLG_SAO_AUDIO__?.playOpenChime()`。
- `public/index.html`：`prefersReducedMotion` 為 true 或 AudioContext 未解鎖時不播放。
- `public/worldforge-login.html`：已同步。
- 驗收：`Select-String` 找到 `SaoAudio` / `playOpenChime` / `__FLG_SAO_AUDIO__`；`git diff --check` 通過。

## S10.5 Validation

- `npm.cmd run sync:login-mother`：通過。
- `git diff --check`：通過。
- `npm.cmd run check:frontend`：通過。
- `npm.cmd run check:functions`：通過。
- `npm.cmd test`：通過，22 tests passed。
- `npm.cmd run test:visual:update`：通過，12 tests passed；本輪 reduced-motion baseline 未產生 snapshot diff。
- 截圖 review：`login-1366`、`login-390`、`workbench-1366`、`history-drawer-1366`、`account-menu-1366` 均無重疊、無跑版、手機 reflow 正常。
- 動態定格 review：`artifacts/s10.5/frozen/01-spawn.png`、`02-extend.png`、`03-unfold.png`、`04-settle.png`、`05-final.png`；確認 panel 具備中心亮點、水平細線、垂直過衝、落定。
- `npm.cmd run test:visual`：通過，12 tests passed。第一次與 a11y 並行時出現 5173 port warning，已立即改回 sequential 並重新跑 a11y。
- `npm.cmd run test:a11y`：sequential 重跑通過，3 tests passed，axe impact counts `{}`。
- `npm.cmd run build`：通過。
- `firebase.cmd deploy --only hosting --project project-7276420283723642146`：通過。
- `npm.cmd run smoke:hosting`：通過。

### S10.5 Commits

- `6e8011b feat(s10.5/materialize): five-stage SAO system window animation`
- `e37686a feat(s10.5/stagger): cascade auth-header h2 button on dialog open`
- `f8e09d3 feat(s10.5/sweep): sync frame sweep with panel materialize`
- `241be31 feat(s10.5/backdrop): radial pulse and scan-line on dialog open`
- Part 5 `feat(s10.5/audio): add gesture-unlocked SAO open chime`（最新 hash 以 final 回報與 `git log` 為準，避免 commit 自我引用造成 hash 變動）

## S10.6 Commit Plan

- Commit 1: core `--sao-*` tokens, `.sao-btn` mixin, ripple JS, static/dynamic button class coverage.
- Commit 2: form / textarea focus underline.
- Commit 3: history item hover / active state.
- Commit 4: history drawer / account menu open-close animation.
- Commit 5: toast scan and CSS in/out motion.
- Commit 6: progress bar endpoint pulse.
- Commit 7: primary/analyze button loading and hover enhancement.
- Commit 8: chip hover / expanded state.
- Commit 9: danger confirm state.
- Commit 10: success/error flash + override / connection / spell-list integration.

## S10.6 Part 1 - SAO Button Mixin

### 變更前確認

- 範圍：`:root` tokens、`.sao-btn` CSS、click ripple JS、HTML button class additions、dynamic button class additions。
- 不改任何 button id/name/click handler；只加 class。
- Touch target 透過 `.sao-btn { min-height: 44px; }` 維持紅線。
- Reduced motion 下停用 button transition / ripple / loading spin。

### 變更後更新

- `public/index.html`：新增 S10.6 v2 `--sao-*` timing / glow tokens 與 `.sao-btn` 共用樣式。
- `public/index.html`：為靜態與動態 button 增加 `sao-btn` / `is-danger` class；沒有改 button id、type、文字或 handler。
- `public/index.html`：新增 click ripple 事件委派，`prefers-reduced-motion` 下直接略過。
- `tests/visual/helpers.ts`：同步 visual helper 注入的 dossier / history 按鈕 class，避免截圖假資料停留舊樣式。
- Commit: `4ff7884 feat(s10.6/sao-btn): shared SAO button mixin with extended timing`

## S10.6 Part 2 - Input Focus Underline

### 變更前確認

- 範圍：表單/textarea 外框 focus-within 視覺線條與 reduced-motion 規則。
- 不改 textarea id、ARIA、placeholder、草稿保存/恢復邏輯。
- 只使用 absolute pseudo-element 與 box-shadow，不改排版尺寸，避免 CLS。

### 變更後更新

- `public/index.html`：新增 `.field` / `.textarea-wrap` / `.draft-field-shell` focus underline，使用 `width` transition 與固定 2px pseudo-element。
- `public/index.html`：新增 focus-within glow；未變更 textarea 尺寸與既有 focus-visible outline。
- `public/index.html`：reduced-motion 下停用 underline transition。
- Commit: `51ce266 feat(s10.6/forms): add SAO focus underline for draft inputs`

## S10.6 Part 3 - History Item Active State

### 變更前確認

- 範圍：history item hover/active 視覺、目前載入卷宗的暫態 class。
- 不改歷史資料來源、localStorage key、Firestore query 或刪除/載入 handler。
- `.history-item` 會保留 `sao-btn` class，但局部覆寫 pseudo-element 供側線與 active triangle 使用。

### 變更後更新

- `public/index.html`：history item hover/focus 加入 0.42s 側線、背景、padding transition。
- `public/index.html`：新增 `.is-active` 目前卷宗標記與 `aria-current="true"`；只存在 UI 狀態，不寫入歷史資料。
- `public/index.html`：刪除/清空歷史時同步清除 active id，避免殘留狀態。
- `tests/visual/helpers.ts`：history drawer baseline fixture 加入 active item，讓截圖能檢查三角標記。
- Commit: `0a41e93 feat(s10.6/history): add SAO active archive state`

## S10.6 Part 4 - Drawer And Menu Motion

### 變更前確認

- 範圍：`.history-drawer` / `.account-menu` CSS open/closed motion。
- 不改 toggle handler、ARIA expanded 更新、outside click 或 menu role。
- `[hidden]` 狀態保留，僅以 scoped CSS 覆寫 display 讓 opacity/transform transition 可以執行；閉合仍是 `visibility:hidden` + `pointer-events:none`。

### 變更後更新

- `public/index.html`：account menu 加入 0.42s scale/translate opening motion 與 closed transform state。
- `public/index.html`：history drawer 加入 0.58s scaleY/translate opening motion 與 closed transform state。
- `public/index.html`：reduced-motion 下停用 drawer/menu transition 與 animation；既有 hidden/ARIA/toggle handler 未改。
- Commit: `7e25a93 feat(s10.6/drawers): add SAO open motion to archive menus`

## S10.6 Part 5 - Toast Notice Scan

### 變更前確認

- 範圍：`.notice` CSS scan/enter/leave class 與 `HUDSystem.showNotice` class 切換。
- 保留 `role="status"`、`aria-live` announcer 更新與既有繁中訊息文字。
- 移除 toast 的 GSAP tween 依賴，改用 CSS class；reduced-motion 下維持即時顯示/淡出，不跑動畫。

### 變更後更新

- `public/index.html`：notice 加入 scan border pseudo-element、0.62s enter、0.56s leave animation。
- `public/index.html`：`HUDSystem.showNotice` 改為 class restart + 2800ms display timer；保留 announcer textContent 更新。
- `public/index.html`：reduced-motion 下停用 scan/enter/leave animation，仍以 class 控制顯示與淡出。
- Commit: `17773cd feat(s10.6/toast): add SAO scan notice motion`

## S10.6 Part 6 - Progress Endpoint Pulse

### 變更前確認

- 範圍：analysis progress bar CSS endpoint pulse 與 progress scale CSS var 所在位置。
- 不改分析 API、進度推進公式、文字或完成/錯誤流程。
- 端點使用 pseudo-element，尺寸固定，不影響 layout；reduced-motion 下停用 pulse。

### 變更後更新

- `public/index.html`：analysis progress bar 加入固定 16px leading pulse endpoint 與 1.8s pulse keyframe。
- `public/index.html`：progress scale CSS var 改由 bar shell 持有，fill 與 endpoint 同步讀取，不改進度數值公式。
- `public/index.html`：reduced-motion 下停用 endpoint pulse animation。
