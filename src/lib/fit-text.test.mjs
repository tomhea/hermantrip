import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fitFontPx } from './fit-text.js';

test('already fits → font size unchanged', () => {
  assert.equal(fitFontPx(100, 120, 14), 14);
  assert.equal(fitFontPx(120, 120, 14), 14);
});

test('overflow → shrinks proportionally (floored to whole px)', () => {
  assert.equal(fitFontPx(190, 135, 14), 9);   // floor(14 * 135/190) = floor(9.94)
  assert.equal(fitFontPx(280, 238, 14), 11);  // floor(14 * 238/280) = floor(11.9)
});

test('never goes below the min floor', () => {
  assert.equal(fitFontPx(1000, 50, 14, 9), 9); // proportional ~0.7 → clamped to 9
});

test('never grows above the current size', () => {
  assert.equal(fitFontPx(50, 999, 14), 14);
});

test('zero/invalid widths → unchanged (no divide-by-zero)', () => {
  assert.equal(fitFontPx(0, 100, 14), 14);
  assert.equal(fitFontPx(100, 0, 14), 14);
});
