import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { imageUrl } from './image-url.js';

// Images are served same-origin via /img/{id}/{width}; the proxy (Caddy in
// prod, serve.mjs in dev) rewrites to lh3. So image-url.js emits NO raw
// Google URLs — that's the whole point of the M8 fix.

test('thumb intent: /img/{id}/140 at DPR 1', () => {
  assert.equal(imageUrl('abc', 'thumb'), '/img/abc/140');
});

test('thumb intent: /280 at DPR 2', () => {
  assert.equal(imageUrl('abc', 'thumb', { dpr: 2 }), '/img/abc/280');
});

test('thumb intent caps at 280 even at DPR 3', () => {
  assert.equal(imageUrl('abc', 'thumb', { dpr: 3 }), '/img/abc/280');
});

test('card intent: /360 at DPR 1 (preview hero)', () => {
  assert.equal(imageUrl('abc', 'card'), '/img/abc/360');
});

test('card intent: /720 at DPR 2', () => {
  assert.equal(imageUrl('abc', 'card', { dpr: 2 }), '/img/abc/720');
});

test('card intent caps at 720 even at DPR 3', () => {
  assert.equal(imageUrl('abc', 'card', { dpr: 3 }), '/img/abc/720');
});

test('pin intent: /120 default', () => {
  assert.equal(imageUrl('xyz', 'pin'), '/img/xyz/120');
});

test('pin intent caps at 240 at high DPR', () => {
  assert.equal(imageUrl('xyz', 'pin', { dpr: 4 }), '/img/xyz/240');
});

test('slide on phone: /520 at DPR 1', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone' }), '/img/id/520');
});

test('slide on phone DPR 2: /1040', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone', dpr: 2 }), '/img/id/1040');
});

test('slide on phone caps at 1080 at DPR 3', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone', dpr: 3 }), '/img/id/1080');
});

test('slide on tablet: /760 baseline', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'tablet' }), '/img/id/760');
});

test('slide on desktop: /920 baseline', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop' }), '/img/id/920');
});

test('slide on desktop DPR 2: /1840', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop', dpr: 2 }), '/img/id/1840');
});

test('slide on desktop caps at 2000 at DPR 3', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop', dpr: 3 }), '/img/id/2000');
});

test('original intent: /2400 regardless of DPR', () => {
  assert.equal(imageUrl('id', 'original'), '/img/id/2400');
  assert.equal(imageUrl('id', 'original', { dpr: 3 }), '/img/id/2400');
});

test('download intent: /img/{id}/orig (full original, server adds attachment header)', () => {
  assert.equal(imageUrl('id', 'download'), '/img/id/orig');
});

test('emits NO raw Google URL (same-origin only)', () => {
  const u = imageUrl('abc', 'thumb', { dpr: 2 });
  assert.equal(/googleusercontent|drive\.google/.test(u), false);
  assert.ok(u.startsWith('/img/'));
});

test('unknown intent throws', () => {
  assert.throws(() => imageUrl('id', 'unknownIntent'), /intent/i);
});

test('missing fileId throws', () => {
  assert.throws(() => imageUrl('', 'thumb'));
  assert.throws(() => imageUrl(null, 'thumb'));
  assert.throws(() => imageUrl(undefined, 'thumb'));
});

test('fileId with special URL chars is rejected', () => {
  assert.throws(() => imageUrl('a/b', 'thumb'));
  assert.throws(() => imageUrl('a?b', 'thumb'));
  assert.throws(() => imageUrl('a b', 'thumb'));
});
