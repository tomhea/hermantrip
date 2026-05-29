import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { imageUrl } from './image-url.js';

const BASE = 'https://lh3.googleusercontent.com/d/';

// M6 right-sizing: widths are tuned to the actual display size so we don't
// pay for pixels we never show. Measured bytes for a representative photo:
//   w280 ≈ 20 KB (grid thumb)   vs the old w600 ≈ 70 KB
//   w1040 ≈ 160 KB (phone slide) vs the old w1600 ≈ 243 KB (full original)

test('thumb intent: =w140 at DPR 1 (small grid tile)', () => {
  assert.equal(imageUrl('abc', 'thumb'), `${BASE}abc=w140`);
});

test('thumb intent: =w280 at DPR 2', () => {
  assert.equal(imageUrl('abc', 'thumb', { dpr: 2 }), `${BASE}abc=w280`);
});

test('thumb intent caps at 280 even at DPR 3', () => {
  assert.equal(imageUrl('abc', 'thumb', { dpr: 3 }), `${BASE}abc=w280`);
});

test('pin intent: =w120 default', () => {
  assert.equal(imageUrl('xyz', 'pin'), `${BASE}xyz=w120`);
});

test('pin intent: caps at 240 at high DPR', () => {
  assert.equal(imageUrl('xyz', 'pin', { dpr: 4 }), `${BASE}xyz=w240`);
});

test('slide intent on phone: =w520 at DPR 1', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone' }), `${BASE}id=w520`);
});

test('slide intent on phone DPR 2: =w1040 (sharp on a 390px screen, ~160 KB)', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone', dpr: 2 }), `${BASE}id=w1040`);
});

test('slide intent on phone caps at 1080 at DPR 3', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone', dpr: 3 }), `${BASE}id=w1080`);
});

test('slide intent on tablet: =w760 baseline', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'tablet' }), `${BASE}id=w760`);
});

test('slide intent on desktop: =w920 baseline', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop' }), `${BASE}id=w920`);
});

test('slide intent on desktop DPR 2 caps at 2000', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop', dpr: 2 }), `${BASE}id=w1840`);
});

test('slide intent caps at 2000 at DPR 3 desktop', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop', dpr: 3 }), `${BASE}id=w2000`);
});

test('original intent: =w2400 regardless of DPR', () => {
  assert.equal(imageUrl('id', 'original'), `${BASE}id=w2400`);
  assert.equal(imageUrl('id', 'original', { dpr: 3 }), `${BASE}id=w2400`);
});

test('unknown intent throws', () => {
  assert.throws(() => imageUrl('id', 'unknownIntent'), /intent/i);
});

test('missing fileId throws', () => {
  assert.throws(() => imageUrl('', 'thumb'));
  assert.throws(() => imageUrl(null, 'thumb'));
  assert.throws(() => imageUrl(undefined, 'thumb'));
});

test('fileId with special URL chars is rejected (Drive IDs are alphanumeric+_-)', () => {
  assert.throws(() => imageUrl('a/b', 'thumb'));
  assert.throws(() => imageUrl('a?b', 'thumb'));
  assert.throws(() => imageUrl('a b', 'thumb'));
});
