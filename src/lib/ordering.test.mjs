import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { sortPhotosByFilename, sortPhotosByDate } from './ordering.js';

test('empty array returns empty', () => {
  assert.deepEqual(sortPhotosByFilename([]), []);
});

test.describe('sortPhotosByDate (M14)', () => {
  test('orders by capturedAt ascending', () => {
    const out = sortPhotosByDate([
      { id: 'c', name: 'z.jpg', capturedAt: '2011-07-23T10:00:00' },
      { id: 'a', name: 'a.jpg', capturedAt: '2011-07-21T10:00:00' },
      { id: 'b', name: 'm.jpg', capturedAt: '2011-07-22T10:00:00' },
    ]);
    assert.deepEqual(out.map((p) => p.id), ['a', 'b', 'c']);
  });
  test('same instant → filename tiebreak', () => {
    const out = sortPhotosByDate([
      { id: 'y', name: 'y.jpg', capturedAt: '2011-07-23T10:00:00' },
      { id: 'x', name: 'x.jpg', capturedAt: '2011-07-23T10:00:00' },
    ]);
    assert.deepEqual(out.map((p) => p.id), ['x', 'y']);
  });
  test('undated photos sort AFTER dated ones', () => {
    const out = sortPhotosByDate([
      { id: 'u', name: 'a.jpg' },
      { id: 'd', name: 'z.jpg', capturedAt: '2011-07-23T10:00:00' },
    ]);
    assert.deepEqual(out.map((p) => p.id), ['d', 'u']);
  });
  test('all-undated falls back to filename order (preserves old behavior)', () => {
    const out = sortPhotosByDate([
      { id: 'b', name: 'IMG_0002.jpg' },
      { id: 'a', name: 'IMG_0001.jpg' },
    ]);
    assert.deepEqual(out.map((p) => p.id), ['a', 'b']);
  });
  test('non-mutating', () => {
    const input = [
      { id: 'b', name: 'b', capturedAt: '2011-07-23T10:00:00' },
      { id: 'a', name: 'a', capturedAt: '2011-07-21T10:00:00' },
    ];
    const snap = JSON.stringify(input);
    sortPhotosByDate(input);
    assert.equal(JSON.stringify(input), snap);
  });
});

test('already-sorted returns equivalent order', () => {
  const input = [{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }];
  const out = sortPhotosByFilename(input);
  assert.deepEqual(out.map((p) => p.name), ['a.jpg', 'b.jpg', 'c.jpg']);
});

test('reverse-sorted gets sorted', () => {
  const input = [{ name: 'c.jpg' }, { name: 'b.jpg' }, { name: 'a.jpg' }];
  const out = sortPhotosByFilename(input);
  assert.deepEqual(out.map((p) => p.name), ['a.jpg', 'b.jpg', 'c.jpg']);
});

test('numeric suffixes sort lexicographically (NOT numerically)', () => {
  // The spec is explicit: lex, not numeric. IMG_010 < IMG_2 in lex order
  // because '0' < '2' at position 4.
  const input = [
    { name: 'IMG_2.jpg' },
    { name: 'IMG_010.jpg' },
    { name: 'IMG_001.jpg' },
  ];
  const out = sortPhotosByFilename(input);
  assert.deepEqual(
    out.map((p) => p.name),
    ['IMG_001.jpg', 'IMG_010.jpg', 'IMG_2.jpg'],
  );
});

test('case-sensitive: uppercase comes before lowercase', () => {
  const input = [{ name: 'b.jpg' }, { name: 'A.jpg' }];
  const out = sortPhotosByFilename(input);
  assert.deepEqual(out.map((p) => p.name), ['A.jpg', 'b.jpg']);
});

test('does not mutate input array', () => {
  const input = [{ name: 'c.jpg' }, { name: 'a.jpg' }, { name: 'b.jpg' }];
  const snapshot = input.map((p) => p.name);
  sortPhotosByFilename(input);
  assert.deepEqual(input.map((p) => p.name), snapshot);
});

test('returns a new array, not the original', () => {
  const input = [{ name: 'a.jpg' }];
  const out = sortPhotosByFilename(input);
  assert.notEqual(out, input);
});
