import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderAlbumList } from './album-list.js';

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1, 2] },
  ],
  albums: [
    { id: 1, name: '01. נפאל - קטמנדו', slug: 'bangkok-kathmandu', primary: 'np', countries: ['np', 'th'],
      photos: [{ id: 'p1', name: 'a.jpg', thumbnailLink: 'https://lh3.googleusercontent.com/drive-storage/a=s220' }] },
    { id: 2, name: '02. נפאל - פוקרה', slug: 'nagarkot-bhaktapur', primary: 'np', countries: ['np'],
      photos: [{ id: 'p2a', name: 'a.jpg' }, { id: 'p2b', name: 'b.jpg' }] },
  ],
};

test('happy path: renders country name as title', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /נפאל/);
});

test('happy path: one card per album with album name + photo count', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /01\. נפאל - קטמנדו/);
  assert.match(html, /02\. נפאל - פוקרה/);
  assert.match(html, /href="\/nepal\/bangkok-kathmandu"/);
  assert.match(html, /href="\/nepal\/nagarkot-bhaktapur"/);
});

test('happy path: photo counts are shown', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /2 תמונות/); // album 2 has 2 photos
});

test('happy path: each album card uses its first photo via the same-origin /img/ proxy', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /src="\/img\/p1\/\d+"/);
  assert.equal(/googleusercontent|drive\.google/.test(html), false);
});

test('happy path: includes a back link to home', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /href="\/"/);
});

test('M34: each non-empty album card has a play button → first slide (data-slide-href)', () => {
  const html = renderAlbumList({ manifest, code: 'np' });
  assert.match(html, /data-album-play/);
  assert.match(html, /data-slide-href="\/nepal\/bangkok-kathmandu\/0"/);
  assert.match(html, /data-slide-href="\/nepal\/nagarkot-bhaktapur\/0"/);
});

test('M34: empty album shows no play button (nothing to play)', () => {
  const m = {
    countries: [{ code: 'x', he: 'X', en: 'X', primaryAlbums: [1] }],
    albums: [{ id: 1, name: 'ריק', slug: 'empty', primary: 'x', countries: ['x'], photos: [] }],
  };
  const html = renderAlbumList({ manifest: m, code: 'x' });
  assert.equal(/data-album-play/.test(html), false);
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

test('escapes album names to prevent XSS', () => {
  const m = {
    countries: [{ code: 'x', he: 'X', en: 'X', primaryAlbums: [1] }],
    albums: [{ id: 1, name: '<script>alert(1)</script>', primary: 'x', countries: ['x'], photos: [] }],
  };
  const html = renderAlbumList({ manifest: m, code: 'x' });
  assert.equal(html.includes('<script>alert(1)</script>'), false);
});
