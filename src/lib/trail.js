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

// A gently bowed arc between two [lat,lng] points, as an array of [lat,lng]
// samples (M37 / ask #12). Used for the גבעת שמואל↔Bangkok long-haul legs:
// drawing the outbound and the (reversed) return leg with the SAME bend makes
// them bow to opposite geographic sides — a clear round-trip lens where the
// green outbound and the red return are both visible instead of overlapping.
// `bend` is the bow depth as a fraction of the chord length (0 = straight).
export function arcPoints(from, to, bend = 0.18, samples = 24) {
  const [aLat, aLng] = from;
  const [bLat, bLng] = to;
  const dLat = bLat - aLat;
  const dLng = bLng - aLng;
  const len = Math.hypot(dLat, dLng) || 1;
  // Unit perpendicular to the chord (lat,lng): perp of (dLat,dLng) is
  // (dLng,-dLat). Control point is offset along it by `bend × chord length`.
  const perpLat = dLng / len;
  const perpLng = -dLat / len;
  const off = bend * len;
  const cLat = (aLat + bLat) / 2 + perpLat * off;
  const cLng = (aLng + bLng) / 2 + perpLng * off;
  const pts = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const u = 1 - t;
    // Quadratic Bézier: (1-t)²A + 2(1-t)t·C + t²B
    pts.push([
      u * u * aLat + 2 * u * t * cLat + t * t * bLat,
      u * u * aLng + 2 * u * t * cLng + t * t * bLng,
    ]);
  }
  return pts;
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
