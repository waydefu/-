// SW 已退役（見 sw.js 說明）。此腳本不再註冊 SW，反而主動清乾淨：
// 反註冊任何殘留 Service Worker + 刪光所有 Cache Storage，
// 讓 FLG 之後純網路 + no-cache header，永不再有舊碼快取災情。
(function () {
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
  } catch (_) {}
  try {
    if (window.caches && caches.keys) {
      caches.keys()
        .then((keys) => keys.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  } catch (_) {}
})();
