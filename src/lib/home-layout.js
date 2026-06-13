// src/lib/home-layout.js
// Split the ordered country codes into screen layers. Desktop/landscape = 2/2/3
// (final layer is the tall finale); phone-portrait = 2/2/2/1. Trip order in.
export function homeLayers(orderedCodes, mode) {
  const c = orderedCodes;
  if (mode === 'phone') return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6]]];
  return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5], c[6]]];
}
