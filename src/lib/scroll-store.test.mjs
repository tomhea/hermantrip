import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  rememberScroll, recallScroll, forgetScroll, isSlideOf,
} from './scroll-store.js';

test('remember + recall round-trips a position', () => {
  rememberScroll('/nepal/leh', 1500);
  assert.equal(recallScroll('/nepal/leh'), 1500);
});

test('recall of an unseen key is 0', () => {
  assert.equal(recallScroll('/never/seen'), 0);
});

test('rememberScroll clamps junk / negatives to 0', () => {
  rememberScroll('/a/b', -50);
  assert.equal(recallScroll('/a/b'), 0);
  rememberScroll('/a/c', NaN);
  assert.equal(recallScroll('/a/c'), 0);
});

test('rememberScroll rounds fractional offsets', () => {
  rememberScroll('/a/d', 120.7);
  assert.equal(recallScroll('/a/d'), 121);
});

test('rememberScroll ignores empty / non-string keys', () => {
  rememberScroll('', 100);
  rememberScroll(null, 100);
  assert.equal(recallScroll(''), 0);
});

test('forgetScroll drops a stored position', () => {
  rememberScroll('/x/y', 300);
  forgetScroll('/x/y');
  assert.equal(recallScroll('/x/y'), 0);
});

// ── isSlideOf ────────────────────────────────────────────────────
test('isSlideOf: a numeric slide segment IS a slide of the album', () => {
  assert.equal(isSlideOf('/nepal/leh/12', '/nepal/leh'), true);
  assert.equal(isSlideOf('/nepal/leh/0', '/nepal/leh'), true);
});

test('isSlideOf: the album page itself is NOT a slide of itself', () => {
  assert.equal(isSlideOf('/nepal/leh', '/nepal/leh'), false);
});

test('isSlideOf: a non-numeric trailing segment is not a slide', () => {
  assert.equal(isSlideOf('/nepal/leh/random', '/nepal/leh'), false);
});

test('isSlideOf: a different album with a shared prefix is not a slide', () => {
  // "/nepal/lehx" must not count as a slide of "/nepal/leh"
  assert.equal(isSlideOf('/nepal/lehx/1', '/nepal/leh'), false);
});

test('isSlideOf: guards bad input', () => {
  assert.equal(isSlideOf(null, '/nepal/leh'), false);
  assert.equal(isSlideOf('/nepal/leh/1', ''), false);
});
