import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  albumDayCount, globeScene,
  buildingHeightFraction, BUILDING_WIDTH, WINDOWS_PER_FLOOR, windowColumns,
} from './globe-pins.js';

test('albumDayCount counts DISTINCT calendar days (≥1)', () => {
  assert.equal(albumDayCount({ photos: [
    { capturedAt: '2011-03-02T09:00:00' },
    { capturedAt: '2011-03-02T18:00:00' }, // same day
    { capturedAt: '2011-03-04T10:00:00' },
  ] }), 2);
  assert.equal(albumDayCount({ photos: [] }), 1);
  assert.equal(albumDayCount({ photos: [{ id: 'x' }] }), 1);
});

test('window geometry helpers', () => {
  assert.equal(WINDOWS_PER_FLOOR, 2);
  assert.ok(BUILDING_WIDTH > 0 && BUILDING_WIDTH < 1);
  assert.equal(windowColumns(2, 64, 18).length, 2);
  assert.equal(windowColumns(0, 64, 18).length, 1);
});

test('buildingHeightFraction: short quarter height, clamped', () => {
  assert.ok(Math.abs(buildingHeightFraction(10, 10) - (0.02 + 0.45) * 0.25) < 1e-9);
  assert.ok(Math.abs(buildingHeightFraction(0, 10) - 0.02 * 0.25) < 1e-9);
  assert.ok(buildingHeightFraction(99, 10) <= (0.02 + 0.45) * 0.25 + 1e-9);
  assert.equal(typeof buildingHeightFraction(3, 0), 'number');
});

// ── globeScene: one tower per coordinate, co-located visits collapsed ──
test('globeScene: null manifest → empty scene; no albums → no houses', () => {
  assert.deepEqual(globeScene(null), { houses: [], trailPoints: [] });
  const empty = globeScene({ albums: [] });
  assert.deepEqual(empty.houses, []); // no album → no houses (opening/closing carry none)
});

// album 1 is multi-city (Bangkok th + Kathmandu np) via ALBUM_CITIES; Bangkok is
// ALSO a CLOSING stop. Each of the two cities is its own coordinate.
const multiCity = {
  albums: [
    { id: 1, name: 'a', primary: 'np', slug: 's1', photos: [
      { capturedAt: '2011-03-02T09:00:00' }, { capturedAt: '2011-03-03T09:00:00' },
      { capturedAt: '2011-03-04T09:00:00' }, { capturedAt: '2011-03-05T09:00:00' },
    ] }, // 4 days / 2 cities = 2 each
  ],
};

test('globeScene: one house per city, days split, correct countries, base coords', () => {
  const { houses } = globeScene(multiCity);
  assert.equal(houses.length, 2); // Bangkok + Kathmandu
  assert.ok(houses.every((h) => h.days === 2)); // 4 days / 2 cities
  assert.ok(houses.every((h) => h.albums.length === 1));
  assert.deepEqual(houses.map((h) => h.country).sort(), ['np', 'th']);
  // No dice offset any more — towers stand at their exact base coordinate.
  const bangkok = houses.find((h) => h.country === 'th');
  assert.equal(bangkok.lat, 13.7563);
  assert.equal(bangkok.lng, 100.5018);
});

// Two DISTINCT albums (19 + 77, both Bangkok via album-coords) share the
// Bangkok coordinate → they must collapse into ONE tower (#2).
const colocated = {
  albums: [
    { id: 19, name: 'bkk-a', primary: 'th', slug: 's19', photos: [
      { capturedAt: '2011-04-01T09:00:00' }, { capturedAt: '2011-04-02T09:00:00' },
    ] }, // 2 days
    { id: 77, name: 'bkk-b', primary: 'th', slug: 's77', photos: [
      { capturedAt: '2011-09-01T09:00:00' }, { capturedAt: '2011-09-02T09:00:00' },
      { capturedAt: '2011-09-03T09:00:00' },
    ] }, // 3 days
  ],
};

test('globeScene: co-located visits collapse into ONE tower, days SUMMED, albums listed (#2)', () => {
  const { houses } = globeScene(colocated);
  const bangkok = houses.filter((h) => h.lat === 13.7563 && h.lng === 100.5018);
  assert.equal(bangkok.length, 1);            // one tower, not two houses
  assert.equal(bangkok[0].albums.length, 2);  // both visits offered in the picker
  assert.equal(bangkok[0].days, 5);           // height ∝ SUM of the days there
  assert.deepEqual(bangkok[0].albums.map((a) => a.id).sort((x, y) => x - y), [19, 77]);
});

test('globeScene: trail threads the (base) house coords', () => {
  const { houses, trailPoints } = globeScene(colocated);
  assert.ok(trailPoints.length >= 2);
  const bangkok = houses[0];
  assert.ok(
    trailPoints.some((p) => p.lat === bangkok.lat && p.lng === bangkok.lng),
    'the trail passes through the exact Bangkok tower coordinate',
  );
});
