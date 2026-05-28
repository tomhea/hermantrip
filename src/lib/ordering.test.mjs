import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { sortPhotosByFilename } from './ordering.js';

test('empty array returns empty', () => {
  assert.deepEqual(sortPhotosByFilename([]), []);
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
