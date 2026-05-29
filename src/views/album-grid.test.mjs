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
    { id: 1, name: '01. נפאל - קטמנדו', primary: 'np', countries: ['np', 'th'],
      photos: photos(20) },
    { id: 2, name: '02. ריק', primary: 'np', countries: ['np'], photos: [] },
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
  assert.match(html, /href="#\/album\/1\/slide\/0"/);
  assert.match(html, /href="#\/album\/1\/slide\/19"/);
});

test('happy path: includes a back link to the country', () => {
  // album 1's primary country is np → back link to #/country/np
  const html = renderAlbumGrid({ manifest, id: '1' });
  assert.match(html, /href="#\/country\/np"/);
});

test('empty album shows a "no photos" message', () => {
  const html = renderAlbumGrid({ manifest, id: '2' });
  assert.match(html, /אין תמונות/);
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
  assert.match(html, /href="#\/"/);
});
