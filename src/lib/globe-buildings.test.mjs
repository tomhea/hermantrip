import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumDayCount, buildingsForGlobe, buildingHeightFraction, HEIGHT_SCALE, BUILDING_WIDTH, M49_BUILDING_WIDTH, WINDOWS_PER_FLOOR } from './globe-buildings.js';

test('albumDayCount counts DISTINCT calendar days (≥1)', () => {
  assert.equal(albumDayCount({ photos: [
    { capturedAt: '2011-03-02T09:00:00' },
    { capturedAt: '2011-03-02T18:00:00' }, // same day
    { capturedAt: '2011-03-04T10:00:00' },
  ] }), 2);
  assert.equal(albumDayCount({ photos: [] }), 1);       // floor at 1
  assert.equal(albumDayCount({ photos: [{ id: 'x' }] }), 1); // no capturedAt
});

// album 1 is multi-city (Bangkok+Kathmandu) via ALBUM_CITIES; album 6 single.
const manifest = {
  albums: [
    { id: 1, name: 'a', primary: 'np', slug: 's1', photos: [
      { capturedAt: '2011-03-02T09:00:00' }, { capturedAt: '2011-03-03T09:00:00' },
      { capturedAt: '2011-03-04T09:00:00' }, { capturedAt: '2011-03-05T09:00:00' },
    ] }, // 4 days, 2 cities → 2 days each
    { id: 6, name: 'c', primary: 'np', slug: 's6', photos: [
      { capturedAt: '2011-04-01T09:00:00' }, { capturedAt: '2011-04-02T09:00:00' },
    ] }, // 2 days, 1 place → 2 days
  ],
};

test('multi-place album splits its days 1/X across places (album 1: 4 days / 2 cities = 2 each)', () => {
  const b = buildingsForGlobe(manifest);
  const album1 = b.filter((x) => x.album.id === 1);
  assert.equal(album1.length, 2);                 // Bangkok + Kathmandu
  assert.ok(album1.every((x) => x.days === 2));   // 4 / 2
});

test('single-place album keeps its full day count (album 6: 2 days)', () => {
  const b = buildingsForGlobe(manifest);
  const album6 = b.filter((x) => x.album.id === 6);
  assert.equal(album6.length, 1);
  assert.equal(album6[0].days, 2);
});

test('every building carries lat/lng/days/country/album', () => {
  for (const x of buildingsForGlobe(manifest)) {
    assert.equal(typeof x.lat, 'number');
    assert.equal(typeof x.lng, 'number');
    assert.ok(x.days > 0);
    assert.ok(typeof x.country === 'string');
    assert.ok(x.album && x.album.id);
  }
});

test('buildings sharing a coordinate are nudged apart (distinct lng)', () => {
  // Two single-place albums at the SAME coord → two buildings, different lng.
  const m = {
    albums: [
      { id: 6, name: 'x', primary: 'np', slug: 'a', photos: [{ capturedAt: '2011-04-01T00:00:00' }] },
      { id: 6, name: 'y', primary: 'np', slug: 'b', photos: [{ capturedAt: '2011-04-02T00:00:00' }] },
    ],
  };
  const b = buildingsForGlobe(m);
  assert.equal(b.length, 2);
  assert.notEqual(b[0].lng, b[1].lng); // spread apart
  assert.equal(b[0].lat, b[1].lat);    // same latitude row
});

test('returns [] for a null/empty manifest', () => {
  assert.deepEqual(buildingsForGlobe(null), []);
  assert.deepEqual(buildingsForGlobe({ albums: [] }), []);
});

test('M49: buildingHeightFraction is a QUARTER of the old cylinder height', () => {
  // old fraction = 0.02 + ratio*0.45; new = ×0.25
  assert.equal(HEIGHT_SCALE, 0.25);
  assert.ok(Math.abs(buildingHeightFraction(10, 10) - (0.02 + 0.45) * 0.25) < 1e-9); // max
  assert.ok(Math.abs(buildingHeightFraction(0, 10) - 0.02 * 0.25) < 1e-9);           // min
  assert.ok(Math.abs(buildingHeightFraction(5, 10) - (0.02 + 0.225) * 0.25) < 1e-9); // mid
});

test('M49: buildingHeightFraction clamps + tolerates maxDays 0', () => {
  assert.ok(buildingHeightFraction(99, 10) <= (0.02 + 0.45) * 0.25 + 1e-9); // clamped at ratio 1
  assert.equal(typeof buildingHeightFraction(3, 0), 'number'); // no divide-by-zero
});

test('M50: building footprint is a THIRD of the M49 width; one window per floor', () => {
  assert.ok(Math.abs(BUILDING_WIDTH - M49_BUILDING_WIDTH / 3) < 1e-9);
  assert.ok(BUILDING_WIDTH < M49_BUILDING_WIDTH); // slimmer
  assert.equal(WINDOWS_PER_FLOOR, 1);
});
