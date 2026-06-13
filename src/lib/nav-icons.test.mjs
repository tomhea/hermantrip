// src/lib/nav-icons.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { icon, ICON_NAMES } from './nav-icons.js';

test('exposes the chosen icon set', () => {
  assert.deepEqual(
    [...ICON_NAMES].sort(),
    ['game', 'map', 'moon', 'slideshow', 'sun', 'timeline'].sort(),
  );
});
test('icon() returns an inline svg using currentColor (themeable)', () => {
  const svg = icon('map');
  assert.match(svg, /^<svg/);
  assert.match(svg, /currentColor/);
  assert.match(svg, /aria-hidden="true"/);
});
test('unknown icon returns empty string (never throws)', () => {
  assert.equal(icon('nope'), '');
});
