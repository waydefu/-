// @ts-nocheck
// SAGE OPENING DIRECTOR — 登入成功編舞的唯一真源（規格：docs/SAGE_OPENING_PASS5.md）。
// 改時序只動 TIMELINE 這張表；視覺相位由 worldforge:ignite 事件交給 great-sage-core，
// 音效原子（riser/impact/whoosh/shimmer）與 DOM 拍點由本檔排程。
import { sfx } from "./audio-fx.js";

/** 編舞時間軸（ms，自登入成功起算）。Pass5c 順序：環逐一 360° 邊轉邊出 → 高速旋轉把煙轉散
 *  → 工作區 saoIn 展開（高速殘餘中）→ 之後才減速正常運作。
 *  cardOut(0)──卡片 saoOut 收合
 *  ignite(300)──點火：環逐一錯峰出場（各帶 360° 出場自轉，出齊 ~2.6s）；轉速衝 3.2；霧被轉散（uFog 1.15→0.42）
 *  reveal(2800)──環已出齊、仍高速 → 工作區 saoIn 展開；音效 impact+whoosh+shimmer 落這拍
 *  （減速不由 director 排：sage-vfx ignition after[3.4s] 自動回 ambient ⇒ t≈3.7 展開後 0.9s 減速）
 *  cleanup(8000)──just-linked 移除保底
 *  ※ sage-vfx ignition after 秒數＝(減速時點-ignite)/1000，調慢/快兩處要一起動。 */
export const TIMELINE = {
  cardOut: 0,
  ignite: 300,
  reveal: 5300,   // Pass23 對齊：ignite(300)+出場固定 5.0s＝動畫結束於 t=5300，工作區剛好此刻展開（非單純加長）；vfx after 5.6s ⇒ 展開後減速
  cleanup: 10500,
};

let timers = [];
function at(ms, fn) { timers.push(window.setTimeout(fn, ms)); }

/** 播放登入編舞。onReveal：工作區揭示拍回呼（main.js 切 is-authed + 進場資料載入）。 */
export function playOpening({ onReveal } = {}) {
  timers.forEach(window.clearTimeout); timers = [];

  // Act1 卡片收合（saoOut 既有動畫；ease-in 快走）
  at(TIMELINE.cardOut, () => {
    document.querySelector(".auth-card")?.classList.add("is-closing");
  });

  // Act2 點火（core 監聽切 ignition；音效 riser 鋪到展開拍）
  at(TIMELINE.ignite, () => {
    window.dispatchEvent(new CustomEvent("worldforge:ignite"));
    sfx.riser((TIMELINE.reveal - TIMELINE.ignite) / 1000);
  });

  // Act3 工作區展開（環已出齊、高速殘餘中）；impact 落點+duck+whoosh+shimmer 同拍
  at(TIMELINE.reveal, () => {
    document.body.classList.add("just-linked", "is-authed");
    document.querySelector(".auth-card")?.classList.remove("is-closing");
    sfx.impact(); sfx.whoosh(); sfx.shimmer();
    onReveal?.();
  });

  at(TIMELINE.cleanup, () => document.body.classList.remove("just-linked"));
}
