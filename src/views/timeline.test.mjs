import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderTimeline, dayStripHTML } from './timeline.js';

// The bucket's `album` is the full manifest album (incl. photos), as buildTimeline
// produces — so the timeline thumb can resolve a photo's slide index (M53 / #1).
const npAlbum = {
  id: 2, primary: 'np', slug: 'nagarkot-bhaktapur', name: 'נגארקוט', title: 'נגארקוט',
  photos: [
    { id: 'p1', name: 'p1.jpg', capturedAt: '2011-03-15T08:00:00' },
    { id: 'p2', name: 'p2.jpg', capturedAt: '2011-03-16T09:00:00' },
  ],
};
const manifest = { albums: [{ ...npAlbum, countries: ['np'] }] };
const timeline = [
  { key: '2011-03-15', label: '15 במרץ 2011', photos: [
    { photo: npAlbum.photos[0], album: npAlbum } ]},
  { key: '2011-03-16', label: '16 במרץ 2011', photos: [
    { photo: npAlbum.photos[1], album: npAlbum } ]},
];

// ── Loading / error / empty states (R3) ──────────────────────────
test('renderTimeline: loading state when manifest null', () => {
  assert.match(renderTimeline({ manifest: null, timeline: null }), /role="status"/);
});

test('renderTimeline: error state', () => {
  assert.match(renderTimeline({ manifest: null, error: new Error('net'), timeline: null }), /role="alert"/);
});

test('renderTimeline: empty timeline shows no-photos message', () => {
  assert.match(renderTimeline({ manifest, timeline: [] }), /אין תמונות/);
});

// ── Loaded shell ─────────────────────────────────────────────────
test('renderTimeline: renders tl-page container', () => {
  assert.match(renderTimeline({ manifest, timeline, dpr: 1 }), /class="tl-page"/);
});

test('renderTimeline: renders back link', () => {
  assert.match(renderTimeline({ manifest, timeline, dpr: 1 }), /href="\/"/);
});

test('renderTimeline: slider comes BEFORE the header so it stays pinned at top (#1a)', () => {
  const html = renderTimeline({ manifest, timeline, dpr: 1 });
  const sliderAt = html.indexOf('tl-slider-wrap');
  const headerAt = html.indexOf('tl-header');
  assert.ok(sliderAt !== -1 && headerAt !== -1, 'both slider and header present');
  assert.ok(sliderAt < headerAt, 'slider-wrap must render before the header');
});

test('renderTimeline: renders every day heading (no pagination)', () => {
  const html = renderTimeline({ manifest, timeline, dpr: 1 });
  assert.match(html, /15 במרץ 2011/);
  assert.match(html, /16 במרץ 2011/);
});

// ── Lazy shells (M25) ────────────────────────────────────────────
test('renderTimeline: renders ALL buckets as shells (no PAGE_SIZE cap)', () => {
  const big = Array.from({ length: 25 }, (_, i) => ({
    key: `2011-01-${String(i + 1).padStart(2, '0')}`,
    label: `${i + 1} בינואר 2011`,
    photos: [{ photo: { id: `p${i}` }, album: { id: 2, primary: 'np', slug: 'nagarkot-bhaktapur', name: 'x', title: 'x' } }],
  }));
  const html = renderTimeline({ manifest, timeline: big, dpr: 1 });
  const days = html.match(/class="tl-day"/g) || [];
  assert.equal(days.length, 25);
});

test('renderTimeline: shells carry data-bucket-index', () => {
  const html = renderTimeline({ manifest, timeline, dpr: 1 });
  assert.match(html, /data-bucket-index="0"/);
  assert.match(html, /data-bucket-index="1"/);
});

test('renderTimeline: photo strips start EMPTY (hydrated lazily)', () => {
  const html = renderTimeline({ manifest, timeline, dpr: 1 });
  assert.match(html, /<div class="tl-photo-strip" data-bucket-index="0"><\/div>/);
  assert.doesNotMatch(html, /tl-thumb/);
});

test('renderTimeline: no load-more button (pagination removed)', () => {
  assert.doesNotMatch(renderTimeline({ manifest, timeline, dpr: 1 }), /data-tl-more/);
});

// ── Slider (M22) ─────────────────────────────────────────────────
test('renderTimeline: renders the range slider input', () => {
  const html = renderTimeline({ manifest, timeline, dpr: 1 });
  assert.match(html, /id="tl-slider"/);
  assert.match(html, /type="range"/);
});

test('renderTimeline: slider max equals timeline.length - 1', () => {
  assert.match(renderTimeline({ manifest, timeline, dpr: 1 }), /max="1"/);
});

test('renderTimeline: slider label shows first day label', () => {
  const html = renderTimeline({ manifest, timeline, dpr: 1 });
  assert.match(html, /id="tl-slider-label"/);
  assert.match(html, /15 במרץ 2011/);
});

// ── M8: textured scrubber ────────────────────────────────────────
const segs = [
  { country: 'np', color: '#4f7a8c', weight: 5 },
  { country: 'in', color: '#d6a13f', weight: 6 },
];

test('M8: renders a .tl-scrubber[data-orient] with one .tl-seg per segment', () => {
  const html = renderTimeline({ manifest, timeline, segments: segs, dpr: 1 });
  assert.match(html, /class="tl-scrubber"[^>]*data-orient/);
  assert.equal((html.match(/class="tl-seg"/g) || []).length, 2);
});

test('M8: each segment carries its colour + motif fill, sized by weight', () => {
  const html = renderTimeline({ manifest, timeline, segments: segs, dpr: 1 });
  assert.match(html, /background:#4f7a8c/);
  assert.match(html, /flex-grow:5/);
  assert.match(html, /url\(#motif-np\)/);
});

test('M8: motif defs are inlined exactly once', () => {
  const html = renderTimeline({ manifest, timeline, segments: segs, dpr: 1 });
  assert.equal((html.match(/<pattern id="motif-np"/g) || []).length, 1);
});

test('M8: header shows ציר זמן + the inline day-count subtitle', () => {
  const html = renderTimeline({ manifest, timeline, segments: segs, dpr: 1 });
  assert.match(html, /ציר זמן/);
  assert.match(html, /ימים · שנה אחת/);
});

test('M8: renders a tooltip element (populated on hold)', () => {
  const html = renderTimeline({ manifest, timeline, segments: segs, dpr: 1 });
  assert.match(html, /class="tl-tip"/);
});

test('M8: no scrubber when there are no segments (feed still renders)', () => {
  const html = renderTimeline({ manifest, timeline, segments: [], dpr: 1 });
  assert.doesNotMatch(html, /class="tl-scrubber"/);
  assert.match(html, /tl-feed/);
});

// ── dayStripHTML (hydration payload) ─────────────────────────────
test('dayStripHTML: renders photo thumbnails via /img/ proxy', () => {
  assert.match(dayStripHTML(timeline[0], 1), /src="\/img\/p1\//);
});

test('dayStripHTML: thumbnails have onerror fallback (R4)', () => {
  assert.match(dayStripHTML(timeline[0], 1), /onerror=/);
});

test('dayStripHTML: photo links to its EXACT slide, not the album top (#1)', () => {
  // p1 is slide 0, p2 is slide 1 in the album's date order.
  assert.match(dayStripHTML(timeline[0], 1), /href="\/nepal\/nagarkot-bhaktapur\/0"/);
  assert.match(dayStripHTML(timeline[1], 1), /href="\/nepal\/nagarkot-bhaktapur\/1"/);
});

test('dayStripHTML: shows the album tag', () => {
  assert.match(dayStripHTML(timeline[0], 1), /tl-album-tag/);
});
