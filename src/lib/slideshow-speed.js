// Autoplay speed options for the slideshow (M9). Pure.
//
// SPEEDS lists the selectable auto-advance intervals (ms). `nextSpeed`
// cycles to the next one (wrapping), and `speedLabel` renders the compact
// Hebrew label shown on the speed button (e.g. "5ש'" = 5 seconds).

export const SPEEDS = [3000, 4000, 7000, 10000];

export function nextSpeed(ms) {
  const i = SPEEDS.indexOf(ms);
  if (i === -1) return SPEEDS[0];
  return SPEEDS[(i + 1) % SPEEDS.length];
}

export function speedLabel(ms) {
  return `${Math.round(ms / 1000)}ש'`;
}
