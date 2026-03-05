const CACHE_NAME = "meta-card-cache-v2";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

const OPTIONAL_ASSETS = [
  "/assets/logo.jpg",
  "/assets/icon-192x192.png",
  "/assets/icon-512x512.png",
  "/assets/icon-maskable.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {

      // Cache core assets
      await cache.addAll(CORE_ASSETS);

      // Cache optional assets safely
      for (const url of OPTIONAL_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("Optional asset failed:", url);
        }
      }

    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {

  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );

});

// FETCH
self.addEventListener("fetch", (event) => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip chrome extensions
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(

    caches.match(event.request).then((cached) => {

      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {

        if (!response || response.status !== 200) {
          return response;
        }

        const clone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });

        return response;

      }).catch(() => {

        // offline fallback
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }

      });

    })

  );

});
