const CACHE_VERSION = "v3";
const CACHE_NAME = `gold-gauge-${CACHE_VERSION}`;
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/og.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            cache.put("/", fresh.clone());
          }
          return fresh;
        } catch {
          return (await cache.match("/")) || new Response("Offline", { status: 200 });
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        void fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
          })
          .catch(() => undefined);
        return cached;
      }

      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return new Response("Offline", { status: 200 });
      }
    })(),
  );
});
