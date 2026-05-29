import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { photoImgHTML } from './photo-img.js';

const photo = {
  id: 'FILE123',
  name: 'DSC_1.jpg',
  thumbnailLink: 'https://lh3.googleusercontent.com/drive-storage/abc=s220',
};

test('builds an img with the same-origin /img/ thumb URL for the given intent', () => {
  const html = photoImgHTML(photo, { intent: 'thumb' });
  assert.match(html, /<img\b/);
  assert.match(html, /src="\/img\/FILE123\/140"/);
});

test('passes dpr through to the URL', () => {
  const html = photoImgHTML(photo, { intent: 'thumb', dpr: 2 });
  assert.match(html, /src="\/img\/FILE123\/280"/);
});

test('passes viewport through for slide intent', () => {
  const html = photoImgHTML(photo, { intent: 'slide', viewport: 'desktop' });
  assert.match(html, /src="\/img\/FILE123\/920"/);
});

test('never emits a raw Google URL (same-origin only)', () => {
  const html = photoImgHTML(photo, { intent: 'card', dpr: 2 });
  assert.equal(/googleusercontent|drive\.google/.test(html), false);
});

test('includes loading="lazy" by default (R5)', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb' }), /loading="lazy"/);
});

test('eager loading when loading:"eager" passed (first paint above the fold)', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb', loading: 'eager' }), /loading="eager"/);
});

test('no fetchpriority attribute by default', () => {
  assert.equal(/fetchpriority/.test(photoImgHTML(photo, { intent: 'thumb' })), false);
});

test('fetchpriority="high" emitted when priority:"high" passed (on-screen images)', () => {
  assert.match(photoImgHTML(photo, { intent: 'thumb', priority: 'high' }), /fetchpriority="high"/);
});

test('onerror tags the element for the CSS placeholder (no thumbnailLink hop needed now)', () => {
  // Same-origin proxied images can't be ORB-blocked, so the old
  // lh3-thumbnailLink fallback is gone; onerror just flags a genuine miss.
  const html = photoImgHTML(photo, { intent: 'thumb' });
  assert.match(html, /onerror="this\.classList\.add\('photo-broken'\)"/);
  assert.equal(html.includes('dataset.fb'), false);
  assert.equal(html.includes('drive-storage'), false);
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

test('rejects a malformed photo id (cannot break out of the attribute)', () => {
  // imageUrl validates the id; a bad id throws rather than emitting unsafe HTML.
  assert.throws(() => photoImgHTML({ id: 'x" onload="alert(1)', name: 'a.jpg' }, { intent: 'thumb' }));
});
