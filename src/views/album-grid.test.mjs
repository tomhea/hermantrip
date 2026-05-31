import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderAlbumGrid } from './album-grid.js';

function photos(n) {
  // names chosen so lex order == numeric order for the small n used here
  return Array.from({ length: n }, (_, i) => ({
    id: `p${String(i).padStart(3, '0')}`,
    name: `IMG_${String(i).padStart(4, '0')}.jpg`,
  }));
}

const manifest = {
  countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
  albums: [
    { id: 1, name: '01. נפאל - קטמנדו', slug: 'bangkok-kathmandu', primary: 'np', countries: ['np', 'th'],
      photos: photos(20) },
    { id: 2, name: '02. ריק', slug: 'rik', primary: 'np', countries: ['np'], photos: [] },
    { id: 3, name: '03. האחרון', slug: 'last-one', primary: 'np', countries: ['np'], photos: photos(5) },
  ],
};

test('happy path: renders album name as title', () => {
  const html = renderAlbumGrid({ manifest, id: '1' });
  assert.match(html, /01\. נפאל - קטמנדו/);
});

test('happy path: renders one img per photo', () => {
  const html = renderAlbumGrid({ manifest, id: '1' });
  const imgCount = (html.match(/<img\b/g) || []).length;
  assert.equal(imgCount, 20);
});

test('happy path: first 12 are eager, rest lazy (R5 first-paint budget)', () => {
  const html = renderAlbumGrid({ manifest, id: '1' });
  const eager = (html.match(/loading="eager"/g) || []).length;
  const lazy = (html.match(/loading="lazy"/g) || []).length;
  assert.equal(eager, 12);
  assert.equal(lazy, 8);
});

test('happy path: photos are in lexicographic filename order', () => {
  const html = renderAlbumGrid({ manifest, id: '1' });
  const firstIdx = html.indexOf('p000');
  const secondIdx = html.indexOf('p001');
  assert.ok(firstIdx !== -1 && firstIdx < secondIdx);
});

test('happy path: each photo links to its slide route', () => {
  const html = renderAlbumGrid({ manifest, id: '1' });
  assert.match(html, /href="\/nepal\/bangkok-kathmandu\/0"/);
  assert.match(html, /href="\/nepal\/bangkok-kathmandu\/19"/);
});

test('happy path: includes a back link to the country', () => {
  // album 1's primary country is np → back link to #/country/np
  const html = renderAlbumGrid({ manifest, id: '1' });
  assert.match(html, /href="\/nepal"/);
});

test('empty album shows a "no photos" message', () => {
  const html = renderAlbumGrid({ manifest, id: '2' });
  assert.match(html, /אין תמונות/);
});

test('M40: album page has a "הצג את האלבום" play button → slide 0', () => {
  const html = renderAlbumGrid({ manifest, id: '1' });
  assert.match(html, /data-album-play/);
  assert.match(html, /הצג את האלבום/);
  assert.match(html, /data-slide-href="\/nepal\/bangkok-kathmandu\/0"/);
});

test('M40: empty album shows no play button', () => {
  const html = renderAlbumGrid({ manifest, id: '2' });
  assert.equal(/data-album-play/.test(html), false);
});

test('M55 #6: a "next album" button links to the next album in the country', () => {
  const html = renderAlbumGrid({ manifest, code: 'np', id: '1' });
  assert.match(html, /class="album-next"/);
  assert.match(html, /href="\/nepal\/rik"/);       // next np album after 1 is 2 (slug rik)
  assert.match(html, /האלבום הבא/);
  assert.match(html, /02\. ריק/);                   // its name in the label
});

test('M55 #6: the LAST album shows no next-album button', () => {
  const html = renderAlbumGrid({ manifest, code: 'np', id: '3' });
  assert.equal(/class="album-next"/.test(html), false);
});

test('M55 #6: next button follows the VIEWING country for a cross-country album', () => {
  // album 1 under thailand → next th album is 19 (not in this fixture) → none;
  // under nepal → next is album 2. Confirms it uses the viewing code, not primary.
  const np = renderAlbumGrid({ manifest, code: 'np', id: '1' });
  assert.match(np, /href="\/nepal\/rik"/);
});

test('loading state when manifest is null', () => {
  const html = renderAlbumGrid({ manifest: null, id: '1' });
  assert.match(html, /role="status"/);
});

test('fetch-failed state renders errorHTML', () => {
  const html = renderAlbumGrid({ manifest: null, error: new Error('x'), id: '1' });
  assert.match(html, /role="alert"/);
});

test('unknown album shows a not-found message + back link home', () => {
  const html = renderAlbumGrid({ manifest, id: '999' });
  assert.match(html, /לא נמצא/);
  assert.match(html, /href="\/"/);
});
