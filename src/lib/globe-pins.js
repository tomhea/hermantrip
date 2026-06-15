// Globe houses + trail scene. Pure — no DOM, no fetch.
//
// One 3D "house" PER VISIT, coloured by country, sized by days. Visits that
// share a coordinate (e.g. Bangkok, visited several times) are arranged in a
// DICE-PIP cluster (1→center, 5→four corners + center, …) so each reads as its
// own house. Crucially the trip-trail uses the SAME clustered coordinates, so
// the lines terminate at the exact houses (not the city's single centroid).

import { tripStops } from './map-stops.js';
import { albumById } from './album-query.js';

// Distinct calendar days present in an album (≥1).
export function albumDayCount(album) {
  const days = new Set();
  for (const p of (album && album.photos) || []) {
    if (p.capturedAt) days.add(String(p.capturedAt).slice(0, 10));
  }
  return days.size || 1;
}

// House footprint + windows for the 3D markers. Slim towers; the wall texture
// (main.js) draws WINDOWS_PER_FLOOR windows per tile.
export const BUILDING_WIDTH = 1.3 / 3;
export const WINDOWS_PER_FLOOR = 2;

export function windowColumns(count, tileW, winW) {
  const n = Math.max(1, Math.floor(count) || 1);
  const rects = [];
  for (let i = 0; i < n; i += 1) {
    const center = (tileW * (i + 0.5)) / n;
    rects.push({ x: Math.round(center - winW / 2), w: winW });
  }
  return rects;
}

// House height as a fraction of the globe radius, scaled by days — kept SHORT
// (a quarter of the old cylinder height). main.js multiplies by the radius.
export const HEIGHT_SCALE = 0.25;
export function buildingHeightFraction(days, maxDays) {
  const m = maxDays > 0 ? maxDays : 1;
  const ratio = Math.max(0, Math.min(1, days / m));
  return (0.02 + ratio * 0.45) * HEIGHT_SCALE;
}

// Degrees between clustered houses (separation). Bigger = more visibly distinct.
export const CLUSTER_STEP = 1.0;

// Offsets for `n` co-located houses, as [dLat, dLng] in grid units (×step
// applied by the caller). Follows the pips on a die: 1=centre, 2/3=diagonal,
// 4=corners, 5=corners+centre, 6=two columns of three… (>9 → a square-ish grid).
export function clusterOffsets(n) {
  if (!Number.isFinite(n) || n <= 0) return [];
  const P = (gx, gy) => [gy, gx]; // grid (col=east, row=north) → [dLat, dLng]
  const PIPS = {
    1: [P(0, 0)],
    2: [P(-1, 1), P(1, -1)],
    3: [P(-1, 1), P(0, 0), P(1, -1)],
    4: [P(-1, 1), P(1, 1), P(-1, -1), P(1, -1)],
    5: [P(-1, 1), P(1, 1), P(-1, -1), P(1, -1), P(0, 0)],
    6: [P(-1, 1), P(1, 1), P(-1, 0), P(1, 0), P(-1, -1), P(1, -1)],
    7: [P(-1, 1), P(1, 1), P(-1, 0), P(1, 0), P(-1, -1), P(1, -1), P(0, 0)],
    8: [P(-1, 1), P(0, 1), P(1, 1), P(-1, 0), P(1, 0), P(-1, -1), P(0, -1), P(1, -1)],
    9: [P(-1, 1), P(0, 1), P(1, 1), P(-1, 0), P(0, 0), P(1, 0), P(-1, -1), P(0, -1), P(1, -1)],
  };
  if (PIPS[n]) return PIPS[n];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push([(rows - 1) / 2 - r, c - (cols - 1) / 2]); // [dLat, dLng]
  }
  return out;
}

// Build the globe scene from the ordered trip stops:
//   houses:      [{ lat, lng, days, country, album, label }] — album stops only,
//                at their dice-clustered display coords.
//   trailPoints: [{ lat, lng }] — every stop in trip order at the SAME display
//                coords (so the trail threads through the exact houses), with
//                consecutive duplicates dropped.
export function globeScene(manifest, step = CLUSTER_STEP) {
  const stops = tripStops(manifest);
  if (stops.length === 0) return { houses: [], trailPoints: [] };

  // How many city-stops each album has (to split a multi-city album's days).
  const albumCities = new Map();
  for (const s of stops) {
    if (s.albumId != null) albumCities.set(s.albumId, (albumCities.get(s.albumId) || 0) + 1);
  }

  // Cluster stops sharing a base coordinate into dice-pip positions.
  const groups = new Map();
  for (const s of stops) {
    const key = `${s.lat},${s.lng}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const display = new Map(); // stop → { lat, lng }
  for (const arr of groups.values()) {
    const offs = clusterOffsets(arr.length);
    arr.forEach((s, i) => {
      const [dLat, dLng] = offs[i] || [0, 0];
      display.set(s, { lat: s.lat + dLat * step, lng: s.lng + dLng * step });
    });
  }

  const trailPoints = [];
  for (const s of stops) {
    const d = display.get(s);
    const prev = trailPoints[trailPoints.length - 1];
    if (prev && prev.lat === d.lat && prev.lng === d.lng) continue;
    trailPoints.push({ lat: d.lat, lng: d.lng });
  }

  const houses = [];
  for (const s of stops) {
    if (s.albumId == null) continue;
    const album = albumById(manifest, s.albumId);
    if (!album) continue;
    const cities = albumCities.get(s.albumId) || 1;
    const d = display.get(s);
    houses.push({
      lat: d.lat, lng: d.lng,
      days: albumDayCount(album) / cities,
      country: s.country || album.primary,
      album,
      label: s.label,
    });
  }
  return { houses, trailPoints };
}
