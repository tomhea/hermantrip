// Proportional one-line font-fit (M65.5). A line of text's width scales ~linearly
// with its font size, so to make content of width `scrollWidth` fit a box of width
// `clientWidth` we scale the current px by clientWidth/scrollWidth (floored to a
// whole px for crispness), clamped to [minPx, currentPx]. When it already fits, the
// size is returned unchanged. Pure — main.js measures the DOM and applies the result,
// keeping the font readable instead of ellipsis-truncating a too-long sub-label.
export function fitFontPx(scrollWidth, clientWidth, currentPx, minPx = 9) {
  if (!(scrollWidth > clientWidth) || scrollWidth <= 0 || clientWidth <= 0) return currentPx;
  const target = Math.floor(currentPx * (clientWidth / scrollWidth));
  return Math.max(minPx, Math.min(currentPx, target));
}
