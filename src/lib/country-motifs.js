// src/lib/country-motifs.js
// Per-country organic SVG <pattern> tiles for the timeline scrubber/rail.
// Dense, small tiles (so they read even at a 13px rail), drawn as WHITE
// low-opacity strokes that sit over each segment's country colour.
//   נפאל peaks · הודו sun + dots · ויאטנם leaves · סין wall battlements ·
//   אוסטרליה dunes + sun · ניו זילנד hills + fern · תאילנד chedi + waves
//
// Pure logic — returns SVG strings; no DOM, no fetch.
import { countryMotifId } from './country-colors.js';

// Shared stroke styling for the line motifs.
const S = 'fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"';
const Fdot = 'fill="#fff" fill-opacity="0.28"';

// Each tile is small (8–12px) and tiles seamlessly via patternUnits=userSpaceOnUse.
const TILES = {
  // peaks — mountain zigzag
  np: { w: 12, h: 10, body: `<path d="M-1 10 L3 3 L6 7 L9 2 L13 9" ${S}/>` },
  // sun + market dots
  in: { w: 12, h: 12, body: `<circle cx="6" cy="6" r="2" ${S}/><path d="M6 1.5v1.4M6 9.1v1.4M1.5 6h1.4M9.1 6h1.4" ${S}/><circle cx="1" cy="11" r="0.7" ${Fdot}/><circle cx="11" cy="1" r="0.7" ${Fdot}/>` },
  // leaves
  vn: { w: 11, h: 11, body: `<path d="M2 9 Q6 1 9 2 Q8 7 2 9 Z" ${S}/><path d="M3 8 L8 3" ${S}/>` },
  // wall battlements (Great Wall crenellation)
  cn: { w: 12, h: 10, body: `<path d="M0 10 V5 H3 V3 H6 V5 H9 V3 H12 V10" ${S}/>` },
  // dunes + sun
  au: { w: 13, h: 11, body: `<path d="M-1 8 Q3 4 6 8 T13 8" ${S}/><circle cx="10" cy="3" r="1.6" ${S}/>` },
  // hills + fern frond
  nz: { w: 12, h: 11, body: `<path d="M-1 9 Q3 4 6 9 T13 9" ${S}/><path d="M6 9 V2 M6 4 l2 -1 M6 4 l-2 -1 M6 6 l2 -1 M6 6 l-2 -1" ${S}/>` },
  // chedi (stupa) + wave
  th: { w: 12, h: 12, body: `<path d="M6 1 L8.5 8 H3.5 Z" ${S}/><path d="M6 1 v-0.8" ${S}/><path d="M-1 11 q3 -2 6 0 t6 0" ${S}/>` },
};

export function motifDefs() {
  const patterns = Object.entries(TILES).map(([code, t]) => (
    `<pattern id="${countryMotifId(code)}" width="${t.w}" height="${t.h}" patternUnits="userSpaceOnUse">${t.body}</pattern>`
  )).join('');
  return `<defs>${patterns}</defs>`;
}

export function motifFill(code) {
  return `url(#${countryMotifId(code)})`;
}
