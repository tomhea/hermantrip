import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { progressiveChain } from './progressive-img.js';

test('desktop chain: thumb → card → hero (low to high)', () => {
  assert.deepEqual(progressiveChain('abc', { dpr: 1, includeHero: true }), [
    '/img/abc/140', '/img/abc/360', '/img/abc/720',
  ]);
});

test('phone chain skips the full-res hero: thumb → card only', () => {
  assert.deepEqual(progressiveChain('abc', { dpr: 1, includeHero: false }), [
    '/img/abc/140', '/img/abc/360',
  ]);
});

test('DPR scales each step', () => {
  assert.deepEqual(progressiveChain('abc', { dpr: 2, includeHero: true }), [
    '/img/abc/280', '/img/abc/720', '/img/abc/1440',
  ]);
});

test('defaults include the hero step', () => {
  assert.equal(progressiveChain('abc').length, 3);
});
