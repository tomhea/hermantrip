import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  albumDayCount, globeScene, clusterOffsets,
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

// ── clusterOffsets: die-pip patterns ─────────────────────────────────
test('clusterOffsets length always equals n', () => {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16]) {
    assert.equal(clusterOffsets(n).length, n, `n=${n}`);
  }
  assert.deepEqual(clusterOffsets(0), []);
});

test('clusterOffsets(1) is a single centre', () => {
  assert.deepEqual(clusterOffsets(1), [[0, 0]]);
});

test('clusterOffsets(5) is a dice-5: four corners + centre', () => {
  const five = clusterOffsets(5).map((o) => o.join(','));
  for (const corner of ['1,-1', '1,1', '-1,-1', '-1,1']) { // [dLat,dLng] corners
    assert.ok(five.includes(corner), `missing corner ${corner}`);
  }
  assert.ok(five.includes('0,0'), 'missing centre pip');
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

// ── globeScene: houses + trail share clustered coords ────────────────
// album 1 is multi-city (Bangkok th + Kathmandu np) via ALBUM_CITIES; Bangkok is
// ALSO a CLOSING stop, so the Bangkok coordinate has 2 stops → clustered.
const manifest = {
  albums: [
    { id: 1, name: 'a', primary: 'np', slug: 's1', photos: [
      { capturedAt: '2011-03-02T09:00:00' }, { capturedAt: '2011-03-03T09:00:00' },
      { capturedAt: '2011-03-04T09:00:00' }, { capturedAt: '2011-03-05T09:00:00' },
    ] }, // 4 days / 2 cities = 2 each
  ],
};

test('globeScene: null manifest → empty scene; no albums → no houses', () => {
  assert.deepEqual(globeScene(null), { houses: [], trailPoints: [] });
  const empty = globeScene({ albums: [] });
  assert.deepEqual(empty.houses, []); // no album → no houses (opening/closing stops carry no album)
});

test('globeScene: one house per album city, days split, correct countries', () => {
  const { houses } = globeScene(manifest);
  const a1 = houses.filter((h) => h.album.id === 1);
  assert.equal(a1.length, 2); // Bangkok + Kathmandu
  assert.ok(a1.every((h) => h.days === 2)); // 4 days / 2 cities
  const byCountry = a1.map((h) => h.country).sort();
  assert.deepEqual(byCountry, ['np', 'th']);
});

test('globeScene: a clustered city is offset from its base coord; a singleton is not', () => {
  const { houses } = globeScene(manifest);
  const bangkok = houses.find((h) => h.country === 'th'); // shares coord with closing stop → clustered
  const kathmandu = houses.find((h) => h.country === 'np'); // single → centre
  assert.notEqual(bangkok.lat, 13.7563); // moved off the base Bangkok coord
  assert.equal(kathmandu.lat, 27.7172);  // singleton stays put
});

test('globeScene: trail threads the clustered coords (the Bangkok house is a trail point)', () => {
  const { houses, trailPoints } = globeScene(manifest);
  assert.ok(trailPoints.length >= 4); // open + 2 cities + closing(s)
  const bangkok = houses.find((h) => h.country === 'th');
  assert.ok(
    trailPoints.some((p) => Math.abs(p.lat - bangkok.lat) < 1e-9 && Math.abs(p.lng - bangkok.lng) < 1e-9),
    'the trail passes through the exact Bangkok house coordinate',
  );
});
