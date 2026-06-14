import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderRandomShow } from './random-slideshow.js';

const manifest = { countries: [], albums: [] };
const item = {
  photo: { id: 'p1', name: 'a.jpg', capturedAt: '2011-07-23T14:32:00' },
  album: { id: 3, name: '03. נפאל - טרק', title: 'טרק פון היל', slug: 'poon-hill-trek', primary: 'np', countries: ['np'] },
};

test('renders the photo via slide intent', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all', viewport: 'phone' });
  assert.match(html, /src="\/img\/p1\/\d+"/);
});

test('carries data-random scope + data-exit; no data-next/prev hrefs', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all', exitHref: '/' });
  assert.match(html, /data-random="all"/);
  assert.match(html, /data-exit="\/"/);
});

test('prev/next zones are buttons with data-nav (JS-driven, not links)', () => {
  const html = renderRandomShow({ manifest, item, scope: 'np' });
  assert.match(html, /<button[^>]*data-nav="next"/);
  assert.match(html, /<button[^>]*data-nav="prev"/);
});

test('M31: transition toggle + shell class are present (random slideshow too)', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all', transition: 'slide' });
  assert.match(html, /data-transition-toggle/);
  assert.match(html, /class="slideshow-shell tr-slide"/);
  assert.match(html, /החלקה/); // Hebrew label for slide
});

test('info panel shows the source album, country, date', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all' });
  assert.match(html, /טרק פון היל/);  // album title
  assert.match(html, /נפאל/);          // country
  assert.match(html, /23 ביולי 2011/); // date
});

test('bar links to the source album (visible pill button)', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all' });
  assert.match(html, /class="slideshow-place-btn slideshow-title" href="\/nepal\/poon-hill-trek"/);
});

test('slideshow-ux-2 #6: "random all" shows a country pill BEFORE the album pill', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all' });
  assert.match(html, /class="slideshow-place-btn slideshow-country" href="\/nepal"/);
  assert.match(html, /נפאל/); // country he-name
  // country button comes before the album button in source order
  assert.ok(html.indexOf('slideshow-country') < html.indexOf('slideshow-title'));
});

test('slideshow-ux-2 #6: within-country random shows NO country pill (only album)', () => {
  const html = renderRandomShow({ manifest, item, scope: 'np' });
  assert.equal(/slideshow-country/.test(html), false);
  assert.match(html, /class="slideshow-place-btn slideshow-title"/);
});

test('slideshow-ux-2 #5/#6: emits data-next-img / data-prev-img when given', () => {
  const html = renderRandomShow({
    manifest, item, scope: 'all', nextImg: '/img/pN/520', prevImg: '/img/pP/520',
  });
  assert.match(html, /data-next-img="\/img\/pN\/520"/);
  assert.match(html, /data-prev-img="\/img\/pP\/520"/);
});

test('download link → original', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all' });
  assert.match(html, /class="slideshow-dl" href="\/img\/p1\/orig"/);
});

test('autoplay + speed reflected', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all', autoplay: true, speed: 7000 });
  assert.match(html, /data-autoplay-on="true"/);
  assert.match(html, /data-speed="7000"/);
  assert.match(html, /7ש/);
});

test('loading state when manifest null', () => {
  assert.match(renderRandomShow({ manifest: null, scope: 'all' }), /role="status"/);
});

test('error state', () => {
  assert.match(renderRandomShow({ manifest: null, error: new Error('x'), scope: 'all' }), /role="alert"/);
});

test('empty pool → message + back link', () => {
  const html = renderRandomShow({ manifest, item: null, scope: 'np', exitHref: '/nepal' });
  assert.match(html, /אין תמונות/);
  assert.match(html, /href="\/nepal"/);
});

test('M43: random info panel drops the album row and adds a "גודל" size row (#6)', () => {
  const html = renderRandomShow({ manifest, item, scope: 'all' });
  assert.equal(/<dt>אלבום<\/dt>/.test(html), false);
  assert.match(html, /<dt>גודל<\/dt>\s*<dd class="info-size" dir="ltr" data-size-id="p1">…<\/dd>/);
});
