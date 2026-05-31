import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { countryMapLabels } from './country-labels.js';
import { COUNTRIES } from './countries.js';

test('countryMapLabels returns a label for all seven trip countries', () => {
  const labels = countryMapLabels();
  assert.equal(labels.length, 7);
  assert.deepEqual(
    labels.map((l) => l.code).sort(),
    COUNTRIES.map((c) => c.code).sort(),
  );
});

test('each label carries the canonical Hebrew name + numeric coords', () => {
  const heByCode = new Map(COUNTRIES.map((c) => [c.code, c.he]));
  for (const l of countryMapLabels()) {
    assert.equal(l.he, heByCode.get(l.code), `${l.code} he must match countries.js`);
    assert.match(l.he, /[֐-׿]/, 'Hebrew text');
    assert.equal(typeof l.lat, 'number');
    assert.equal(typeof l.lng, 'number');
    assert.ok(l.lat >= -90 && l.lat <= 90);
    assert.ok(l.lng >= -180 && l.lng <= 180);
  }
});

test('labels are placed in the right hemisphere (AU/NZ south, Asia north)', () => {
  const byCode = Object.fromEntries(countryMapLabels().map((l) => [l.code, l]));
  assert.ok(byCode.au.lat < 0 && byCode.nz.lat < 0); // southern
  assert.ok(byCode.np.lat > 0 && byCode.th.lat > 0); // northern
});
