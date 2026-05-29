// Pure routing decision for the service worker. No caches, no fetch — just
// "given this request URL and our own origin, how should the SW handle it?"
// so the policy is unit-testable without a SW environment.
//
//   'bypass'        — don't touch it; let the browser hit the network
//                     directly (cross-origin photos from lh3, and the
//                     manifest which must always be fresh).
//   'network-first' — try the network, fall back to cache when offline.
//                     Used for the app shell so a returning visitor (or a
//                     dev mid-iteration) always gets the latest code when
//                     online, but the site still loads offline. This
//                     replaces the old cache-first strategy that served
//                     stale code until a second reload (fix/sw-stale-shell).

export function requestStrategy(requestUrl, swOrigin) {
  const url = new URL(requestUrl);
  const origin = new URL(swOrigin).origin;

  // Cross-origin (gstatic fonts) — never our concern.
  if (url.origin !== origin) return 'bypass';

  // Same-origin proxied photos (/img/...) are immutable and large; let the
  // HTTP cache + Cloudflare handle them. Never pull them into the shell
  // cache (it would balloon with thousands of photos).
  if (url.pathname.startsWith('/img/')) return 'bypass';

  // The manifest must always reflect the latest data; never serve it from
  // the shell cache.
  if (url.pathname === '/data/manifest.json') return 'bypass';

  // Everything else same-origin is app shell → network-first.
  return 'network-first';
}
