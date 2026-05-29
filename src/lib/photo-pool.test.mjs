import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { allPhotos, countryPhotos } from './photo-pool.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', primaryAlbums: [1, 2] },
    { code: 'th', he: 'תאילנד', primaryAlbums: [1, 19] },
  ],
  albums: [
    { id: 1, name: 'a', primary: 'np', countries: ['np', 'th'], photos: [{ id: 'p1' }, { id: 'p2' }] },
    { id: 2, name: 'b', primary: 'np', countries: ['np'], photos: [{ id: 'p3' }] },
    { id: 19, name: 'c', primary: 'th', countries: ['th'], photos: [{ id: 'p4' }, { id: 'p5' }] },
  ],
};

test('allPhotos: every photo, tagged with its album', () => {
  const out = allPhotos(manifest);
  assert.equal(out.length, 5);
  assert.deepEqual(out.map((x) => x.photo.id).sort(), ['p1', 'p2', 'p3', 'p4', 'p5']);
  const e = out.find((x) => x.photo.id === 'p4');
  assert.equal(e.album.id, 19);
});

test('allPhotos: a cross-country album is counted once (no dupes)', () => {
  const out = allPhotos(manifest);
  const p1count = out.filter((x) => x.photo.id === 'p1').length;
  assert.equal(p1count, 1);
});

test('countryPhotos(np): albums 1 + 2 → p1,p2,p3', () => {
  const out = countryPhotos(manifest, 'np');
  assert.deepEqual(out.map((x) => x.photo.id).sort(), ['p1', 'p2', 'p3']);
});

test('countryPhotos(th): cross-country album 1 included → p1,p2,p4,p5', () => {
  const out = countryPhotos(manifest, 'th');
  assert.deepEqual(out.map((x) => x.photo.id).sort(), ['p1', 'p2', 'p4', 'p5']);
});

test('countryPhotos: unknown country → empty', () => {
  assert.deepEqual(countryPhotos(manifest, 'zz'), []);
});

test('each entry carries the album for context (title/country)', () => {
  const out = countryPhotos(manifest, 'np');
  assert.ok(out.every((x) => x.album && Array.isArray(x.album.countries)));
});

test('empty manifest → empty', () => {
  assert.deepEqual(allPhotos({ albums: [] }), []);
  assert.deepEqual(allPhotos({}), []);
});
