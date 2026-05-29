// Minimal service worker — caches the app shell so navigation works offline
// after first visit. Does NOT cache photos (those come from lh3 and are
// huge), does NOT cache data/manifest.json yet (M11/M12 will revisit once
// the manifest's lifecycle is clearer).

const SHELL_CACHE = 'hermantrip-shell-v5';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/lib/router.js',
  '/src/lib/loading.js',
  '/src/lib/viewport.js',
  '/src/lib/image-url.js',
  '/src/lib/country-thumb.js',
  '/src/lib/album-query.js',
  '/src/lib/photo-img.js',
  '/src/lib/ordering.js',
  '/src/lib/slideshow-nav.js',
  '/src/views/country-list.js',
  '/src/views/album-list.js',
  '/src/views/album-grid.js',
  '/src/views/slideshow.js',
  '/icon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only handle same-origin requests; let lh3.googleusercontent.com etc. go
  // straight through to the network.
  if (url.origin !== self.location.origin) return;
  // Bypass the manifest data file — it should always be fresh until we have
  // a versioning story.
  if (url.pathname === '/data/manifest.json') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        const copy = res.clone();
        if (res.ok && SHELL_FILES.includes(url.pathname)) {
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
