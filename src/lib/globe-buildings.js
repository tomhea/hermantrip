// Globe "buildings" (M48 / #10b). Pure — no DOM, no fetch.
//
// Replaces the globe's uniform cylinder markers with one building PER VISIT,
// whose height encodes how many days that visit lasted:
//   - days = the album's day-span (distinct calendar days from photo capturedAt).
//   - an album that spans X places at once → each place gets days / X (the user
//     said you may split a multi-place album's days evenly across its places).
//   - a place visited in several albums (e.g. Bangkok) → several buildings, one
//     per visit, each sized to that visit's days. Buildings that share a
//     coordinate are nudged apart (deterministically) so they stand side by
//     side instead of overlapping.
//
// Returns [{ lat, lng, days, country, album }]; main.js maps colour/height.

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

// Spread buildings that share a coordinate along a short east–west row so each
// visit reads as its own building. Deterministic (index-based, no randomness).
const SPREAD_STEP = 0.6; // degrees of longitude between stacked buildings
function spreadOverlaps(buildings) {
  const groups = new Map();
  for (const b of buildings) {
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

// Building height as a fraction of the globe radius, scaled by days (M49).
// The M48 cylinders rose to (0.02 + days/maxDays·0.45) of the radius; the boxes
// are a QUARTER of that height (#1 "a quarter of what they are now"). main.js
// multiplies by the globe radius to get world units.
export const HEIGHT_SCALE = 0.25;
export function buildingHeightFraction(days, maxDays) {
  const m = maxDays > 0 ? maxDays : 1;
  const ratio = Math.max(0, Math.min(1, days / m));
  return (0.02 + ratio * 0.45) * HEIGHT_SCALE;
}

export function buildingsForGlobe(manifest) {
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
