// src/lib/nav-icons.js
// Curated SVG icon set (design.md: "curated handful", no emoji). currentColor
// so they theme with the surrounding text/accent colour.
const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
const ICONS = {
  // slideshow = photo stack
  slideshow: `<rect x="6" y="3" width="15" height="12" rx="2" ${P}/><circle cx="11" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="M21 12l-4-3-3 2M3 8v11a2 2 0 0 0 2 2h12" ${P}/>`,
  // map = folded map
  map: `<path d="M3 6l6-2 6 2 6-2v13l-6 2-6-2-6 2z" ${P}/><path d="M9 4v13M15 6v13" ${P}/>`,
  // game = two dice
  game: `<rect x="3" y="7" width="12" height="12" rx="2.5" ${P}/><circle cx="7" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="11" cy="15" r="1.1" fill="currentColor" stroke="none"/><rect x="11" y="3" width="10" height="10" rx="2.2" fill="var(--surface)" ${P}/><circle cx="14" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="10" r="1" fill="currentColor" stroke="none"/>`,
  // timeline = mirrored vertical list (line on the right, entries leftward)
  timeline: `<path d="M18 4v16" ${P}/><circle cx="18" cy="7" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="12.5" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="18" r="1.8" fill="currentColor" stroke="none"/><path d="M14 7H4M14 12.5H7M14 18H5" ${P}/>`,
  // restart = circular refresh arrow
  restart: `<path d="M20 12a8 8 0 1 1-2.34-5.66" ${P}/><path d="M20 3.5V8h-4.5" ${P}/>`,
  moon: `<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" ${P}/>`,
  sun: `<circle cx="12" cy="12" r="4.5" ${P}/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" ${P}/>`,
};
export const ICON_NAMES = Object.keys(ICONS);
export function icon(name) {
  if (!ICONS[name]) return '';
  return `<svg class="nav-icon" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">${ICONS[name]}</svg>`;
}
