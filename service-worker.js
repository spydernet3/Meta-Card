const CACHE_NAME = "metacard-pwa-v1";

/* CORE FILES */
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

/* OPTIONAL FILES */
const OPTIONAL_FILES = [
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable.png",
  "./assets/logo.jpg"
];

/* INSTALL EVENT */
self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {

      await cache.addAll(CORE_FILES);

      for (const file of OPTIONAL_FILES) {
        try {
          await cache.add(file);
        } catch (err) {
          console.warn("Optional asset failed:", file);
        }
      }

    }).then(() => self.skipWaiting())
  );

});


/* ACTIVATE EVENT */
self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys.map(key => {

          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

        })
      );

    }).then(() => self.clients.claim())
  );

});


/* FETCH EVENT */
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(

    caches.match(event.request).then(cacheResponse => {

      if (cacheResponse) return cacheResponse;

      return fetch(event.request).then(networkResponse => {

        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const clone = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });

        return networkResponse;

      }).catch(() => {

        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }

      });

    })

  );

});
