import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { photoImgHTML } from './photo-img.js';

const photo = {
  id: 'FILE123',
  name: 'DSC_1.jpg',
  thumbnailLink: 'https://lh3.googleusercontent.com/drive-storage/abc=s220',
};

test('builds an img with the lh3 thumb URL for the given intent', () => {
  const html = photoImgHTML(photo, { intent: 'thumb' });
  assert.match(html, /<img\b/);
  assert.match(html, /src="https:\/\/lh3\.googleusercontent\.com\/d\/FILE123=w300"/);
});

test('passes dpr through to the URL', () => {
  const html = photoImgHTML(photo, { intent: 'thumb', dpr: 2 });
  assert.match(html, /=w600/);
});

test('passes viewport through for slide intent', () => {
  const html = photoImgHTML(photo, { intent: 'slide', viewport: 'desktop' });
  assert.match(html, /=w1600/);
});

test('includes loading="lazy" by default (R5)', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb' }), /loading="lazy"/);
});

test('eager loading when loading:"eager" passed (first paint above the fold)', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb', loading: 'eager' }), /loading="eager"/);
});

test('onerror chain falls back to thumbnailLink then broken class (R4)', () => {
  const html = photoImgHTML(photo, { intent: 'thumb' });
  assert.match(html, /onerror="[^"]*this\.dataset\.fb/);
  assert.match(html, /this\.src='https:\/\/lh3\.googleusercontent\.com\/drive-storage\/abc=s220'/);
  assert.match(html, /photo-broken/);
});

test('onerror with no thumbnailLink goes straight to broken class', () => {
  const html = photoImgHTML({ id: 'X1', name: 'a.jpg' }, { intent: 'thumb' });
  assert.match(html, /onerror="this\.classList\.add\('photo-broken'\)"/);
});

test('applies a custom className', () => {
  const html = photoImgHTML(photo, { intent: 'thumb', className: 'album-thumb' });
  assert.match(html, /class="album-thumb"/);
});

test('default className is "photo"', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb' }), /class="photo"/);
});

test('alt defaults to empty (decorative) and is escaped when provided', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb' }), /alt=""/);
  const html = photoImgHTML(photo, { intent: 'thumb', alt: 'a "quote" <tag>' });
  assert.match(html, /alt="a &quot;quote&quot; &lt;tag&gt;"/);
});

test('decoding="async" is set', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb' }), /decoding="async"/);
});

test('escapes a malicious thumbnailLink to prevent attribute breakout', () => {
  const evil = { id: 'X1', name: 'a.jpg', thumbnailLink: 'x" onload="alert(1)' };
  const html = photoImgHTML(evil, { intent: 'thumb' });
  assert.equal(html.includes('onload="alert(1)"'), false);
});
