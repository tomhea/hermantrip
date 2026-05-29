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
