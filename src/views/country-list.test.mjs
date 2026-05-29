import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderCountryList } from './country-list.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] },
    { code: 'th', he: 'תאילנד', en: 'Thailand', primaryAlbums: [19] },
  ],
  albums: [
    { id: 1, name: 'one', primary: 'np', countries: ['np', 'th'],
      photos: [{ id: 'photo-np', name: 'a.jpg' }] },
    { id: 19, name: 'th', primary: 'th', countries: ['th'],
      photos: [{ id: 'photo-th', name: 'a.jpg' }] },
  ],
};

test('happy path: renders header + grid with one card per country', () => {
  const html = renderCountryList({ manifest });
  assert.match(html, /class="display">הרמן בדרכים/);
  assert.match(html, /class="country-grid"/);
  assert.match(html, /href="#\/country\/np"/);
  assert.match(html, /href="#\/country\/th"/);
  assert.match(html, /נפאל/);
  assert.match(html, /תאילנד/);
});

test('happy path: each card has a thumb image with lh3 URL', () => {
  const html = renderCountryList({ manifest });
  assert.match(html, /<img class="country-thumb"[^>]*src="https:\/\/lh3\.googleusercontent\.com\/d\/photo-np=w140"/);
  assert.match(html, /<img class="country-thumb"[^>]*src="https:\/\/lh3\.googleusercontent\.com\/d\/photo-th=w140"/);
});

test('happy path: image uses loading="lazy" (R5 budget)', () => {
  const html = renderCountryList({ manifest });
  assert.match(html, /loading="lazy"/);
});

test('happy path: image has onerror fallback to thumbnailLink (R4)', () => {
  const m = {
    countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
    albums: [{ id: 1, name: 'a', primary: 'np', countries: ['np'],
      photos: [{ id: 'p1', name: 'a.jpg',
        thumbnailLink: 'https://lh3.googleusercontent.com/drive-storage/abc=s220' }] }],
  };
  const html = renderCountryList({ manifest: m });
  // onerror sets data-fb, swaps src to thumbnailLink on first failure,
  // then falls through to the broken-image placeholder on second failure
  assert.match(html, /onerror="[^"]*this\.dataset\.fb/);
  assert.match(html, /this\.src='https:\/\/lh3\.googleusercontent\.com\/drive-storage\/abc=s220'/);
  assert.match(html, /country-thumb-broken/);
});

test('happy path: image with no thumbnailLink still has broken-placeholder onerror', () => {
  const m = {
    countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
    albums: [{ id: 1, name: 'a', primary: 'np', countries: ['np'],
      photos: [{ id: 'p1', name: 'a.jpg' /* no thumbnailLink */ }] }],
  };
  const html = renderCountryList({ manifest: m });
  assert.match(html, /onerror="this\.classList\.add\('country-thumb-broken'\)"/);
});

test('happy path: DPR is passed through to image URL', () => {
  const html = renderCountryList({ manifest, dpr: 2 });
  assert.match(html, /=w280/);
});

test('fetch-failed state: renders errorHTML', () => {
  const html = renderCountryList({ manifest: null, error: new Error('boom') });
  assert.match(html, /role="alert"/);
  assert.match(html, /לא הצלחנו לטעון/);
  // Header still renders so user has visual context
  assert.match(html, /הרמן בדרכים/);
});

test('loading state: renders loadingHTML when manifest is null + no error', () => {
  const html = renderCountryList({ manifest: null, error: null });
  assert.match(html, /role="status"/);
  assert.match(html, /טוען\.\.\./);
});

test('empty-manifest state: renders empty message when countries=[]', () => {
  const empty = { countries: [], albums: [] };
  const html = renderCountryList({ manifest: empty });
  assert.match(html, /אין מדינות להצגה/);
});

test('empty-manifest state: also when countries is missing', () => {
  const empty = { albums: [] };
  const html = renderCountryList({ manifest: empty });
  assert.match(html, /אין מדינות להצגה/);
});

test('country with no thumb falls back to placeholder div', () => {
  const m = {
    countries: [{ code: 'x', he: 'X', en: 'X', primaryAlbums: [] }],
    albums: [],
  };
  const html = renderCountryList({ manifest: m });
  assert.match(html, /class="country-thumb country-thumb-empty"/);
});

test('escapes country names to prevent XSS', () => {
  const m = {
    countries: [{ code: 'x', he: '<script>alert(1)</script>', en: 'X', primaryAlbums: [] }],
    albums: [],
  };
  const html = renderCountryList({ manifest: m });
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
});
