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
    { id: 1, name: '01. נפאל - קטמנדו', slug: 'bangkok-kathmandu', primary: 'np', countries: ['np'], photos: photos(5) },
    { id: 2, name: '02. ריק', slug: 'chitwan', primary: 'np', countries: ['np'], photos: [] },
  ],
};

test('renders the photo at the given index via slide intent (same-origin /img/)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', viewport: 'phone' });
  assert.match(html, /src="\/img\/p002\/520"/);
});

test('desktop viewport requests the larger slide width', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '0', viewport: 'desktop' });
  assert.match(html, /src="\/img\/p000\/920"/);
});

test('shows a 1-based position counter (idx 2 of 5 → "3 / 5")', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /3\s*\/\s*5/);
});

test('next link wraps last → first', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '4' });
  assert.match(html, /href="\/nepal\/bangkok-kathmandu\/0"/);
});

test('prev link wraps first → last', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '0' });
  assert.match(html, /href="\/nepal\/bangkok-kathmandu\/4"/);
});

test('middle index links to both neighbours', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /href="\/nepal\/bangkok-kathmandu\/3"/); // next
  assert.match(html, /href="\/nepal\/bangkok-kathmandu\/1"/); // prev
});

test('exit/close link returns to the album grid', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /href="\/nepal\/bangkok-kathmandu"/);
});

test('out-of-range index is clamped (idx 99 → shows last photo p004)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '99' });
  assert.match(html, /src="\/img\/p004\/\d+"/);
});

test('negative index clamps to first', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '-3' });
  assert.match(html, /src="\/img\/p000\/\d+"/);
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
  assert.match(html, /href="\/"/);
});

test('empty album → message + back link, no crash', () => {
  const html = renderSlideshow({ manifest, id: '2', idx: '0' });
  assert.match(html, /אין תמונות/);
  assert.match(html, /href="\/nepal\/chitwan"/);
});

test('carries data-slideshow hooks for keyboard/swipe wiring', () => {
  // main.js looks for these to attach listeners
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /data-slideshow/);
  assert.match(html, /data-next="\/nepal\/bangkok-kathmandu\/3"/);
  assert.match(html, /data-prev="\/nepal\/bangkok-kathmandu\/1"/);
  assert.match(html, /data-exit="\/nepal\/bangkok-kathmandu"/);
});

test('renders a play button (data-autoplay-toggle) when autoplay is off', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', autoplay: false });
  assert.match(html, /data-autoplay-toggle/);
  assert.match(html, /data-autoplay-on="false"/);
  assert.match(html, /aria-label="(הפעלת מצגת|הפעלה אוטומטית|הפעלה)"/);
});

test('shows pause affordance when autoplay is on', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', autoplay: true });
  assert.match(html, /data-autoplay-toggle/);
  assert.match(html, /data-autoplay-on="true"/);
  assert.match(html, /aria-label="(השהיית מצגת|השהיה)"/);
});

test('autoplay defaults to off when not specified', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /data-autoplay-on="false"/);
});

test('M9: speed button shows the current speed label + data-speed', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', speed: 7000 });
  assert.match(html, /data-speed-toggle/);
  assert.match(html, /data-speed="7000"/);
  assert.match(html, /7ש/); // label "7ש'" (apostrophe is HTML-escaped)
});

test('M9: fullscreen toggle button present', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /data-fullscreen-toggle/);
});

test('M9: download link points at the same-origin original + has download attr', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /class="slideshow-dl"[^>]*href="\/img\/p002\/orig"/);
  assert.match(html, /download="IMG_0002\.jpg"/);
});

test('M9: info panel shows Hebrew date, weekday, place, position', () => {
  const m = {
    countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
    albums: [{
      id: 1, name: '01. נפאל - קטמנדו', primary: 'np', countries: ['np'],
      photos: [{ id: 'pA', name: 'a.jpg', capturedAt: '2011-07-23T14:32:05' }],
    }],
  };
  const html = renderSlideshow({ manifest: m, id: '1', idx: '0' });
  assert.match(html, /<details class="slideshow-info"/);
  assert.match(html, /23 ביולי 2011/);
  assert.match(html, /יום שבת/);
  assert.match(html, /14:32/);
  assert.match(html, /נפאל/);     // country
  assert.match(html, /קטמנדו/);   // place
});

test('M31: transition button shows the current transition label + shell carries tr-<name>', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', transition: 'fade' });
  assert.match(html, /data-transition-toggle/);
  assert.match(html, /data-transition="fade"/);
  assert.match(html, /class="slideshow-shell tr-fade"/);
  assert.match(html, /עמעום/); // Hebrew label for fade
});

test('M31: a different transition stamps its own class + label (kenburns)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', transition: 'kenburns' });
  assert.match(html, /class="slideshow-shell tr-kenburns"/);
  assert.match(html, /תנועה/);
  // kenburns dwell var is wired from speed
  assert.match(html, /--kb-dwell:\d+ms/);
});

test('M31: transition defaults to fade when unspecified', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /tr-fade/);
});

test('M9: info panel tolerates a photo with no capturedAt (omits date rows)', () => {
  const m = {
    countries: [{ code: 'np', he: 'נפאל', en: 'Nepal', primaryAlbums: [1] }],
    albums: [{ id: 1, name: '01. נפאל - קטמנדו', primary: 'np', countries: ['np'],
      photos: [{ id: 'pA', name: 'a.jpg' /* no capturedAt */ }] }],
  };
  const html = renderSlideshow({ manifest: m, id: '1', idx: '0' });
  // still renders the panel + position, just no date row
  assert.match(html, /<details class="slideshow-info"/);
  assert.match(html, /1 \/ 1/);
});
