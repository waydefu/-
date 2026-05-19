/* ================================================================
   Fantasy Lore Guardian — Service Worker：自毀 kill-switch
   ----------------------------------------------------------------
   SW 已退役。FLG 是純線上 AI 工具（Firebase/Groq 都要連網），
   離線快取毫無實益，反而整場造成「一般視窗跑到舊模組」的災情
   （需開無痕才正常、修好的 bug 又冒出來）。
   此 SW 不再攔截/快取任何東西：任何瀏覽器一旦載到這支新 sw.js，
   即刪光所有 Cache Storage、反註冊自己、並重新導頁讓客戶端
   立刻脫離 SW 控制。之後純網路 + firebase.json 的 no-cache header
   保證永遠最新。
================================================================ */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {}
      try {
        await self.registration.unregister();
      } catch (_) {}
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      } catch (_) {}
    })()
  );
});

// 刻意不註冊任何 fetch handler → 一律走網路，零攔截。
