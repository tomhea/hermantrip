// Arrow placement math for the globe trip-trail (fix/globe-towers #1). Pure —
// no DOM, no THREE.
//
// The previous arrows floated BELOW the bowed great-circle arcs (they sat at a
// flat near-surface altitude while the arc bowed up) and were oversized. Each
// globe.gl arc bows to an apex whose height grows with the segment's angular
// length. We replicate that height here so an arrow placed at the great-circle
// MIDPOINT, at this same apex altitude, lands exactly ON the line.

import { ISRAEL, BANGKOK } from './map-stops.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Central-angle distance between two [lat,lng] points, in radians (0..π).
export function angularDistance(a, b) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = (lat2 - lat1) * D2R;
  const dLng = (lng2 - lng1) * D2R;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Apex altitude (globe-radius fraction) of an arc, proportional to its angular
// length — short hops stay flat, long hauls bow high. We set globe.gl's
// arcAltitude to this SAME value per-arc so the arc apex and the arrow agree.
export const ARC_APEX_SCALE = 0.22;

// The גבעת שמואל ↔ Bangkok long-haul is flown BOTH ways (outbound at the very
// start, return at the very end). As great circles the two legs coincide and
// hide each other; we bow them to DIFFERENT altitudes so the green outbound and
// the red return are both visible (the globe analog of the 2D map's
// opposite-side bowing).
const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-3 && Math.abs(p[1] - q[1]) < 1e-3;
export function israelBangkokLeg(from, to) {
  if (near(from, ISRAEL) && near(to, BANGKOK)) return 'outbound';
  if (near(from, BANGKOK) && near(to, ISRAEL)) return 'return';
  return null;
}
export const ISRAEL_LEG_ALT_SCALE = { outbound: 1.6, return: 0.7 };

// Apex altitude of an arc, proportional to its angular length. The two
// Israel↔Bangkok legs are lifted apart (above) so they don't overlap.
export function arcApexAltitude(a, b, scale = ARC_APEX_SCALE) {
  const base = angularDistance(a, b) * scale;
  const leg = israelBangkokLeg(a, b);
  return leg ? base * ISRAEL_LEG_ALT_SCALE[leg] : base;
}

// Arrowheads only on segments at least this long (radians, ~3.4°). Dense
// clusters (Nepal/India) otherwise pile up unreadable arrows; the trip-line
// itself still shows the route there, just without the arrow confetti.
export const MIN_ARROW_ANGLE = 0.06;
export function arrowVisible(from, to) {
  return angularDistance(from, to) >= MIN_ARROW_ANGLE;
}

// Great-circle midpoint of two [lat,lng] points → [lat,lng]. This is where the
// arc reaches its apex; placing the arrow here (at arcApexAltitude) sits it on
// the arc. (Standard spherical-midpoint formula.)
export function greatCircleMidpoint(a, b) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const f1 = lat1 * D2R;
  const f2 = lat2 * D2R;
  const l1 = lng1 * D2R;
  const dl = (lng2 - lng1) * D2R;
  const bx = Math.cos(f2) * Math.cos(dl);
  const by = Math.cos(f2) * Math.sin(dl);
  const fm = Math.atan2(
    Math.sin(f1) + Math.sin(f2),
    Math.sqrt((Math.cos(f1) + bx) ** 2 + by ** 2),
  );
  const lm = l1 + Math.atan2(by, Math.cos(f1) + bx);
  return [fm * R2D, ((lm * R2D + 540) % 360) - 180];
}
