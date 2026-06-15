import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumDayCount, pinsForGlobe, pinHeightFraction } from './globe-pins.js';

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

// pinHeightFraction: visible cylinder height ∝ days (the M48 cylinder formula,
// NOT the quartered building scale — pins read as taller markers).
test('pinHeightFraction scales 0.02..0.47 by days, clamped', () => {
  assert.ok(Math.abs(pinHeightFraction(10, 10) - (0.02 + 0.45)) < 1e-9); // max
  assert.ok(Math.abs(pinHeightFraction(0, 10) - 0.02) < 1e-9);           // min
  assert.ok(Math.abs(pinHeightFraction(5, 10) - (0.02 + 0.225)) < 1e-9); // mid
  assert.ok(pinHeightFraction(99, 10) <= 0.47 + 1e-9);                    // clamped
  assert.equal(typeof pinHeightFraction(3, 0), 'number');                // no /0
});
