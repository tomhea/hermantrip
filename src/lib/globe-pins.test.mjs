import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumDayCount, pinsForGlobe, buildingHeightFraction, BUILDING_WIDTH, WINDOWS_PER_FLOOR, windowColumns } from './globe-pins.js';

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
  const pins = pinsForGlobe(manifest);
  const album1 = pins.filter((x) => x.album.id === 1);
  assert.equal(album1.length, 2);                 // Bangkok + Kathmandu
  assert.ok(album1.every((x) => x.days === 2));   // 4 / 2
});

test('single-place album keeps its full day count (album 6: 2 days)', () => {
  const album6 = pinsForGlobe(manifest).filter((x) => x.album.id === 6);
  assert.equal(album6.length, 1);
  assert.equal(album6[0].days, 2);
});

test('every pin carries lat/lng/days/country/album', () => {
  for (const x of pinsForGlobe(manifest)) {
    assert.equal(typeof x.lat, 'number');
    assert.equal(typeof x.lng, 'number');
    assert.ok(x.days > 0);
    assert.ok(typeof x.country === 'string');
    assert.ok(x.album && x.album.id);
  }
});

test('pins sharing a coordinate are nudged apart (distinct lng, same lat)', () => {
  const m = {
    albums: [
      { id: 6, name: 'x', primary: 'np', slug: 'a', photos: [{ capturedAt: '2011-04-01T00:00:00' }] },
      { id: 6, name: 'y', primary: 'np', slug: 'b', photos: [{ capturedAt: '2011-04-02T00:00:00' }] },
    ],
  };
  const pins = pinsForGlobe(m);
  assert.equal(pins.length, 2);
  assert.notEqual(pins[0].lng, pins[1].lng); // spread apart
  assert.equal(pins[0].lat, pins[1].lat);    // same latitude row
});

test('returns [] for a null/empty manifest', () => {
  assert.deepEqual(pinsForGlobe(null), []);
  assert.deepEqual(pinsForGlobe({ albums: [] }), []);
});

// buildingHeightFraction: SHORT houses — a quarter of the old cylinder height.
test('buildingHeightFraction is a quarter of the cylinder height, clamped', () => {
  assert.ok(Math.abs(buildingHeightFraction(10, 10) - (0.02 + 0.45) * 0.25) < 1e-9); // max
  assert.ok(Math.abs(buildingHeightFraction(0, 10) - 0.02 * 0.25) < 1e-9);           // min
  assert.ok(Math.abs(buildingHeightFraction(5, 10) - (0.02 + 0.225) * 0.25) < 1e-9); // mid
  assert.ok(buildingHeightFraction(99, 10) <= (0.02 + 0.45) * 0.25 + 1e-9);          // clamped
  assert.equal(typeof buildingHeightFraction(3, 0), 'number');                       // no /0
});

test('window geometry: WINDOWS_PER_FLOOR windows evenly spaced; slim footprint', () => {
  assert.equal(WINDOWS_PER_FLOOR, 2);
  assert.ok(BUILDING_WIDTH > 0 && BUILDING_WIDTH < 1);
  const two = windowColumns(WINDOWS_PER_FLOOR, 64, 18);
  assert.equal(two.length, 2);
  assert.ok(two[0].x < two[1].x);          // left-to-right
  assert.equal(windowColumns(0, 64, 18).length, 1); // floors at 1
});
