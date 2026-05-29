import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { shouldReloadForController } from './sw-update.js';

test('reloads when a new SW takes over a page that already had a controller', () => {
  assert.equal(shouldReloadForController({ alreadyReloaded: false, hadController: true }), true);
});

test('does NOT reload on first install (page had no controller before)', () => {
  assert.equal(shouldReloadForController({ alreadyReloaded: false, hadController: false }), false);
});

test('does NOT reload twice (guard against loops)', () => {
  assert.equal(shouldReloadForController({ alreadyReloaded: true, hadController: true }), false);
});

test('already-reloaded + first-install → still no reload', () => {
  assert.equal(shouldReloadForController({ alreadyReloaded: true, hadController: false }), false);
});
