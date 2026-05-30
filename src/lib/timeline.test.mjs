import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseDate, formatDayHe, dayKey, buildTimeline, timelinePhotoCount } from './timeline.js';

// ── parseDate ─────────────────────────────────────────────────────
test('parseDate: valid capturedAt → Date', () => {
  const d = parseDate('2011-03-15T10:30:00');
  assert.ok(d instanceof Date);
  assert.equal(d.getFullYear(), 2011);
  assert.equal(d.getMonth(), 2); // March = 2
  assert.equal(d.getDate(), 15);
});

test('parseDate: null → null', () => { assert.equal(parseDate(null), null); });
test('parseDate: undefined → null', () => { assert.equal(parseDate(undefined), null); });
test('parseDate: invalid string → null', () => { assert.equal(parseDate('not-a-date'), null); });

// ── formatDayHe ──────────────────────────────────────────────────
test('formatDayHe: formats correctly', () => {
  const d = new Date(2011, 2, 15); // 15 March 2011
  assert.equal(formatDayHe(d), '15 במרץ 2011');
});

test('formatDayHe: null → null', () => { assert.equal(formatDayHe(null), null); });

// ── dayKey ───────────────────────────────────────────────────────
test('dayKey: extracts YYYY-MM-DD', () => {
  assert.equal(dayKey('2011-03-15T10:30:00'), '2011-03-15');
});

test('dayKey: null → null', () => { assert.equal(dayKey(null), null); });
test('dayKey: bad format → null', () => { assert.equal(dayKey('bad'), null); });

// ── buildTimeline ────────────────────────────────────────────────
const makeAlbum = (id, dates) => ({
  id, name: `Album ${id}`, title: `Album ${id}`,
  primary: 'np', countries: ['np'],
  photos: dates.map((d, i) => ({ id: `p${id}_${i}`, capturedAt: d })),
});

const manifest = {
  albums: [
    makeAlbum(1, ['2011-03-15T08:00:00', '2011-03-15T09:00:00', '2011-03-16T10:00:00']),
    makeAlbum(2, ['2011-03-14T07:00:00', null, '2011-03-15T11:00:00']),
  ],
};

test('buildTimeline: returns sorted day-buckets', () => {
  const t = buildTimeline(manifest);
  const keys = t.filter(b => b.key).map(b => b.key);
  assert.deepEqual(keys, ['2011-03-14', '2011-03-15', '2011-03-16']);
});

test('buildTimeline: groups photos by day correctly', () => {
  const t = buildTimeline(manifest);
  const march15 = t.find(b => b.key === '2011-03-15');
  assert.ok(march15);
  // 2 from album 1 + 1 from album 2
  assert.equal(march15.photos.length, 3);
});

test('buildTimeline: undated photos go into a null-key bucket at end', () => {
  const t = buildTimeline(manifest);
  const last = t[t.length - 1];
  assert.equal(last.key, null);
  assert.equal(last.label, 'תאריך לא ידוע');
  assert.equal(last.photos.length, 1);
});

test('buildTimeline: Hebrew label for a bucket', () => {
  const t = buildTimeline(manifest);
  const march15 = t.find(b => b.key === '2011-03-15');
  assert.equal(march15.label, '15 במרץ 2011');
});

test('buildTimeline: returns [] for null manifest', () => {
  assert.deepEqual(buildTimeline(null), []);
});

test('buildTimeline: returns [] for empty albums', () => {
  assert.deepEqual(buildTimeline({ albums: [] }), []);
});

test('buildTimeline: each photo entry has { photo, album }', () => {
  const t = buildTimeline(manifest);
  for (const bucket of t) {
    for (const entry of bucket.photos) {
      assert.ok('photo' in entry && 'album' in entry);
    }
  }
});

// ── timelinePhotoCount ────────────────────────────────────────────
test('timelinePhotoCount: sums all photos', () => {
  const t = buildTimeline(manifest);
  // 2+1+1 = 4 dated + 1 undated = 5 (album 1: 3 photos, album 2: 3 photos → total 6... but 1 null)
  // Actually: album1=[2011-03-15,2011-03-15,2011-03-16] (3) + album2=[2011-03-14,null,2011-03-15] (3) = 6 total
  assert.equal(timelinePhotoCount(t), 6);
});
