// Globe houses + trail scene. Pure — no DOM, no fetch.
//
// One 3D "house" (tower) PER COORDINATE, coloured by country, sized by days.
// Visits that share a coordinate (e.g. Bangkok, visited several times) COLLAPSE
// into a SINGLE tower whose height ∝ the SUM of their days; clicking it opens a
// picker of all the visits there (fix/globe-towers #2). The trip-trail threads
// the same base coordinates, so the lines terminate at the exact towers.

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

// Build the globe scene from the ordered trip stops:
//   houses:      [{ lat, lng, days, country, albums, label }] — ONE tower per
//                coordinate that has album-stops. Co-located visits collapse:
//                `days` is the SUM, `albums` lists each distinct visit (#2).
//   trailPoints: [{ lat, lng }] — every stop in trip order at its BASE coord,
//                consecutive duplicates dropped (so a revisited city is one
//                point the trail returns to).
export function globeScene(manifest) {
  const stops = tripStops(manifest);
  if (stops.length === 0) return { houses: [], trailPoints: [] };

  // How many city-stops each album has (to split a multi-city album's days
  // across its cities — a 4-day Bangkok+Kathmandu album is 2 days each).
  const albumCities = new Map();
  for (const s of stops) {
    if (s.albumId != null) albumCities.set(s.albumId, (albumCities.get(s.albumId) || 0) + 1);
  }

  // Trail threads the base coordinates, dropping consecutive duplicates.
  const trailPoints = [];
  for (const s of stops) {
    const prev = trailPoints[trailPoints.length - 1];
    if (prev && prev.lat === s.lat && prev.lng === s.lng) continue;
    trailPoints.push({ lat: s.lat, lng: s.lng });
  }

  // One tower per coordinate. Co-located album-stops accumulate days + albums.
  const byCoord = new Map(); // "lat,lng" → tower
  for (const s of stops) {
    if (s.albumId == null) continue;
    const album = albumById(manifest, s.albumId);
    if (!album) continue;
    const cities = albumCities.get(s.albumId) || 1;
    const key = `${s.lat},${s.lng}`;
    let h = byCoord.get(key);
    if (!h) {
      h = {
        lat: s.lat, lng: s.lng, days: 0,
        country: s.country || album.primary, albums: [], labels: [],
      };
      byCoord.set(key, h);
    }
    h.days += albumDayCount(album) / cities;
    if (!h.albums.some((a) => a.id === album.id)) h.albums.push(album);
    h.labels.push(s.label);
  }
  const houses = [...byCoord.values()].map((h) => ({
    lat: h.lat, lng: h.lng, days: h.days, country: h.country,
    albums: h.albums, label: [...new Set(h.labels)].join(' · '),
  }));
  return { houses, trailPoints };
}
