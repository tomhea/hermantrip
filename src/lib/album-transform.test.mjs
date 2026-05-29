import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { transformManifest } from './album-transform.js';

function mf() {
  return {
    countries: [
      { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1, 2, 3, 4, 5] },
      { code: 'in', he: 'הודו', en: 'India', primaryAlbums: [14] },
      { code: 'th', he: 'תאילנד', en: 'Thailand', primaryAlbums: [19] },
    ],
    albums: [
      { id: 1, name: '01. ההתחלה - בנגקוק וקטמנדו', primary: 'np', countries: ['np'], photos: [{ id: 'a' }] },
      { id: 2, name: '02. נפאל - נגארקוט', primary: 'np', countries: ['np'], photos: [{ id: 'b' }] },
      { id: 3, name: '03. נפאל - טרק פון היל חלק 1', primary: 'np', countries: ['np'], photos: [{ id: 'c' }, { id: 'd' }] },
      { id: 4, name: '04. נפאל - טרק פון היל חלק 2', primary: 'np', countries: ['np'], photos: [{ id: 'e' }] },
      { id: 5, name: '05. נפאל - פוקארה ורפטינג', primary: 'np', countries: ['np'], photos: [{ id: 'f' }] },
      { id: 14, name: '14. הודו - באגסו 1', primary: 'in', countries: ['in'], photos: [{ id: 'g' }] },
      { id: 19, name: '19. בנגקוק1', primary: 'th', countries: ['th'], photos: [{ id: 'h' }] },
    ],
    counts: { albums: 7, photos: 8 },
  };
}

test('default title strips number + country prefix (albumPlace)', () => {
  const m = transformManifest(mf());
  assert.equal(m.albums.find((a) => a.id === 2).title, 'נגארקוט');
  assert.equal(m.albums.find((a) => a.id === 5).title, 'פוקארה ורפטינג');
  assert.equal(m.albums.find((a) => a.id === 1).title, 'בנגקוק וקטמנדו');
});

test('merge 3+4 → one album id 3, title "טרק פון היל", photos combined', () => {
  const m = transformManifest(mf());
  const merged = m.albums.find((a) => a.id === 3);
  assert.equal(merged.title, 'טרק פון היל');
  assert.equal(merged.photos.length, 3); // 2 + 1
  assert.equal(m.albums.find((a) => a.id === 4), undefined); // 4 absorbed
});

test('merged photos are in id order (3 then 4)', () => {
  const m = transformManifest(mf());
  const merged = m.albums.find((a) => a.id === 3);
  assert.deepEqual(merged.photos.map((p) => p.id), ['c', 'd', 'e']);
});

test('explicit renames: 14 → באגסו, 19 → בנגקוק', () => {
  const m = transformManifest(mf());
  assert.equal(m.albums.find((a) => a.id === 14).title, 'באגסו');
  assert.equal(m.albums.find((a) => a.id === 19).title, 'בנגקוק');
});

test('country primaryAlbums drop the absorbed id (4)', () => {
  const m = transformManifest(mf());
  const np = m.countries.find((c) => c.code === 'np');
  assert.deepEqual(np.primaryAlbums, [1, 2, 3, 5]);
});

test('counts.albums reflects the merge; no photos lost', () => {
  const m = transformManifest(mf());
  assert.equal(m.albums.length, 6); // 7 - 1 merged away
  assert.equal(m.counts.albums, 6);
  const totalPhotos = m.albums.reduce((s, a) => s + a.photos.length, 0);
  assert.equal(totalPhotos, 8); // unchanged
});

test('does not mutate the input manifest', () => {
  const input = mf();
  const snapshot = JSON.stringify(input);
  transformManifest(input);
  assert.equal(JSON.stringify(input), snapshot);
});

test('idempotent-ish: every album ends with a non-empty title', () => {
  const m = transformManifest(mf());
  assert.ok(m.albums.every((a) => typeof a.title === 'string' && a.title.length > 0));
});
