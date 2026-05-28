import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { pickCountryThumb } from './country-thumb.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1, 2, 3] },
    { code: 'th', he: 'תאילנד', en: 'Thailand', primaryAlbums: [19, 77] },
    { code: 'empty', he: 'ריק', en: 'Empty', primaryAlbums: [] },
  ],
  albums: [
    // Album 1 is a cross-country album (Nepal + Thailand) primary=np
    { id: 1, name: 'a', primary: 'np', countries: ['np', 'th'],
      photos: [{ id: 'p1a', name: 'a.jpg' }, { id: 'p1b', name: 'b.jpg' }] },
    { id: 2, name: 'b', primary: 'np', countries: ['np'],
      photos: [{ id: 'p2a', name: 'a.jpg' }] },
    { id: 3, name: 'c', primary: 'np', countries: ['np'],
      photos: [{ id: 'p3a', name: 'a.jpg' }] },
    // Thailand primary albums
    { id: 19, name: 'th-1', primary: 'th', countries: ['th'],
      photos: [{ id: 'p19a', name: 'a.jpg' }] },
    { id: 77, name: 'th-2', primary: 'th', countries: ['th'],
      photos: [{ id: 'p77a', name: 'a.jpg' }] },
  ],
};

test('returns first photo of lowest-id primary album', () => {
  const out = pickCountryThumb(manifest, 'np');
  assert.equal(out.id, 'p1a');
});

test('Thailand uses album 19 (its lowest primary), not album 1 (Nepal primary)', () => {
  const out = pickCountryThumb(manifest, 'th');
  assert.equal(out.id, 'p19a');
});

test('country with no primary albums returns null', () => {
  assert.equal(pickCountryThumb(manifest, 'empty'), null);
});

test('unknown country returns null', () => {
  assert.equal(pickCountryThumb(manifest, 'xx'), null);
});

test('country whose primary album has no photos falls through to next primary album', () => {
  const m = {
    countries: [{ code: 'x', he: 'x', en: 'X', primaryAlbums: [5, 6] }],
    albums: [
      { id: 5, name: 'empty', primary: 'x', countries: ['x'], photos: [] },
      { id: 6, name: 'full',  primary: 'x', countries: ['x'],
        photos: [{ id: 'p6', name: 'a.jpg' }] },
    ],
  };
  const out = pickCountryThumb(m, 'x');
  assert.equal(out.id, 'p6');
});

test('country with all-empty primary albums returns null', () => {
  const m = {
    countries: [{ code: 'x', he: 'x', en: 'X', primaryAlbums: [5] }],
    albums: [
      { id: 5, name: 'empty', primary: 'x', countries: ['x'], photos: [] },
    ],
  };
  assert.equal(pickCountryThumb(m, 'x'), null);
});

test('does not mutate manifest', () => {
  const snapshot = JSON.stringify(manifest);
  pickCountryThumb(manifest, 'np');
  assert.equal(JSON.stringify(manifest), snapshot);
});
