// Scroll-position memory for album↔slideshow round-trips (M54 / #7). Pure — no
// DOM, no fetch. main.js records window.scrollY when you open a photo from an
// album and restores it when you close the slideshow back to that album, so you
// land where you were instead of at the album top.
//
// Keyed by the album's clean path (e.g. "/nepal/leh"). The store is a plain
// module-level Map — fine for the page lifetime; positions reset on reload.

const positions = new Map();

export function rememberScroll(key, y) {
  if (typeof key !== 'string' || !key) return;
  const n = Math.round(Number(y));
  positions.set(key, Number.isFinite(n) && n > 0 ? n : 0);
}

// The remembered scroll for a key, or 0 if none recorded.
export function recallScroll(key) {
  return positions.has(key) ? positions.get(key) : 0;
}

export function forgetScroll(key) {
  positions.delete(key);
}

// Is `maybeSlide` a slideshow path of the album page `albumBase`? A slide path
// is the album path plus a trailing numeric index segment
// (e.g. "/nepal/leh/12" is a slide of "/nepal/leh"). Used to detect the
// album→slide (save) and slide→album (restore) transitions, and to avoid
// restoring when arriving at an album from elsewhere (a country grid, a deep
// link) where the user expects the top.
export function isSlideOf(maybeSlide, albumBase) {
  if (typeof maybeSlide !== 'string' || typeof albumBase !== 'string' || !albumBase) return false;
  if (!maybeSlide.startsWith(`${albumBase}/`)) return false;
  return /^\d+$/.test(maybeSlide.slice(albumBase.length + 1));
}
