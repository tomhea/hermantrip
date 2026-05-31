import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { tripStops, tripStopGroups, tripTrailPoints, OPENING_STOPS, ALBUM_CITIES, CLOSING_STOPS, ISRAEL, BANGKOK } from './map-stops.js';

// Minimal manifest: album 1 (multi: Bangkok+Kathmandu), 2 (multi), 6 (single).
const manifest = {
  albums: [
    { id: 1, primary: 'np', slug: 'bangkok-kathmandu' },
    { id: 2, primary: 'np', slug: 'nagarkot-bhaktapur' },
    { id: 6, primary: 'np', slug: 'chitwan' }, // single → from album-coords
  ],
};

test('tripStops begins with the opening stops (Givat Shmuel, no album)', () => {
  const stops = tripStops(manifest);
  assert.equal(stops[0].label, 'גבעת שמואל');
  assert.equal(stops[0].albumId, null);
  assert.equal(stops[0].slug, null);
});

test('tripStops places Bangkok BEFORE Kathmandu for album 1', () => {
  const stops = tripStops(manifest);
  const bkk = stops.findIndex((s) => s.label === 'בנגקוק' && s.albumId === 1);
  const ktm = stops.findIndex((s) => s.label === 'קטמנדו' && s.albumId === 1);
  assert.ok(bkk !== -1 && ktm !== -1);
  assert.ok(bkk < ktm, 'Bangkok must come before Kathmandu');
});

test('multi-city album pins all link to the same album slug', () => {
  const stops = tripStops(manifest).filter((s) => s.albumId === 1);
  assert.equal(stops.length, 2);
  assert.ok(stops.every((s) => s.slug === 'bangkok-kathmandu'));
});

test('multi-city pins carry per-city country override (album 1: th then np)', () => {
  const stops = tripStops(manifest).filter((s) => s.albumId === 1);
  assert.equal(stops[0].country, 'th'); // Bangkok
  assert.equal(stops[1].country, 'np'); // Kathmandu
});

test('single-album falls back to album-coords (album 6 = Chitwan)', () => {
  const stops = tripStops(manifest);
  const chitwan = stops.find((s) => s.albumId === 6);
  assert.ok(chitwan);
  assert.equal(chitwan.label, "צ'יטואן");
  assert.equal(chitwan.country, 'np');
});

test('tripStopGroups merges pins at identical coordinates', () => {
  // album 1 Bangkok (13.7563,100.5018) — no other album in this manifest
  // shares it, so each group has 1 stop here; assert the structure/shape.
  const groups = tripStopGroups(manifest);
  for (const g of groups) {
    assert.ok(typeof g.lat === 'number' && typeof g.lng === 'number');
    assert.ok(Array.isArray(g.stops) && g.stops.length >= 1);
  }
  // Givat Shmuel is its own group.
  assert.ok(groups.some((g) => g.stops.some((s) => s.label === 'גבעת שמואל')));
});

test('tripTrailPoints drops consecutive duplicate coordinates', () => {
  // Bangkok appears in album 1 and (in the real manifest) again later; here
  // assert no two CONSECUTIVE points are identical.
  const pts = tripTrailPoints(manifest);
  for (let i = 1; i < pts.length; i += 1) {
    assert.ok(!(pts[i].lat === pts[i - 1].lat && pts[i].lng === pts[i - 1].lng),
      `consecutive dup at ${i}`);
  }
});

test('tripTrailPoints starts at Givat Shmuel', () => {
  const pts = tripTrailPoints(manifest);
  assert.equal(pts[0].lat, OPENING_STOPS[0].lat);
  assert.equal(pts[0].lng, OPENING_STOPS[0].lng);
});

test('all 14 listed multi-city albums are configured', () => {
  const expected = [1, 2, 20, 31, 37, 39, 40, 42, 43, 44, 47, 59, 61, 82];
  assert.deepEqual(Object.keys(ALBUM_CITIES).map(Number).sort((a, b) => a - b), expected);
});

test('album 37 places three pins (Kunming/Bangkok/Perth) in country order', () => {
  const m = { albums: [{ id: 37, primary: 'cn', slug: 'kunming-bangkok-perth' }] };
  const stops = tripStops(m).filter((s) => s.albumId === 37);
  assert.equal(stops.length, 3);
  assert.deepEqual(stops.map((s) => s.country), ['cn', 'th', 'au']);
  assert.ok(stops.every((s) => s.slug === 'kunming-bangkok-perth'));
});

test('tripStops returns [] for null manifest', () => {
  assert.deepEqual(tripStops(null), []);
});

// ── Closing leg / flight home (M37 / #12) ─────────────────────────
test('tripStops ends with the flight home: … → Bangkok → גבעת שמואל', () => {
  const stops = tripStops(manifest);
  const n = stops.length;
  assert.equal(stops[n - 2].label, 'בנגקוק');
  assert.equal(stops[n - 2].albumId, null);
  assert.equal(stops[n - 1].label, 'גבעת שמואל');
  assert.equal(stops[n - 1].albumId, null);
});

test('the trail closes back to גבעת שמואל (last trail point == ISRAEL)', () => {
  const pts = tripTrailPoints(manifest);
  const last = pts[pts.length - 1];
  assert.equal(last.lat, ISRAEL[0]);
  assert.equal(last.lng, ISRAEL[1]);
});

test('closing Bangkok reuses the existing coord (no new pin group)', () => {
  // The closing Bangkok stop shares album 1 Bangkok coords, so grouping by
  // coordinate must NOT create an extra Bangkok pin.
  const groups = tripStopGroups(manifest);
  const bkkGroups = groups.filter((g) => g.lat === BANGKOK[0] && g.lng === BANGKOK[1]);
  assert.equal(bkkGroups.length, 1, 'Bangkok should remain a single pin group');
});

test('CLOSING_STOPS / ISRAEL / BANGKOK constants are exported and consistent', () => {
  assert.equal(CLOSING_STOPS[CLOSING_STOPS.length - 1].label, 'גבעת שמואל');
  assert.deepEqual(ISRAEL, [32.0778, 34.8483]);
  assert.deepEqual(BANGKOK, [13.7563, 100.5018]);
});
