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

// Pin altitude as a fraction of the globe radius, scaled by days. globe.gl
// renders a point as a cylinder rising from the surface to this fraction, so a
// longer visit = a taller pin. main.js passes this to .pointAltitude.
export function pinHeightFraction(days, maxDays) {
  const m = maxDays > 0 ? maxDays : 1;
  const ratio = Math.max(0, Math.min(1, days / m));
  return 0.02 + ratio * 0.45;
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
