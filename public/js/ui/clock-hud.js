// @ts-check

import { el } from '../core/dom.js';

/* 舊 Psycho-Pass / Canvas2D 開場引擎已整個退役——登入體驗改由
   js/ui/loginfx.js（Three.js 登入背景 + LINK START warp）負責。
   此檔僅保留仍在用的：登入時鐘 + interval 註冊表（app.js 卸載清理用）。 */

let _intervalTimers = new Set();

const registerInterval = (id) => {
  _intervalTimers.add(id);
  return id;
};

/** Clear all registered intervals (called on page unload). */
export const clearAllIntervals = () => {
  _intervalTimers.forEach(clearInterval);
  _intervalTimers.clear();
};

export const initClock = () => {
  if (!el.loginClock) return;
  const tick = () => {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    el.loginClock.textContent = fmt.format(now);
  };
  tick();
  registerInterval(setInterval(tick, 1000));
};
