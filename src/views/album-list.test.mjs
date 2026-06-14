import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderAlbumList } from './album-list.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1, 2] },
  ],
  albums: [
    { id: 1, name: '01. נפאל - קטמנדו', slug: 'bangkok-kathmandu', primary: 'np', countries: ['np', 'th'],
      photos: [{ id: 'p1', name: 'a.jpg' }] },
    { id: 2, name: '02. נפאל - פוקרה', slug: 'nagarkot-bhaktapur', primary: 'np', countries: ['np'],
      photos: [{ id: 'p2a', name: 'a.jpg' }, { id: 'p2b', name: 'b.jpg' }] },
  ],
};

test('happy path: renders country name as title', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /נפאל/);
});

test('first album in order is a wide featured tile', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.match(html, /class="album-tile album-tile-featured"/);
});

test('albums use overlaid labels (name + count·dates on the photo)', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.match(html, /class="album-tile-name"/);
  assert.match(html, /class="album-tile-sub"/);
  assert.match(html, /01\. נפאל - קטמנדו/);
  assert.match(html, /02\. נפאל - פוקרה/);
});

test('order is preserved (not re-sorted by size)', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.ok(html.indexOf('bangkok-kathmandu') < html.indexOf('nagarkot-bhaktapur'));
});

test('header has back-to-home + country random + theme toggle', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.match(html, /class="slim-back"/);
  assert.match(html, /data-random-play/);
  assert.match(html, /data-theme-toggle/);
});

test('subtitle shows album + photo counts', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /2 אלבומים/);
  assert.match(html, /3 תמונות/); // 1 + 2 photos total
});

test('tiles link to each album page in order', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /href="\/nepal\/bangkok-kathmandu"/);
  assert.match(html, /href="\/nepal\/nagarkot-bhaktapur"/);
});

test('happy path: each album tile uses its first photo via the same-origin /img/ proxy', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /src="\/img\/p1\/\d+"/);
  assert.equal(/googleusercontent|drive\.google/.test(html), false);
});

test('happy path: includes a back link to home (slim-back → "/")', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /class="slim-back"[^>]*href="\/"/);
});

test('loading state when manifest is null', () => {
  const html = renderAlbumList({ manifest: null, code: 'np' });
  assert.match(html, /role="status"/);
  assert.match(html, /טוען/);
});

test('fetch-failed state renders errorHTML', () => {
  const html = renderAlbumList({ manifest: null, error: new Error('x'), code: 'np' });
  assert.match(html, /role="alert"/);
});

test('unknown country shows a not-found message + back link', () => {
  const html = renderAlbumList({ manifest, code: 'zz' });
  assert.match(html, /לא נמצאה/);
  assert.match(html, /href="\/"/);
});

test('empty country shows an empty message', () => {
  const m = {
    countries: [{ code: 'x', he: 'X', en: 'X', primaryAlbums: [] }],
    albums: [],
  };
  const html = renderAlbumList({ manifest: m, code: 'x' });
  assert.match(html, /אין אלבומים/);
});

test('escapes album names to prevent XSS', () => {
  const m = {
    countries: [{ code: 'x', he: 'X', en: 'X', primaryAlbums: [1] }],
    albums: [{ id: 1, name: '<script>alert(1)</script>', slug: 'e', primary: 'x', countries: ['x'], photos: [] }],
  };
  const html = renderAlbumList({ manifest: m, code: 'x' });
  assert.equal(html.includes('<script>alert(1)</script>'), false);
});
