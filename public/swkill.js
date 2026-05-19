/* ================================================================
   FLG 快取死結破解器（cache-deadlock breaker）
   ----------------------------------------------------------------
   問題：舊 Service Worker / HTTP 快取把無版本 query 的 js 模組
   （loginfx.js、auth.js、sw-register.js…）鎖死，SW 自更新在某些
   瀏覽器不可靠 → 修好的 bug 一直冒出來、被迫開無痕。
   破解：本檔由「已更新的 index.html」以帶版本 query 的全新 URL
   載入（任何快取都必 miss → 保證執行最新）。動作：反註冊所有 SW
   ＋刪光所有 Cache Storage；若確實清掉了東西，做「一次性」硬重載
   讓乾淨網路版（無 SW + no-cache header）生效。之後永久乾淨。
================================================================ */
(function () {
  "use strict";
  var RELOAD_FLAG = "flg_swkill_reloaded_v10";
  var hadSW = false, hadCache = false;

  function maybeReload() {
    // 已重載過就不再重載（避免迴圈）；有清到東西才需要重載
    try {
      if ((hadSW || hadCache) && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        location.reload();
      }
    } catch (_) {}
  }

  var tasks = [];

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          if (regs && regs.length) hadSW = true;
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }).catch(function () {})
      );
    }
  } catch (_) {}

  try {
    if (window.caches && caches.keys) {
      tasks.push(
        caches.keys().then(function (keys) {
          if (keys && keys.length) hadCache = true;
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }).catch(function () {})
      );
    }
  } catch (_) {}

  Promise.all(tasks).then(maybeReload).catch(maybeReload);
})();
