// Pure decision for auto-hiding the slideshow control bar (M10).
//
// The bar shows on pointer activity and hides after CONTROLS_HIDE_MS of
// idle — UNLESS the pointer is currently over the bar (so you can take your
// time clicking a control). main.js records the last activity timestamp and
// polls/schedules with this predicate; keeping the rule pure makes the
// 5-second behavior unit-testable without a DOM or real timers.

export const CONTROLS_HIDE_MS = 5000;

export function shouldHide({ lastActivityAt, now, hoveringBar = false, hideAfterMs = CONTROLS_HIDE_MS }) {
  if (hoveringBar) return false;
  return (now - lastActivityAt) >= hideAfterMs;
}

// Whether the control bar should be VISIBLE right now (M11 + M5).
//   - Not fullscreen, windowedAutoHide off → always visible (the bar is the
//     constant pre-M5 in-flow bar). This is the DEFAULT so every existing
//     caller keeps the old behaviour.
//   - Fullscreen, OR windowedAutoHide on → visible unless idle past the hide
//     window (and not hovering the bar). `lastActivityAt` is the last REAL
//     pointer activity — it is NOT reset when a new slide renders, which fixes
//     the bug where autoplay kept the bar permanently on screen.
// M5 makes the floating slideshow bar auto-hide in the WINDOWED viewer too by
// passing windowedAutoHide:true; fullscreen behaviour is unchanged.
export function controlsVisible({ fullscreen, lastActivityAt, now, hoveringBar = false, hideAfterMs = CONTROLS_HIDE_MS, windowedAutoHide = false }) {
  if (!fullscreen && !windowedAutoHide) return true;
  return !shouldHide({ lastActivityAt, now, hoveringBar, hideAfterMs });
}
