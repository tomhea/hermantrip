// Arrow placement math for the globe trip-trail (fix/globe-towers #1). Pure —
// no DOM, no THREE.
//
// The previous arrows floated BELOW the bowed great-circle arcs (they sat at a
// flat near-surface altitude while the arc bowed up) and were oversized. Each
// globe.gl arc bows to an apex whose height grows with the segment's angular
// length. We replicate that height here so an arrow placed at the great-circle
// MIDPOINT, at this same apex altitude, lands exactly ON the line.

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
export function arcApexAltitude(a, b, scale = ARC_APEX_SCALE) {
  return angularDistance(a, b) * scale;
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
