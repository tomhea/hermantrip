// src/lib/country-colors.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { countryColor, COUNTRY_COLORS, countryMotifId } from './country-colors.js';
import { COUNTRY_ORDER } from './countries.js';

test('every country code has a distinct colour', () => {
  const colours = COUNTRY_ORDER.map((c) => countryColor(c));
  assert.equal(colours.length, 7);
  assert.equal(new Set(colours).size, 7, 'all 7 colours must be distinct');
  for (const col of colours) assert.match(col, /^#[0-9a-f]{6}$/i);
});

test('countryColor falls back to accent for unknown codes', () => {
  assert.equal(countryColor('xx'), '#b56439');
});

test('motif id is namespaced per country', () => {
  assert.equal(countryMotifId('np'), 'motif-np');
});
