# S21：佈局對齊舊版 repo（navbar + 760px 單欄 + footer）

日期：2026-06-05
起始 HEAD：`bc77a1d`（乾淨）
參照：https://github.com/waydefu/-  | 執行單：桌面 FLG-執行單-S21
方向：只搬位置 + 對齊舊版字級/按鈕尺寸；保留 SAO 金黑視覺/特效。選單保留置中彈窗。

## 舊版基準
- navbar 高 56px、fixed top、左品牌/右(歷史+帳號)鈕
- 主內容 max-width 760px 單欄
- 標題 clamp(1.4rem,4.8vw,2.1rem)；輸入框字 16px；按鈕 min-height 44px
- footer：版權 + wayde.fu@gmail.com

## 現況結構（index.html）
- body > #bg-stage（背景）> #logoutConfirmWindow / #accountMenu / #historyDrawer（彈窗，body 層）> main.interface
- .interface（fixed, overflow-y:auto 捲動容器）> header.top-hud（裝飾品牌，operational 時隱藏）> #ritualStack（登入）> #operationalDeck（工作區，寬版 grid）
- operationalDeck > tool-stack（左右裝飾）+ workbench-nav（SYS 導航）+ codex-panel（輸入）+ analysis-dossier（結果）

## 取捨
- 輸出區字級 S20 已加大（22-28px），**保留**，不回退舊版 16px。
- account/history 保留置中彈窗（不改下拉）。

## 變更紀錄
- 2026-06-05 Part B（已部署 599b85a）：operational-deck width 1480px → `min(760px, calc(100vw-32px))`。
  原本就是單欄 grid（minmax(0,1fr)），只是 max 寬太寬；收成 760 即對齊舊版單欄。
- 2026-06-05 Part D（已部署 599b85a）：operationalDeck 內底部新增 `.app-footer`
  （版權 + wayde.fu@gmail.com，SAO 金黑小字，隨內容捲動）。
- Part C（字級）：**跳過**。現況已接近舊版（標題 1.5-1.9rem vs 舊 1.4-2.1rem、
  按鈕 15-17px vs 舊 15-16px），且輸出區大字（S20）刻意保留。
- Part A（navbar）：**交棒 Codex**，執行單見桌面 `FLG-執行單-S21\S21-A-navbar頂部導航.md`。
  方向＝navbar 直接放各鈕（拆 SYS 選單）；手機 56px 塞不下 5 鈕，取捨見執行單 A-3。
