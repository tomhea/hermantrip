import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { imageUrl } from './image-url.js';

const BASE = 'https://lh3.googleusercontent.com/d/';

test('thumb intent: =w300 at DPR 1', () => {
  assert.equal(imageUrl('abc', 'thumb'), `${BASE}abc=w300`);
});

test('thumb intent: =w600 at DPR 2', () => {
  assert.equal(imageUrl('abc', 'thumb', { dpr: 2 }), `${BASE}abc=w600`);
});

test('thumb intent caps at 600 even at DPR 3', () => {
  assert.equal(imageUrl('abc', 'thumb', { dpr: 3 }), `${BASE}abc=w600`);
});

test('pin intent: =w120 default', () => {
  assert.equal(imageUrl('xyz', 'pin'), `${BASE}xyz=w120`);
});

test('pin intent: caps at 240 at high DPR', () => {
  assert.equal(imageUrl('xyz', 'pin', { dpr: 4 }), `${BASE}xyz=w240`);
});

test('slide intent on phone: =w800 at DPR 1', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone' }), `${BASE}id=w800`);
});

test('slide intent on tablet: =w1600 baseline', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'tablet' }), `${BASE}id=w1600`);
});

test('slide intent on desktop: =w1600 baseline', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop' }), `${BASE}id=w1600`);
});

test('slide intent: phone × DPR 2 = 1600', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'phone', dpr: 2 }), `${BASE}id=w1600`);
});

test('slide intent: desktop × DPR 2 caps at 2400', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop', dpr: 2 }), `${BASE}id=w2400`);
});

test('slide intent: caps at 2400 even at DPR 3 desktop', () => {
  assert.equal(imageUrl('id', 'slide', { viewport: 'desktop', dpr: 3 }), `${BASE}id=w2400`);
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
