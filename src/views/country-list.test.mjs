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

test('happy path: each card has a same-origin /img/ card image', () => {
  const html = renderCountryList({ manifest });
  assert.match(html, /<img class="country-thumb"[^>]*src="\/img\/photo-np\/360"/);
  assert.match(html, /<img class="country-thumb"[^>]*src="\/img\/photo-th\/360"/);
});

test('happy path: card image never emits a raw Google URL', () => {
  const html = renderCountryList({ manifest });
  assert.equal(/googleusercontent|drive\.google/.test(html), false);
});

test('happy path: image uses loading="lazy" (R5 budget)', () => {
  const html = renderCountryList({ manifest });
  assert.match(html, /loading="lazy"/);
});

test('happy path: image onerror shows the placeholder (no thumbnailLink hop)', () => {
  const m = {
    countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
    albums: [{ id: 1, name: 'a', primary: 'np', countries: ['np'],
      photos: [{ id: 'p1', name: 'a.jpg' }] }],
  };
  const html = renderCountryList({ manifest: m });
  assert.match(html, /onerror="this\.classList\.add\('country-thumb-broken'\)"/);
  assert.equal(html.includes('dataset.fb'), false);
});

test('happy path: DPR is passed through to image URL', () => {
  const html = renderCountryList({ manifest, dpr: 2 });
  assert.match(html, /src="\/img\/photo-np\/720"/);
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
