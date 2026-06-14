import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { COUNTRY_HERO, heroPhotoId } from './country-hero.js';
import { COUNTRY_ORDER } from './countries.js';

test('every country has a curated hero photo id', () => {
  for (const code of COUNTRY_ORDER) {
    const id = heroPhotoId(code);
    assert.equal(typeof id, 'string', `${code} should have a hero id`);
    assert.match(id, /^[\w-]+$/);
  }
});

test('hero ids are distinct (one chosen photo per country)', () => {
  const ids = COUNTRY_ORDER.map((c) => heroPhotoId(c));
  assert.equal(new Set(ids).size, ids.length);
});

test('COUNTRY_HERO covers exactly the 7 trip countries', () => {
  assert.deepEqual(Object.keys(COUNTRY_HERO).sort(), [...COUNTRY_ORDER].sort());
});

test('unknown code falls back to null (caller uses auto-pick)', () => {
  assert.equal(heroPhotoId('xx'), null);
});
