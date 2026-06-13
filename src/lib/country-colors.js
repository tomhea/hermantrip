// src/lib/country-colors.js
// The 7 distinct per-country colours (replaces the reused map palette).
// Used by map pins, globe markers, and the timeline scrubber/rail.
export const COUNTRY_COLORS = {
  np: '#4f7a8c', // teal-blue (mountains)
  in: '#d6a13f', // saffron
  vn: '#5f8f5a', // leaf green
  cn: '#a8423d', // red
  au: '#c97b3c', // ochre
  nz: '#3f7d6e', // deep teal
  th: '#8a5fa3', // orchid purple (recurring)
};

export function countryColor(code) {
  return COUNTRY_COLORS[code] ?? '#b56439';
}

export function countryMotifId(code) {
  return `motif-${code}`;
}
