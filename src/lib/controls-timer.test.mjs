import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { shouldHide, CONTROLS_HIDE_MS } from './controls-timer.js';

test('CONTROLS_HIDE_MS is 5 seconds', () => {
  assert.equal(CONTROLS_HIDE_MS, 5000);
});

test('hides once idle ≥ hide window', () => {
  assert.equal(shouldHide({ lastActivityAt: 0, now: 5000 }), true);
  assert.equal(shouldHide({ lastActivityAt: 0, now: 6000 }), true);
});

test('stays visible while still within the window', () => {
  assert.equal(shouldHide({ lastActivityAt: 0, now: 4999 }), false);
  assert.equal(shouldHide({ lastActivityAt: 1000, now: 3000 }), false);
});

test('never hides while the pointer is over the bar', () => {
  assert.equal(shouldHide({ lastActivityAt: 0, now: 999999, hoveringBar: true }), false);
});

test('respects a custom hideAfterMs', () => {
  assert.equal(shouldHide({ lastActivityAt: 0, now: 2000, hideAfterMs: 3000 }), false);
  assert.equal(shouldHide({ lastActivityAt: 0, now: 3000, hideAfterMs: 3000 }), true);
});

test('exactly at the boundary hides (>= window)', () => {
  assert.equal(shouldHide({ lastActivityAt: 1000, now: 6000 }), true); // 5000 elapsed
});
