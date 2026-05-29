import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  clampIndex, nextIndex, prevIndex, keyToAction, swipeToAction,
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
