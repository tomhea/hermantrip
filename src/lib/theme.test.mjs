// src/lib/theme.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolveTheme, nextTheme, THEMES } from './theme.js';

test('stored preference wins over system', () => {
  assert.equal(resolveTheme('dark', true), 'dark');
  assert.equal(resolveTheme('light', false), 'light');
});

test('no stored preference → follow system prefers-dark', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('invalid stored value is ignored (falls back to system)', () => {
  assert.equal(resolveTheme('purple', true), 'dark');
});

test('nextTheme toggles', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
  assert.deepEqual(THEMES, ['light', 'dark']);
});
