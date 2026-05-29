// Pure slideshow navigation math + input mapping. No DOM.
//
// RTL-aware input mapping: the whole UI reads right-to-left, so "next"
// (higher photo index) lives on the LEFT. ArrowLeft / left-zone tap /
// rightward swipe (finger drags content rightward to reveal the next,
// which sits to the left in RTL) all advance. ArrowRight / right-zone tap
// / leftward swipe go back. Escape exits to the album grid.

export function clampIndex(idx, len) {
  if (len <= 0) return 0;
  const n = typeof idx === 'number' ? idx : Number.parseInt(idx, 10);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > len - 1) return len - 1;
  return n;
}

export function nextIndex(idx, len, opts = {}) {
  const { wrap = true } = opts;
  if (len <= 0) return 0;
  if (idx >= len - 1) return wrap ? 0 : len - 1;
  return idx + 1;
}

export function prevIndex(idx, len, opts = {}) {
  const { wrap = true } = opts;
  if (len <= 0) return 0;
  if (idx <= 0) return wrap ? len - 1 : 0;
  return idx - 1;
}

export function keyToAction(key) {
  switch (key) {
    case 'ArrowLeft':
    case ' ':
    case 'Spacebar': // older browsers
      return 'next';
    case 'ArrowRight':
      return 'prev';
    case 'Escape':
      return 'exit';
    default:
      return null;
  }
}

export function swipeToAction(dx, threshold = 40) {
  if (dx >= threshold) return 'next';   // rightward → next (RTL)
  if (dx <= -threshold) return 'prev';  // leftward → prev
  return null;
}
