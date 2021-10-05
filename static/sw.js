const cache_name = "cache";
const offline_url = "offline.html";

self.addEventListener("activate", e => {
  caches.open(cache_name)
    .then(cache => cache.add(offline_url))
  if ("navigationPreload" in self.registration)
    e.waitUntil(self.registration.navigationPreload.enable())
});

self.addEventListener("fetch", e => {
  if (e.request.mode != "navigate")
    return;
  e.respondWith(e.preloadResponse
    .catch(r => fetch(e.request)
      .catch(r => caches.open(cache_name)
        .then(cache => cache.match(offline_url))
      )
    )
  )
});
