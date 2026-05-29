import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { requestStrategy } from './sw-strategy.js';

const ORIGIN = 'https://hermantrip.tomhe.app';

test('same-origin HTML navigation → network-first', () => {
  assert.equal(requestStrategy(`${ORIGIN}/`, ORIGIN), 'network-first');
  assert.equal(requestStrategy(`${ORIGIN}/index.html`, ORIGIN), 'network-first');
});

test('same-origin JS / CSS → network-first (so code updates are never stale)', () => {
  assert.equal(requestStrategy(`${ORIGIN}/src/main.js`, ORIGIN), 'network-first');
  assert.equal(requestStrategy(`${ORIGIN}/src/styles/main.css`, ORIGIN), 'network-first');
});

test('the manifest is always bypassed (must be fresh, never cache-served)', () => {
  assert.equal(requestStrategy(`${ORIGIN}/data/manifest.json`, ORIGIN), 'bypass');
});

test('cross-origin photo (lh3) → bypass', () => {
  assert.equal(
    requestStrategy('https://lh3.googleusercontent.com/d/abc=w800', ORIGIN),
    'bypass',
  );
});

test('same-origin proxied photo (/img/...) → bypass (not in shell cache)', () => {
  assert.equal(requestStrategy(`${ORIGIN}/img/FILE123/280`, ORIGIN), 'bypass');
  assert.equal(requestStrategy(`${ORIGIN}/img/FILE123/orig`, ORIGIN), 'bypass');
});

test('cross-origin font (gstatic) → bypass', () => {
  assert.equal(
    requestStrategy('https://fonts.gstatic.com/s/rubik/x.woff2', ORIGIN),
    'bypass',
  );
});

test('localhost dev origin also resolves shell as network-first', () => {
  const dev = 'http://localhost:8080';
  assert.equal(requestStrategy(`${dev}/src/main.js`, dev), 'network-first');
  assert.equal(requestStrategy(`${dev}/data/manifest.json`, dev), 'bypass');
});

test('query strings on the manifest still bypass', () => {
  assert.equal(requestStrategy(`${ORIGIN}/data/manifest.json?v=2`, ORIGIN), 'bypass');
});
