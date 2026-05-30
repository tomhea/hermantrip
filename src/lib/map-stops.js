// Map stops (M27). Pure — no DOM, no fetch.
//
// The trip as an ORDERED list of geographic stops. Most albums are a single
// stop (from album-coords.js), but:
//   - the trip opens with גבעת שמואל (an "empty" stop with NO album), then
//     Bangkok, before Kathmandu (album 1 spans Bangkok + Kathmandu);
//   - 14 albums whose title names two/three cities place a pin per city, all
//     linking to that one album.
// This single ordered list is the source of truth for BOTH the map pins and
// the gradient trail, so they always agree.

import { coordsForAlbum } from './album-coords.js';

// Opening stops, before the first album. albumId:null ⇒ "empty" pin (a pin
// with a label/hover but no album link).
export const OPENING_STOPS = [
  { lat: 32.0778, lng: 34.8483, label: 'גבעת שמואל', albumId: null },
];

// Albums that place MULTIPLE pins. albumId → ordered [lat, lng, label, country?]
// city list (country overrides the per-stop colour; defaults to album.primary).
// Coordinates hand-curated from the Hebrew place names in the album titles.
export const ALBUM_CITIES = {
  1:  [[13.7563, 100.5018, 'בנגקוק', 'th'], [27.7172, 85.3240, 'קטמנדו', 'np']],
  2:  [[27.7172, 85.5208, 'נגארקוט'], [27.6710, 85.4298, 'בקטפור']],
  20: [[10.8231, 106.6297, 'סייגון'], [10.0341, 105.7880, 'דלתת המקונג']],
  31: [[29.5523, 103.7667, 'לשאן'], [29.6010, 103.4843, 'אמישאן']],
  37: [[25.0389, 102.7183, 'קונמינג', 'cn'], [13.7563, 100.5018, 'בנגקוק', 'th'], [-31.9505, 115.8605, "פרת'", 'au']],
  39: [[-13.2294, 130.7853, 'ליכטפילד'], [-12.4634, 130.8456, 'דארווין']],
  40: [[-16.9186, 145.7781, 'קיירנס'], [-15.4670, 145.2500, 'קוקטאון']],
  42: [[-19.2590, 146.8169, 'טאונזוויל'], [-19.1547, 146.8500, 'מגנטיק איילנד']],
  43: [[-20.2697, 148.7189, "איירלי ביץ'"], [-18.2871, 147.6992, 'הריף הגדול']],
  44: [[-19.2590, 146.8169, 'טאונזוויל'], [-27.4698, 153.0251, 'בריסביין']],
  47: [[-28.0167, 153.4000, 'גולד קוסט'], [-30.8833, 153.0333, 'SW Rocks']],
  59: [[-38.6857, 176.0702, 'טאופו'], [-39.1333, 175.6420, 'טונגרירו']],
  61: [[-41.2969, 174.0039, 'פיקטון'], [-41.2706, 173.2840, 'נלסון']],
  82: [[18.1620, 97.9300, 'מה סריאט'], [16.7167, 98.5667, 'מה סוט']],
};

// Ordered trip stops. Each: { lat, lng, label, albumId, primary, slug, country }.
// albumId/primary/slug are null for opening (empty) stops.
export function tripStops(manifest) {
  if (!manifest || !Array.isArray(manifest.albums)) return [];
  const stops = OPENING_STOPS.map((s) => ({
    ...s, primary: null, slug: null, country: null,
  }));

  for (const album of manifest.albums) {
    const cities = ALBUM_CITIES[album.id];
    if (cities) {
      for (const [lat, lng, label, country] of cities) {
        stops.push({
          lat, lng, label, albumId: album.id,
          primary: album.primary, slug: album.slug,
          country: country || album.primary,
        });
      }
    } else {
      const c = coordsForAlbum(album.id);
      if (!c) continue;
      const [lat, lng, label] = c;
      stops.push({
        lat, lng, label, albumId: album.id,
        primary: album.primary, slug: album.slug, country: album.primary,
      });
    }
  }
  return stops;
}

// Pins grouped by exact coordinate (so two albums sharing a city render as one
// pin whose popup lists both). → [{ lat, lng, stops:[stop,...] }] in first-seen
// (trip) order.
export function tripStopGroups(manifest) {
  const groups = new Map();
  for (const s of tripStops(manifest)) {
    const key = `${s.lat},${s.lng}`;
    if (!groups.has(key)) groups.set(key, { lat: s.lat, lng: s.lng, stops: [] });
    groups.get(key).stops.push(s);
  }
  return [...groups.values()];
}

// Ordered [{lat,lng}] for the trail, dropping consecutive duplicate coords so
// revisits to the same spot don't make zero-length segments.
export function tripTrailPoints(manifest) {
  const pts = [];
  for (const s of tripStops(manifest)) {
    const prev = pts[pts.length - 1];
    if (prev && prev.lat === s.lat && prev.lng === s.lng) continue;
    pts.push({ lat: s.lat, lng: s.lng });
  }
  return pts;
}
