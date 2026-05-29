import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { shuffle } from './random.js';

// Deterministic PRNG for reproducible assertions.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('preserves the multiset (same elements)', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(input, mulberry32(42));
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});

test('does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5];
  const snap = JSON.stringify(input);
  shuffle(input, mulberry32(1));
  assert.equal(JSON.stringify(input), snap);
});

test('returns a new array', () => {
  const input = [1, 2, 3];
  assert.notEqual(shuffle(input, mulberry32(1)), input);
});

test('deterministic for a given seed', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(123));
  const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(123));
  assert.deepEqual(a, b);
});

test('different seeds usually differ (sanity)', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(1));
  const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(2));
  assert.notDeepEqual(a, b);
});

test('actually reorders (not identity) for a typical seed', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.notDeepEqual(shuffle(input, mulberry32(7)), input);
});

test('empty + single', () => {
  assert.deepEqual(shuffle([], mulberry32(1)), []);
  assert.deepEqual(shuffle([42], mulberry32(1)), [42]);
});

test('works with the default rng (Math.random) — still a permutation', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});
