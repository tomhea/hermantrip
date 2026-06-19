import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildScrubberSegments, scrubToBucketIndex } from './scrubber.js';

// timeline buckets: { key, label, photos:[{album:{primary,countries}}] }
// As real buildTimeline does, all photos of one album share ONE album object
// (the scrubber aggregates per-album by object identity).
function day(primary, countries, n) {
  const album = { primary, countries: countries || [primary] };
  return {
    key: 'k', label: 'l',
    photos: Array.from({ length: n }, () => ({ album })),
  };
}

// ── buildScrubberSegments (Task 8.1) ─────────────────────────────
test('one segment per contiguous country run, weight = photo count', () => {
  const segs = buildScrubberSegments([day('np', null, 3), day('np', null, 2), day('in', null, 6)]);
  assert.deepEqual(segs.map((s) => s.country), ['np', 'in']);
  assert.equal(segs[0].weight, 5);
  assert.equal(segs[1].weight, 6);
});

test('a recurring country produces multiple segments', () => {
  const segs = buildScrubberSegments([day('th', null, 1), day('np', null, 4), day('th', null, 5)]);
  assert.deepEqual(segs.map((s) => s.country), ['th', 'np', 'th']);
});

test('a multi-country album day splits per country, ordered by SHARED_ORDER override', () => {
  const segs = buildScrubberSegments([day('cn', ['cn', 'au', 'th'], 3)]);
  assert.deepEqual(segs.map((s) => s.country), ['cn', 'th', 'au']);
});

test('adjacent same-country slivers merge across a shared-album boundary', () => {
  const segs = buildScrubberSegments([day('cn', null, 4), day('cn', ['cn', 'au', 'th'], 3), day('au', null, 5)]);
  assert.deepEqual(segs.map((s) => s.country), ['cn', 'th', 'au']);
});

test('every segment carries its colour', () => {
  const segs = buildScrubberSegments([day('np', null, 1)]);
  assert.equal(segs[0].color, '#4f7a8c');
});

test('empty / missing timeline → no segments', () => {
  assert.deepEqual(buildScrubberSegments([]), []);
  assert.deepEqual(buildScrubberSegments(null), []);
});

// ── scrubToBucketIndex (Task 8.1; powers the hold tooltip + jump) ──
test('scrubToBucketIndex: 0 → first bucket, 1 → last bucket', () => {
  const tl = [day('np', null, 3), day('in', null, 6)];
  assert.equal(scrubToBucketIndex(0, tl), 0);
  assert.equal(scrubToBucketIndex(1, tl), 1);
});

test('scrubToBucketIndex: maps by cumulative photo weight, not bucket-linear', () => {
  const tl = [day('np', null, 3), day('in', null, 6)]; // total 9 photos
  assert.equal(scrubToBucketIndex(0.2, tl), 0); // 1.8 ≤ 3 → still Nepal
  assert.equal(scrubToBucketIndex(0.8, tl), 1); // 7.2 > 3 → India
});

test('scrubToBucketIndex: clamps out-of-range + empty', () => {
  const tl = [day('np', null, 2)];
  assert.equal(scrubToBucketIndex(-1, tl), 0);
  assert.equal(scrubToBucketIndex(2, tl), 0);
  assert.equal(scrubToBucketIndex(0.5, []), 0);
});
