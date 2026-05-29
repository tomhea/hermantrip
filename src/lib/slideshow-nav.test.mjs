import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  clampIndex, nextIndex, prevIndex, keyToAction, swipeToAction, preloadIndices,
} from './slideshow-nav.js';

test.describe('clampIndex', () => {
  test('in-range index unchanged', () => {
    assert.equal(clampIndex(3, 10), 3);
  });
  test('negative clamps to 0', () => {
    assert.equal(clampIndex(-5, 10), 0);
  });
  test('over-length clamps to last', () => {
    assert.equal(clampIndex(99, 10), 9);
  });
  test('non-integer string parses', () => {
    assert.equal(clampIndex('4', 10), 4);
  });
  test('garbage clamps to 0', () => {
    assert.equal(clampIndex('abc', 10), 0);
  });
  test('empty album → 0', () => {
    assert.equal(clampIndex(3, 0), 0);
  });
});

test.describe('nextIndex (wraps by default)', () => {
  test('advances by one', () => {
    assert.equal(nextIndex(2, 10), 3);
  });
  test('wraps last → first', () => {
    assert.equal(nextIndex(9, 10), 0);
  });
  test('no-wrap stays at last', () => {
    assert.equal(nextIndex(9, 10, { wrap: false }), 9);
  });
});

test.describe('prevIndex (wraps by default)', () => {
  test('goes back by one', () => {
    assert.equal(prevIndex(2, 10), 1);
  });
  test('wraps first → last', () => {
    assert.equal(prevIndex(0, 10), 9);
  });
  test('no-wrap stays at first', () => {
    assert.equal(prevIndex(0, 10, { wrap: false }), 0);
  });
});

test.describe('keyToAction (RTL: ArrowLeft = next)', () => {
  test('ArrowLeft → next', () => {
    assert.equal(keyToAction('ArrowLeft'), 'next');
  });
  test('ArrowRight → prev', () => {
    assert.equal(keyToAction('ArrowRight'), 'prev');
  });
  test('Escape → exit', () => {
    assert.equal(keyToAction('Escape'), 'exit');
  });
  test('spacebar → next', () => {
    assert.equal(keyToAction(' '), 'next');
  });
  test('unrelated key → null', () => {
    assert.equal(keyToAction('a'), null);
  });
});

test.describe('swipeToAction (RTL: rightward = next)', () => {
  test('big rightward swipe → next', () => {
    assert.equal(swipeToAction(80), 'next');
  });
  test('big leftward swipe → prev', () => {
    assert.equal(swipeToAction(-80), 'prev');
  });
  test('tiny movement below threshold → null', () => {
    assert.equal(swipeToAction(10), null);
  });
  test('custom threshold respected', () => {
    assert.equal(swipeToAction(30, 50), null);
    assert.equal(swipeToAction(60, 50), 'next');
  });
});

test.describe('preloadIndices (±2 neighbours, default radius 2)', () => {
  test('middle of a large album → the 2 before + 2 after, current excluded', () => {
    const got = preloadIndices(5, 20).sort((a, b) => a - b);
    assert.deepEqual(got, [3, 4, 6, 7]);
  });
  test('near the start wraps around to the end', () => {
    const got = preloadIndices(0, 20).sort((a, b) => a - b);
    assert.deepEqual(got, [1, 2, 18, 19]); // -1→19, -2→18, +1→1, +2→2
  });
  test('near the end wraps to the start', () => {
    const got = preloadIndices(19, 20).sort((a, b) => a - b);
    assert.deepEqual(got, [0, 1, 17, 18]);
  });
  test('never includes the current index', () => {
    assert.equal(preloadIndices(7, 20).includes(7), false);
  });
  test('small album (3 photos) → the other 2, no dupes, no current', () => {
    const got = preloadIndices(0, 3).sort((a, b) => a - b);
    assert.deepEqual(got, [1, 2]);
  });
  test('two-photo album → just the other one', () => {
    assert.deepEqual(preloadIndices(0, 2), [1]);
  });
  test('single-photo album → nothing to preload', () => {
    assert.deepEqual(preloadIndices(0, 1), []);
  });
  test('empty album → empty', () => {
    assert.deepEqual(preloadIndices(0, 0), []);
  });
  test('custom radius 1 → just ±1', () => {
    assert.deepEqual(preloadIndices(5, 20, 1).sort((a, b) => a - b), [4, 6]);
  });
});
