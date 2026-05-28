// Pure hash router primitives.
//
// `parseHash(rawHash)` normalizes a `window.location.hash` value (with or
// without the leading '#') into a clean path string starting with '/'.
//
// `createRouter(routes)` returns { match(path) } where each route entry is
// { pattern, name }. Patterns use `:param` placeholders, e.g.
// `/album/:id/slide/:idx`. `match` returns { name, params } for the first
// matching route, or null if nothing matches (let the caller render 404).
//
// Pure — no window, no document, no fetch. The DOM wiring lives in main.js.

export function parseHash(rawHash) {
  let h = rawHash;
  if (h.startsWith('#')) h = h.slice(1);
  if (!h.startsWith('/')) h = `/${h}`;
  return h;
}

function matchPattern(pattern, path) {
  const pSeg = pattern.split('/').filter(Boolean);
  const tSeg = path.split('/').filter(Boolean);
  if (pSeg.length !== tSeg.length) return null;
  const params = {};
  for (let i = 0; i < pSeg.length; i += 1) {
    if (pSeg[i].startsWith(':')) {
      params[pSeg[i].slice(1)] = decodeURIComponent(tSeg[i]);
    } else if (pSeg[i] !== tSeg[i]) {
      return null;
    }
  }
  return params;
}

export function createRouter(routes) {
  return {
    match(path) {
      for (const route of routes) {
        const params = matchPattern(route.pattern, path);
        if (params !== null) {
          return { name: route.name, params };
        }
      }
      return null;
    },
  };
}
