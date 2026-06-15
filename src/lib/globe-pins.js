// Globe pins (M6 — was globe-buildings/M48). Pure — no DOM, no fetch.
//
// One pin PER VISIT, coloured by country (the M1 palette) and sized by how many
// days that visit lasted:
//   - days = the album's day-span (distinct calendar days from photo capturedAt).
//   - an album that spans X places at once → each place gets days / X.
//   - a place visited in several albums (e.g. Bangkok) → several pins, one per
//     visit; pins sharing a coordinate are nudged apart deterministically.
//
// Returns [{ lat, lng, days, country, album }]; main.js maps colour/height.
// (M6 replaced the 3D box "buildings" + their THREE custom layer with plain
// country-coloured globe.gl points whose altitude encodes the days.)

import { coordsForAlbum } from './album-coords.js';
import { ALBUM_CITIES } from './map-stops.js';

// Distinct calendar days present in an album (≥1).
export function albumDayCount(album) {
  const days = new Set();
  for (const p of (album && album.photos) || []) {
    if (p.capturedAt) days.add(String(p.capturedAt).slice(0, 10));
  }
  return days.size || 1;
}

// Spread pins that share a coordinate along a short east–west row so each visit
// reads as its own pin. Deterministic (index-based, no randomness).
const SPREAD_STEP = 0.6; // degrees of longitude between stacked pins
function spreadOverlaps(pins) {
  const groups = new Map();
  for (const b of pins) {
    const key = `${b.lat},${b.lng}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const out = [];
  for (const group of groups.values()) {
    const n = group.length;
    group.forEach((b, i) => {
      const offset = n === 1 ? 0 : (i - (n - 1) / 2) * SPREAD_STEP;
      out.push({ ...b, lng: b.lng + offset });
    });
  }
  return out;
}

// Building footprint + windows for the 3D "house" markers (restored after the
// cylinder pins were disliked). Slim towers; the wall texture (main.js) draws
// WINDOWS_PER_FLOOR windows per tile.
export const BUILDING_WIDTH = 1.3 / 3;
export const WINDOWS_PER_FLOOR = 2;

// Evenly-spaced window x-positions for one wall-texture tile: `count` windows of
// width `winW` across a `tileW`-wide tile, each centred in its slot. → [{x,w}]
export function windowColumns(count, tileW, winW) {
  const n = Math.max(1, Math.floor(count) || 1);
  const rects = [];
  for (let i = 0; i < n; i += 1) {
    const center = (tileW * (i + 0.5)) / n;
    rects.push({ x: Math.round(center - winW / 2), w: winW });
  }
  return rects;
}

// Building height as a fraction of the globe radius, scaled by days — kept SHORT
// (a quarter of the old cylinder height, ~20-25% — the owner wanted lower
// houses). main.js multiplies by the globe radius for world units, and the
// invisible hit-points rise the full building height so the whole tower clicks.
export const HEIGHT_SCALE = 0.25;
export function buildingHeightFraction(days, maxDays) {
  const m = maxDays > 0 ? maxDays : 1;
  const ratio = Math.max(0, Math.min(1, days / m));
  return (0.02 + ratio * 0.45) * HEIGHT_SCALE;
}

export function pinsForGlobe(manifest) {
  if (!manifest || !Array.isArray(manifest.albums)) return [];
  const raw = [];
  for (const album of manifest.albums) {
    const days = albumDayCount(album);
    const cities = ALBUM_CITIES[album.id];
    let places;
    if (cities) {
      places = cities.map(([lat, lng, label, country]) => ({ lat, lng, label, country: country || album.primary }));
    } else {
      const c = coordsForAlbum(album.id);
      if (!c) continue;
      places = [{ lat: c[0], lng: c[1], label: c[2], country: album.primary }];
    }
    const perPlaceDays = days / places.length; // split a multi-place album's days
    for (const pl of places) {
      raw.push({ lat: pl.lat, lng: pl.lng, days: perPlaceDays, country: pl.country, album });
    }
  }
  return spreadOverlaps(raw);
}
