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
    { id: 3, name: '03. פוקרה', slug: 'pokhara-rafting', primary: 'np', countries: ['np'], photos: photos(3) },
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

test('M32: loop button present, defaults to repeat (not pressed)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /data-loop-toggle/);
  assert.match(html, /class="slideshow-loop-btn"[^>]*aria-pressed="false"/);
});

test('M32: continue mode at the LAST photo links next → next album slide 0', () => {
  // album 1 (5 photos) is last at idx 4; np order [1,2] → next album id 2 = chitwan
  const html = renderSlideshow({ manifest, id: '1', idx: '4', loopMode: 'continue' });
  assert.match(html, /data-next="\/nepal\/chitwan\/0"/);
  assert.match(html, /aria-pressed="true"/); // loop button reflects continue
});

test('M32: continue mode mid-album still advances within the album', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2', loopMode: 'continue' });
  assert.match(html, /data-next="\/nepal\/bangkok-kathmandu\/3"/);
});

test('M32: repeat mode (default) wraps last → first within the album', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '4', loopMode: 'repeat' });
  assert.match(html, /data-next="\/nepal\/bangkok-kathmandu\/0"/);
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

test('M43: position counter is .info-count (right-aligned) and album row is gone (#5/#6)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /<dd class="info-count" dir="ltr">3 \/ 5<\/dd>/);
  // the "אלבום" info row label must be removed
  assert.equal(/<dt>אלבום<\/dt>/.test(html), false);
});

test('M43: info panel has a bottom "גודל" size row with data-size-id (#6)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /<dt>גודל<\/dt>\s*<dd class="info-size" dir="ltr" data-size-id="p002">…<\/dd>/);
  // it is the LAST info row (lowest line)
  const sizeAt = html.indexOf('<dt>גודל</dt>');
  const fileAt = html.indexOf('<dt>קובץ</dt>');
  assert.ok(fileAt !== -1 && sizeAt > fileAt, 'size row comes after the file row (bottom)');
});

test('M44: loop button has a title tooltip + glyph wrapped for mirroring (#7)', () => {
  const repeat = renderSlideshow({ manifest, id: '1', idx: '2', loopMode: 'repeat' });
  assert.match(repeat, /title="חוזר על האלבום"/);
  assert.match(repeat, /<span class="loop-glyph">/);
  const cont = renderSlideshow({ manifest, id: '1', idx: '2', loopMode: 'continue' });
  assert.match(cont, /title="ממשיך לאלבום הבא"/);
});

// ── M5: single grouped control row + on-demand filmstrip ─────────────
test('M5: exactly ONE control row (.slideshow-bar)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  const count = (html.match(/class="slideshow-bar"/g) || []).length;
  assert.equal(count, 1);
});

test('M5: controls are organised into logical groups', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /class="slideshow-group/);
});

test('M5: prev/next nav buttons in the bar link to the neighbour slides', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /class="slideshow-nav-btn slideshow-nav-prev"[^>]*href="\/nepal\/bangkok-kathmandu\/1"/);
  assert.match(html, /class="slideshow-nav-btn slideshow-nav-next"[^>]*href="\/nepal\/bangkok-kathmandu\/3"/);
});

test('M5: filmstrip toggle button present', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /data-filmstrip-toggle/);
  assert.match(html, /aria-expanded="false"/); // collapsed by default
});

test('M5: a hidden filmstrip container is rendered (populated by main.js)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  assert.match(html, /class="slideshow-filmstrip"[^>]*\bhidden\b/);
  assert.match(html, /data-filmstrip\b/);
});

test('M5: the single bar still carries every existing control (no regression)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '2' });
  for (const hook of [
    'slideshow-close', 'data-autoplay-toggle', 'data-speed-toggle',
    'data-transition-toggle', 'data-loop-toggle', 'data-fullscreen-toggle',
    'slideshow-dl', 'slideshow-share', 'slideshow-info', 'slideshow-counter',
  ]) {
    assert.ok(html.includes(hook), `missing control: ${hook}`);
  }
});

// ── slideshow-ux #1: symmetric cross-album prev/next in continue mode ──
test('uxfix1: continue at FIRST photo links prev → previous album LAST photo (wraps to last album)', () => {
  // np order [1,2,3]; album 1 at idx 0, continue → prev wraps to album 3 (last),
  // landing on ITS last photo (3 photos → idx 2).
  const html = renderSlideshow({ manifest, id: '1', idx: '0', loopMode: 'continue' });
  assert.match(html, /data-prev="\/nepal\/pokhara-rafting\/2"/);
});

test('uxfix1: continue at LAST photo links next → next album FIRST photo (unchanged)', () => {
  const html = renderSlideshow({ manifest, id: '1', idx: '4', loopMode: 'continue' });
  assert.match(html, /data-next="\/nepal\/chitwan\/0"/);
});

test('uxfix1: back-and-forth across an album boundary is a deterministic round-trip', () => {
  const m = {
    countries: [{ code: 'np', he: 'נפאל', en: 'Nepal' }],
    albums: [
      { id: 1, name: 'A', slug: 'bangkok-kathmandu', primary: 'np', countries: ['np'], photos: photos(2) },
      { id: 2, name: 'B', slug: 'chitwan', primary: 'np', countries: ['np'], photos: photos(2) },
    ],
  };
  // B/0 --prev--> A/last(1)
  assert.match(renderSlideshow({ manifest: m, id: '2', idx: '0', loopMode: 'continue' }),
    /data-prev="\/nepal\/bangkok-kathmandu\/1"/);
  // A/last(1) --next--> B/0  (returns exactly where we came from)
  assert.match(renderSlideshow({ manifest: m, id: '1', idx: '1', loopMode: 'continue' }),
    /data-next="\/nepal\/chitwan\/0"/);
});

// ── slideshow-ux #5: emit neighbour image URLs for preload + autoplay load-gate ──
test('uxfix5: emits data-next-img / data-prev-img for the neighbour slides', () => {
  // idx 2 of 5 → next photo p003, prev photo p001 (slide intent, phone → /520)
  const html = renderSlideshow({ manifest, id: '1', idx: '2', viewport: 'phone' });
  assert.match(html, /data-next-img="\/img\/p003\/520"/);
  assert.match(html, /data-prev-img="\/img\/p001\/520"/);
});

test('uxfix5: continue at first photo preloads the previous album LAST photo', () => {
  // album 1 at idx 0, continue → prev wraps to album 3 (pokhara, 3 photos) last = p002
  const html = renderSlideshow({ manifest, id: '1', idx: '0', loopMode: 'continue', viewport: 'phone' });
  assert.match(html, /data-prev-img="\/img\/p002\/520"/);
});

test('uxfix1: repeat mode (default) still wraps prev/next WITHIN the album', () => {
  const atFirst = renderSlideshow({ manifest, id: '1', idx: '0', loopMode: 'repeat' });
  assert.match(atFirst, /data-prev="\/nepal\/bangkok-kathmandu\/4"/); // same album last
  const atLast = renderSlideshow({ manifest, id: '1', idx: '4', loopMode: 'repeat' });
  assert.match(atLast, /data-next="\/nepal\/bangkok-kathmandu\/0"/); // same album first
});
