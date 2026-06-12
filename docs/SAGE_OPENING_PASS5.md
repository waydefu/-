# SAGE OPENING — Pass 5 開場編舞 + 電影級音效規格
2026-06-12。取代 SAGE LINK 卷宗傳送（已刪）。最高規格、高效能利用率（compositor-only、零新增 render pass）。

## 一、編舞原則（研究結論 → 本案應用）
| 原則 | 應用 |
|---|---|
| Staging（一次一個焦點） | 三幕嚴格分離：登入卡 → 核心點火 → 工作區；絕不同時搶焦點 |
| Anticipation（預備拍） | 點火前 0.25s 全場微暗 + 核心微縮（夜燈→吸氣），才爆增亮 |
| Follow-through / Overlap | 軌道「分次」出現＝既有 sealGate→midGate→outerGate→boundaryGate 內→外錯峰；工作區展開時軌道仍在減速（殘餘運動） |
| Ease-out 進場 / Ease-in 離場 | 登入卡收合快走（ease-in 0.34s）；工作區 SAO 展開 ease-out |
| 可中斷性 | 全程不鎖輸入；reduced-motion 只縮短不取消 |
| 效能 | DOM 只動 transform/opacity；VFX 只調 uniform（零新 pass、零新材質） |

## 二、時序表（登入成功 t=0）
```
t=0.00  auth-changed(user)。音效：login 琶音（既有）。
t=0.00  登入卡 SAO 收合（modalOut 0.34s，ease-in）→ authScreen 隱。
t=0.30  vfx setPhase("ignition")：核心增亮 → 軌道內→外分次點亮（I 由 dt*3 lerp，全程~1.4s）
        rotMult 衝 2.0（加速旋轉）。音效：ignition 編組（riser 1.6s → impact → shimmer）。
t=1.90  body.is-authed + body.just-linked → 工作區 SAO 展開（wsReveal 0.65s：scaleX→scaleY，forwards 結束於可見）。
t=2.90  ignition after [2.6s] 到期 → 自動切 ambient：rotMult 回 0.85（減速）、power 0.30 → 正常運作。
保底：    just-linked 5s 後移除；JS 任一步失敗時 is-authed 立即切換路徑仍存在（7s CSS 保底不變）。
```
進站（未登入）：bootLoader 結束 → **idle 夜燈相位**（power 0.16 / ignite 0.08：霧中微亮核心，軌道法陣近不可見）→ 登入卡 sao-pop 彈出。
已登入 reload：直接 ambient（不重播點火）。登出：回 idle 夜燈。

## 三、電影級音效規格（純 WebAudio 合成、同 C 調基頻族）
研究結論：電影級轉場＝riser（升壓）→ impact（落點）→ shimmer（餘韻）三段結構；
分層＝sub 低頻體重 + mid 質感 + high 火花；UI 套件同材質族（既有 audio-fx 架構）。
| 事件 | 合成配方 |
|---|---|
| ignition 編組 | riser：noise sweep（bandpass 300→2400Hz 1.6s）+ sawtooth C2→C4 滑升；impact（t=1.6s）：sub sine 60Hz 0.4s 急衰 + noise burst 3ms + C3 三角波；shimmer：C6/G6/E7 微 detune sine 群 2.2s 長尾 |
| 工作區展開 | whoosh：noise bandpass 中心 800→3000→600Hz 0.5s（速度感）+ 琶音尾音 |
| ambient 進駐 | （預設不做持續 drone——尊重編輯工具長時使用；保留 API 擴充位） |
| duck | impact 瞬間 master gain 0.16→0.10→0.16（150ms）讓低頻有空間 |
效能：共用單一 AudioContext/noise buffer；每事件 ≤6 節點、自動 stop 釋放；不引入任何音檔資產。

## 四、效能政策（最高規格＝效率拉滿，非堆料）
- VFX 端零新增：點火/減速全是既有 uniform（uIgnite/rotMult/uPower）插值，無新 shader、無新 RT。
- DOM 端只 transform/opacity；wsReveal 用既有 modalIn 同款曲線；嚴禁 filter/backdrop-filter 動畫（零閃鐵律）。
- 音效端純合成（首次手勢解鎖、靜音記憶既有）。
- 自適應 render scale（floor 0.6、冷卻 2.5s）為唯一效能旋鈕，不關特效。

## 五、來源
- 動效：IxDF/Dribbble Disney 12 原則→UI、Material choreography（staging/anticipation/overlap、ease-out 進場）、
  LottieFiles motion-design-skill、compositor-only 效能共識。
- 音效：Krotos/BOOM Library/SoundMorph 對 whoosh/riser/impact/shimmer 的分層定義與 trailer 三段結構。
