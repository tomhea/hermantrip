import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderSlideshow } from './slideshow.js';

function photos(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${String(i).padStart(3, '0')}`,
    name: `IMG_${String(i).padStart(4, '0')}.jpg`,
  }));
}

const manifest = {
  countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
  albums: [
    { id: 1, name: '01. נפאל - קטמנדו', primary: 'np', countries: ['np'], photos: photos(5) },
    { id: 2, name: '02. ריק', primary: 'np', countries: ['np'], photos: [] },
  ],
};

test('renders the photo at the given index via slide intent', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', viewport: 'phone' });
  assert.match(html, /lh3\.googleusercontent\.com\/d\/p002=w520/);
});

test('desktop viewport requests the larger slide width', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '0', viewport: 'desktop' });
  assert.match(html, /=w920/);
});

test('shows a 1-based position counter (idx 2 of 5 → "3 / 5")', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /3\s*\/\s*5/);
});

test('next link wraps last → first', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '4' });
  assert.match(html, /href="#\/album\/1\/slide\/0"/);
});

test('prev link wraps first → last', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '0' });
  assert.match(html, /href="#\/album\/1\/slide\/4"/);
});

test('middle index links to both neighbours', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /href="#\/album\/1\/slide\/3"/); // next
  assert.match(html, /href="#\/album\/1\/slide\/1"/); // prev
});

test('exit/close link returns to the album grid', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /href="#\/album\/1"/);
});

test('out-of-range index is clamped (idx 99 → shows last photo p004)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '99' });
  assert.match(html, /d\/p004=w/);
});

test('negative index clamps to first', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '-3' });
  assert.match(html, /d\/p000=w/);
});

test('loading state when manifest null', () => {
  const html = renderSlideshow({ manifest: null, id: '1', idx: '0' });
  assert.match(html, /role="status"/);
});

test('fetch-failed state renders errorHTML', () => {
  const html = renderSlideshow({ manifest: null, error: new Error('x'), id: '1', idx: '0' });
  assert.match(html, /role="alert"/);
});

test('unknown album → not-found + home link', () => {
  const html = renderSlideshow({ manifest, id: '999', idx: '0' });
  assert.match(html, /לא נמצא/);
  assert.match(html, /href="#\/"/);
});

test('empty album → message + back link, no crash', () => {
  const html = renderSlideshow({ manifest, id: '2', idx: '0' });
  assert.match(html, /אין תמונות/);
  assert.match(html, /href="#\/album\/2"/);
});

test('carries data-slideshow hooks for keyboard/swipe wiring', () => {
  // main.js looks for these to attach listeners
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /data-slideshow/);
  assert.match(html, /data-next="#\/album\/1\/slide\/3"/);
  assert.match(html, /data-prev="#\/album\/1\/slide\/1"/);
  assert.match(html, /data-exit="#\/album\/1"/);
});
