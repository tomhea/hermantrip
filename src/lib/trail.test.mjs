import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { trailColor, orderedTrailPoints, bearing, trailSegments } from './trail.js';

// ── trailColor ────────────────────────────────────────────────────
test('trailColor(0) is green, trailColor(1) is red', () => {
  assert.equal(trailColor(0), '#2e9e4f');
  assert.equal(trailColor(1), '#d6402e');
});

test('trailColor(0.5) is the yellow midpoint stop', () => {
  assert.equal(trailColor(0.5), '#e8c33a');
});

test('trailColor clamps out-of-range t', () => {
  assert.equal(trailColor(-1), '#2e9e4f');
  assert.equal(trailColor(2), '#d6402e');
});

test('trailColor interpolates between stops (0.125 ≈ green→blue mix)', () => {
  const c = trailColor(0.125);
  assert.match(c, /^#[0-9a-f]{6}$/);
  assert.notEqual(c, '#2e9e4f');
  assert.notEqual(c, '#3b7dd8');
});

// ── orderedTrailPoints ────────────────────────────────────────────
const manifest = {
  albums: [
    { id: 1 },  // Kathmandu 27.7172,85.3240
    { id: 2 },  // Nagarkot
    { id: 19 }, // Bangkok 13.7563,100.5018
    { id: 77 }, // Bangkok again (same coords → dup, dropped)
    { id: 88 }, // Bangkok final (same coords → dup, dropped)
  ],
};

test('orderedTrailPoints follows album order with albumId', () => {
  const pts = orderedTrailPoints(manifest);
  assert.equal(pts[0].albumId, 1);
  assert.ok(pts.every((p) => typeof p.lat === 'number' && typeof p.lng === 'number'));
});

test('orderedTrailPoints drops consecutive duplicate coordinates', () => {
  const pts = orderedTrailPoints(manifest);
  assert.equal(pts.length, 3);
  assert.deepEqual(pts.map((p) => p.albumId), [1, 2, 19]);
});

test('orderedTrailPoints returns [] for null manifest', () => {
  assert.deepEqual(orderedTrailPoints(null), []);
});

// ── bearing ───────────────────────────────────────────────────────
test('bearing east is ~90°, north is ~0°', () => {
  const e = bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(e - 90) < 1, `east bearing ${e}`);
  const n = bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(n < 1 || n > 359, `north bearing ${n}`);
});

test('bearing south is ~180°, west is ~270°', () => {
  const s = bearing({ lat: 1, lng: 0 }, { lat: 0, lng: 0 });
  assert.ok(Math.abs(s - 180) < 1, `south bearing ${s}`);
  const w = bearing({ lat: 0, lng: 1 }, { lat: 0, lng: 0 });
  assert.ok(Math.abs(w - 270) < 1, `west bearing ${w}`);
});

// ── trailSegments ─────────────────────────────────────────────────
test('trailSegments count = points - 1', () => {
  const pts = orderedTrailPoints(manifest);
  assert.equal(trailSegments(pts).length, pts.length - 1);
});

test('trailSegments first is green, last is red; t spans 0→1', () => {
  const pts = [
    { lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 0, lng: 2 }, { lat: 0, lng: 3 },
  ];
  const segs = trailSegments(pts);
  assert.equal(segs[0].t, 0);
  assert.equal(segs[segs.length - 1].t, 1);
  assert.equal(segs[0].color, '#2e9e4f');
  assert.equal(segs[segs.length - 1].color, '#d6402e');
});

test('trailSegments carries from/to/color/bearing', () => {
  const segs = trailSegments([{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }]);
  const s = segs[0];
  assert.deepEqual(s.from, [0, 0]);
  assert.deepEqual(s.to, [0, 1]);
  assert.match(s.color, /^#[0-9a-f]{6}$/);
  assert.ok(Math.abs(s.bearing - 90) < 1);
});

test('trailSegments returns [] for <2 points', () => {
  assert.deepEqual(trailSegments([]), []);
  assert.deepEqual(trailSegments([{ lat: 0, lng: 0 }]), []);
});
