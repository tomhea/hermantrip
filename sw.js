// Service worker (registered as a module — see main.js). Caches the app
// shell so navigation works offline after the first visit, but uses a
// NETWORK-FIRST strategy for the shell so a returning visitor (or a dev
// mid-iteration) always gets the latest code when online. The old
// cache-first strategy served stale code until a second reload, which is
// what made post-deploy updates "disappear" (fix/sw-stale-shell).
//
// Does NOT cache photos (lh3, cross-origin) or data/manifest.json — the
// routing policy lives in src/lib/sw-strategy.js so it's unit-testable.

import { requestStrategy } from './src/lib/sw-strategy.js';

const SHELL_CACHE = 'hermantrip-shell-v39';
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
  '/src/lib/album-slugs.js',
  '/src/lib/photo-img.js',
  '/src/lib/ordering.js',
  '/src/lib/slideshow-nav.js',
  '/src/lib/slideshow-speed.js',
  '/src/lib/slideshow-transition.js',
  '/src/lib/slideshow-loop.js',
  '/src/lib/slideshow-prefs.js',
  '/src/lib/controls-timer.js',
  '/src/lib/photo-date.js',
  '/src/lib/album-dates.js',
  '/src/lib/photo-group.js',
  '/src/lib/album-transform.js',
  '/src/lib/album-place.js',
  '/src/lib/countries.js',
  '/src/lib/paths.js',
  '/src/lib/random.js',
  '/src/lib/photo-pool.js',
  '/src/views/random-slideshow.js',
  '/src/lib/sw-update.js',
  '/src/lib/sw-strategy.js',
  '/src/views/country-list.js',
  '/src/views/album-list.js',
  '/src/views/album-grid.js',
  '/src/views/slideshow.js',
  '/src/views/map.js',
  '/src/views/game.js',
  '/src/views/timeline.js',
  '/src/lib/album-coords.js',
  '/src/lib/globe-loader.js',
  '/src/lib/trail.js',
  '/src/lib/map-stops.js',
  '/src/lib/timeline.js',
  '/src/lib/game.js',
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
  const strategy = requestStrategy(event.request.url, self.location.origin);
  if (strategy === 'bypass') return; // let the browser handle it directly

  // Clean-path navigations (M12: /nepal/1/0 etc.) are virtual routes that
  // the server answers with index.html. Offline, fall back to the cached
  // '/' shell rather than the (uncached) deep path.
  const isNavigation = event.request.mode === 'navigate';

  // network-first: try the network, update the cache, fall back to cache
  // when offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok && !isNavigation) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => (isNavigation
        ? caches.match('/')
        : caches.match(event.request))),
  );
});
