import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderCountryList } from './country-list.js';
import { heroPhotoId } from '../lib/country-hero.js';

// Full 7-country fixture (codes must be in COUNTRY_ORDER so the home layers fill).
const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] },
    { code: 'in', he: 'הודו', en: 'India', primaryAlbums: [2] },
    { code: 'vn', he: 'ויאטנם', en: 'Vietnam', primaryAlbums: [3] },
    { code: 'cn', he: 'סין', en: 'China', primaryAlbums: [4] },
    { code: 'au', he: 'אוסטרליה', en: 'Australia', primaryAlbums: [5] },
    { code: 'nz', he: 'ניו זילנד', en: 'New Zealand', primaryAlbums: [6] },
    { code: 'th', he: 'תאילנד', en: 'Thailand', primaryAlbums: [7] },
  ],
  albums: [
    { id: 1, name: 'a', primary: 'np', countries: ['np'], photos: [{ id: 'photo-np', name: 'a.jpg' }] },
    { id: 2, name: 'a', primary: 'in', countries: ['in'], photos: [{ id: 'photo-in', name: 'a.jpg' }] },
    { id: 3, name: 'a', primary: 'vn', countries: ['vn'], photos: [{ id: 'photo-vn', name: 'a.jpg' }] },
    { id: 4, name: 'a', primary: 'cn', countries: ['cn'], photos: [{ id: 'photo-cn', name: 'a.jpg' }] },
    { id: 5, name: 'a', primary: 'au', countries: ['au'], photos: [{ id: 'photo-au', name: 'a.jpg' }] },
    { id: 6, name: 'a', primary: 'nz', countries: ['nz'], photos: [{ id: 'photo-nz', name: 'a.jpg' }] },
    { id: 7, name: 'a', primary: 'th', countries: ['th'], photos: [{ id: 'photo-th', name: 'a.jpg' }] },
  ],
};

// --- new home structure (M2) ---

test('home tiles overlay the country name on the photo (no white meta box)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /class="country-tile"/);
  assert.match(html, /class="country-tile-name"/);
  assert.equal(/country-card-meta/.test(html), false); // old white meta box gone
});

test('home renders desktop + phone layer sets (both present; CSS shows one)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /data-layers="desktop"/);
  assert.match(html, /data-layers="phone"/);
});

test('the desktop set groups the trip into 4 parts (np·in / vn·cn / au·nz / th)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /class="home-parts" data-layers="desktop"/);
  const desktop = html.slice(html.indexOf('data-layers="desktop"'), html.indexOf('data-layers="phone"'));
  assert.equal((desktop.match(/class="home-part"/g) || []).length, 4); // the 4 logical parts
  assert.equal((desktop.match(/class="country-tile"/g) || []).length, 7);
});

test('nav uses the icon set + a theme toggle', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /class="nav-icon"/);
});

test('count rides as a hover-reveal sub-label (not always shown as a box)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /class="country-tile-count"/);
});

test('tiles link to each country page in trip order', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /class="country-tile" href="\/nepal"/);
  assert.match(html, /class="country-tile" href="\/thailand"/);
  assert.ok(html.indexOf('/nepal') < html.indexOf('/thailand'));
});

test('tiles paint a tiny thumb instantly and carry data-img-id for the progressive upgrade', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  const np = heroPhotoId('np');
  // instant background is the small thumb (140 at DPR1), NOT the heavy hero
  assert.match(html, new RegExp(`background-image:url\\('/img/${np}/140'\\)`));
  // main.js reads data-img-id to upgrade thumb → card → hero
  assert.match(html, new RegExp(`data-img-id="${np}"`));
  assert.equal(/googleusercontent|drive\.google/.test(html), false);
});

test('the hero override beats the auto-pick (uses the chosen id, not album photo-np)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, new RegExp(`data-img-id="${heroPhotoId('np')}"`));
  assert.equal(html.includes('/img/photo-np/'), false);
});

test('DPR scales the instant thumb (280 at DPR2)', () => {
  const html = renderCountryList({ manifest, dpr: 2 });
  assert.match(html, new RegExp(`background-image:url\\('/img/${heroPhotoId('np')}/280'\\)`));
});

test('every country carries its curated hero id for the upgrade', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  for (const code of ['np', 'in', 'vn', 'cn', 'au', 'nz', 'th']) {
    assert.match(html, new RegExp(`data-img-id="${heroPhotoId(code)}"`), `${code} hero id missing`);
  }
});

test('the all-countries random link triggers random-play (fullscreen+autostart)', () => {
  const html = renderCountryList({ manifest });
  assert.match(html, /href="\/random"[^>]*data-random-play/);
});

// --- state paths (R3) ---

test('fetch-failed state: renders errorHTML (header still shows for context)', () => {
  const html = renderCountryList({ manifest: null, error: new Error('boom') });
  assert.match(html, /role="alert"/);
  assert.match(html, /לא הצלחנו לטעון/);
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

test('escapes country names to prevent XSS', () => {
  const m = {
    countries: [{ code: 'np', he: '<script>alert(1)</script>', en: 'X', primaryAlbums: [] }],
    albums: [],
  };
  const html = renderCountryList({ manifest: m });
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
});
