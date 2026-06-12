// @ts-nocheck
// SAGE OPENING DIRECTOR — 登入成功編舞的唯一真源（規格：docs/SAGE_OPENING_PASS5.md）。
// 改時序只動 TIMELINE 這張表；視覺相位由 worldforge:ignite 事件交給 great-sage-core，
// 音效原子（riser/impact/whoosh/shimmer）與 DOM 拍點由本檔排程。
import { sfx } from "./audio-fx.js";

/** 編舞時間軸（ms，自登入成功起算）。
 *  cardOut(0)──卡片 saoOut 收合
 *  ignite(300)──核心增亮→軌道內→外分次點亮→轉速衝 2.0；霧開始被轉散（vfx ignition 相位，uFog 1.15→0.42）
 *  peakEnd(2500)──巔峰收束：ignition 到期自動回 ambient=環減速、霧已散（= ignite + IGNITION_HOLD）
 *  reveal(3300)──環減速近穩 → 工作區 saoIn 展開（場面安定才進人）
 *  cleanup(8000)──just-linked 移除保底
 *  ※ IGNITION_HOLD 與 sage-vfx ignition after 秒數必須一致（(peakEnd-ignite)/1000）。 */
export const TIMELINE = {
  cardOut: 0,
  ignite: 300,
  peakEnd: 2500,
  reveal: 3300,
  cleanup: 8000,
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

  // Act2 點火（core 監聽切 ignition；音效 riser 鋪到巔峰收束拍）
  at(TIMELINE.ignite, () => {
    window.dispatchEvent(new CustomEvent("worldforge:ignite"));
    sfx.riser((TIMELINE.peakEnd - TIMELINE.ignite) / 1000);
  });

  // Act3 巔峰收束：環開始減速（vfx ignition after 自動切 ambient）；impact 落點+duck
  at(TIMELINE.peakEnd, () => sfx.impact());

  // Act4 工作區展開（環已近穩）；whoosh+shimmer 餘韻
  at(TIMELINE.reveal, () => {
    document.body.classList.add("just-linked", "is-authed");
    document.querySelector(".auth-card")?.classList.remove("is-closing");
    sfx.whoosh(); sfx.shimmer();
    onReveal?.();
  });

  at(TIMELINE.cleanup, () => document.body.classList.remove("just-linked"));
}
