const CACHE_NAME = "akash-drivelog-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/drivelog-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept POST requests, Google Apps Script calls, or third-party CDN requests.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Keep the app entry point fresh while allowing the last cached copy to open offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html").then(cached => cached || caches.match("./")))
    );
    return;
  }

  // Cache only the small static PWA files; leave app data and API traffic untouched.
  if (APP_SHELL.some(path => new URL(path, self.registration.scope).pathname === url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
