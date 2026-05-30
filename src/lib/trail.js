// Map trail (M24). Pure geometry + color — no DOM, no fetch.
//
// Builds an ordered polyline that follows the trip in album order, coloured
// as a smooth gradient from green (start) through blue/yellow/orange to red
// (end) so direction reads at a glance. Arrowheads (rendered by main.js) use
// the per-segment bearing computed here.

import { coordsForAlbum } from './album-coords.js';

// 5-stop gradient: start → end.
const TRAIL_STOPS = [
  [0.0, [46, 158, 79]],   // green   #2e9e4f
  [0.25, [59, 125, 216]], // blue    #3b7dd8
  [0.5, [232, 195, 58]],  // yellow  #e8c33a
  [0.75, [232, 144, 46]], // orange  #e8902e
  [1.0, [214, 64, 46]],   // red     #d6402e
];

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function toHex([r, g, b]) {
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Colour at position t∈[0,1] along the gradient, as a #rrggbb hex string.
export function trailColor(t) {
  const x = clamp01(Number(t) || 0);
  for (let i = 1; i < TRAIL_STOPS.length; i += 1) {
    const [t0, c0] = TRAIL_STOPS[i - 1];
    const [t1, c1] = TRAIL_STOPS[i];
    if (x <= t1) {
      const f = t1 === t0 ? 0 : (x - t0) / (t1 - t0);
      return toHex([
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ]);
    }
  }
  return toHex(TRAIL_STOPS[TRAIL_STOPS.length - 1][1]);
}

// Ordered [{ lat, lng, albumId }] following the trip (manifest album order),
// dropping consecutive duplicate coordinates so revisits don't make
// zero-length segments (e.g. the 3 Bangkok albums collapse to one point).
export function orderedTrailPoints(manifest) {
  if (!manifest || !Array.isArray(manifest.albums)) return [];
  const pts = [];
  for (const album of manifest.albums) {
    const c = coordsForAlbum(album.id);
    if (!c) continue;
    const [lat, lng] = c;
    const prev = pts[pts.length - 1];
    if (prev && prev.lat === lat && prev.lng === lng) continue; // skip dup
    pts.push({ lat, lng, albumId: album.id });
  }
  return pts;
}

// Initial bearing (degrees, 0=N, 90=E) from point a to point b.
export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Segments connecting consecutive points, each coloured by its position in
// the sequence and carrying its bearing (for arrowheads).
// → [{ from:[lat,lng], to:[lat,lng], color, bearing, t }]
export function trailSegments(points) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const segs = [];
  const n = points.length - 1; // number of segments
  for (let i = 0; i < n; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const t = n === 1 ? 0 : i / (n - 1); // 0..1 across segments
    segs.push({
      from: [a.lat, a.lng],
      to: [b.lat, b.lng],
      color: trailColor(t),
      bearing: bearing(a, b),
      t,
    });
  }
  return segs;
}
