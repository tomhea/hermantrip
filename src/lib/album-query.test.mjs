import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumsForCountry, albumById, albumBySlug } from './album-query.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [2, 3] },
    { code: 'th', he: 'תאילנד', en: 'Thailand', primaryAlbums: [19] },
  ],
  // slugs match the real canonical slugs in album-slugs.js (albumBySlug uses
  // the real aliasesForAlbum keyed by album id).
  albums: [
    { id: 3, name: 'c', slug: 'poon-hill-trek', primary: 'np', countries: ['np'], photos: [{ id: 'p3' }] },
    { id: 2, name: 'b', slug: 'nagarkot-bhaktapur', primary: 'np', countries: ['np'], photos: [{ id: 'p2' }] },
    // album 1 is cross-country (np + th)
    { id: 1, name: 'a', slug: 'bangkok-kathmandu', primary: 'np', countries: ['np', 'th'], photos: [{ id: 'p1' }] },
    { id: 19, name: 'th', slug: 'bangkok', primary: 'th', countries: ['th'], photos: [{ id: 'p19' }] },
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

// ── albumBySlug (M23) ────────────────────────────────────────────
test('albumBySlug: canonical slug under its primary country → {album, isAlias:false}', () => {
  const r = albumBySlug(manifest, 'np', 'nagarkot-bhaktapur');
  assert.equal(r.album.id, 2);
  assert.equal(r.isAlias, false);
});

test('albumBySlug: an alias resolves to the album and flags isAlias:true', () => {
  // album 2 alias "nagarkot" → canonical nagarkot-bhaktapur
  const r = albumBySlug(manifest, 'np', 'nagarkot');
  assert.equal(r.album.id, 2);
  assert.equal(r.isAlias, true);
});

test('albumBySlug: only matches under the album primary country', () => {
  // album 1 is np-primary; its slug is NOT reachable under thailand
  assert.equal(albumBySlug(manifest, 'th', 'bangkok-kathmandu'), null);
});

test('albumBySlug: unknown slug → null (numeric / bad slug → 404 path)', () => {
  assert.equal(albumBySlug(manifest, 'np', '2'), null);
  assert.equal(albumBySlug(manifest, 'np', 'atlantis'), null);
});

test('albumBySlug: null-guards (missing manifest / code / slug) → null', () => {
  assert.equal(albumBySlug(null, 'np', 'bangkok'), null);
  assert.equal(albumBySlug(manifest, null, 'bangkok'), null);
  assert.equal(albumBySlug(manifest, 'np', null), null);
});
