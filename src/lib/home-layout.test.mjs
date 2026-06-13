// src/lib/home-layout.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { homeLayers } from './home-layout.js';

const seven = ['np', 'in', 'vn', 'cn', 'au', 'nz', 'th'];

test('desktop: 3 layers 2/2/3 in trip order', () => {
  const layers = homeLayers(seven, 'desktop');
  assert.deepEqual(layers, [['np', 'in'], ['vn', 'cn'], ['au', 'nz', 'th']]);
});
test('phone: 4 layers 2/2/2/1 in trip order', () => {
  const layers = homeLayers(seven, 'phone');
  assert.deepEqual(layers, [['np', 'in'], ['vn', 'cn'], ['au', 'nz'], ['th']]);
});
test('the last desktop layer is the tall finale (3 wide)', () => {
  assert.equal(homeLayers(seven, 'desktop').at(-1).length, 3);
});
