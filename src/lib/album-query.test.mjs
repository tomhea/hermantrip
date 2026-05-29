import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumsForCountry, albumById } from './album-query.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [2, 3] },
    { code: 'th', he: 'תאילנד', en: 'Thailand', primaryAlbums: [19] },
  ],
  albums: [
    { id: 3, name: 'c', primary: 'np', countries: ['np'], photos: [{ id: 'p3' }] },
    { id: 2, name: 'b', primary: 'np', countries: ['np'], photos: [{ id: 'p2' }] },
    // album 1 is cross-country (np + th)
    { id: 1, name: 'a', primary: 'np', countries: ['np', 'th'], photos: [{ id: 'p1' }] },
    { id: 19, name: 'th', primary: 'th', countries: ['th'], photos: [{ id: 'p19' }] },
  ],
};

test('albumsForCountry returns albums where code is in countries[], sorted by id', () => {
  const out = albumsForCountry(manifest, 'np');
  assert.deepEqual(out.map((a) => a.id), [1, 2, 3]);
});

test('albumsForCountry includes cross-country albums', () => {
  // Album 1 (np+th) appears under BOTH countries
  const np = albumsForCountry(manifest, 'np').map((a) => a.id);
  const th = albumsForCountry(manifest, 'th').map((a) => a.id);
  assert.ok(np.includes(1));
  assert.ok(th.includes(1));
});

test('albumsForCountry for thailand returns [1, 19] sorted', () => {
  assert.deepEqual(albumsForCountry(manifest, 'th').map((a) => a.id), [1, 19]);
});

test('albumsForCountry unknown country returns empty array', () => {
  assert.deepEqual(albumsForCountry(manifest, 'xx'), []);
});

test('albumsForCountry does not mutate manifest.albums order', () => {
  const before = manifest.albums.map((a) => a.id);
  albumsForCountry(manifest, 'np');
  assert.deepEqual(manifest.albums.map((a) => a.id), before);
});

test('albumById returns the matching album', () => {
  assert.equal(albumById(manifest, 19).name, 'th');
});

test('albumById accepts string id (router params are strings)', () => {
  assert.equal(albumById(manifest, '19').name, 'th');
});

test('albumById unknown id returns null', () => {
  assert.equal(albumById(manifest, 999), null);
});

test('albumById non-numeric string returns null', () => {
  assert.equal(albumById(manifest, 'abc'), null);
});
