import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderTimeline, dayStripHTML } from './timeline.js';

const manifest = { albums: [{ id: 2, primary: 'np', countries: ['np'], name: 'נגארקוט', title: 'נגארקוט', photos: [] }] };
const timeline = [
  { key: '2011-03-15', label: '15 במרץ 2011', photos: [
    { photo: { id: 'p1', capturedAt: '2011-03-15T08:00:00' },
      album: { id: 2, primary: 'np', slug: 'nagarkot-bhaktapur', name: 'נגארקוט', title: 'נגארקוט' } },
  ]},
  { key: '2011-03-16', label: '16 במרץ 2011', photos: [
    { photo: { id: 'p2', capturedAt: '2011-03-16T09:00:00' },
      album: { id: 2, primary: 'np', slug: 'nagarkot-bhaktapur', name: 'נגארקוט', title: 'נגארקוט' } },
  ]},
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

// ── dayStripHTML (hydration payload) ─────────────────────────────
test('dayStripHTML: renders photo thumbnails via /img/ proxy', () => {
  assert.match(dayStripHTML(timeline[0], 1), /src="\/img\/p1\//);
});

test('dayStripHTML: thumbnails have onerror fallback (R4)', () => {
  assert.match(dayStripHTML(timeline[0], 1), /onerror=/);
});

test('dayStripHTML: photos link to their album slug', () => {
  assert.match(dayStripHTML(timeline[0], 1), /href="\/nepal\/nagarkot-bhaktapur"/);
});

test('dayStripHTML: shows the album tag', () => {
  assert.match(dayStripHTML(timeline[0], 1), /tl-album-tag/);
});
