import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderTimeline, PAGE_SIZE } from './timeline.js';

const manifest = { albums: [{ id: 2, primary: 'np', countries: ['np'], name: 'נגארקוט', title: 'נגארקוט', photos: [] }] };
const timeline = [
  { key: '2011-03-15', label: '15 במרץ 2011', photos: [
    { photo: { id: 'p1', capturedAt: '2011-03-15T08:00:00' },
      album: { id: 2, primary: 'np', name: 'נגארקוט', title: 'נגארקוט' } },
  ]},
  { key: '2011-03-16', label: '16 במרץ 2011', photos: [
    { photo: { id: 'p2', capturedAt: '2011-03-16T09:00:00' },
      album: { id: 2, primary: 'np', name: 'נגארקוט', title: 'נגארקוט' } },
  ]},
];

// Loading / error states (R3)
test('renderTimeline: loading state when manifest null', () => {
  assert.match(renderTimeline({ manifest: null, timeline: null }), /role="status"/);
});

test('renderTimeline: error state', () => {
  assert.match(renderTimeline({ manifest: null, error: new Error('net'), timeline: null }), /role="alert"/);
});

test('renderTimeline: empty timeline shows no-photos message', () => {
  const html = renderTimeline({ manifest, timeline: [] });
  assert.match(html, /אין תמונות/);
});

// Loaded state
test('renderTimeline: renders tl-page container', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /class="tl-page"/);
});

test('renderTimeline: renders back link', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /href="\/"/);
});

test('renderTimeline: renders day headings', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /15 במרץ 2011/);
  assert.match(html, /16 במרץ 2011/);
});

test('renderTimeline: renders photo thumbnails via /img/ proxy', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /src="\/img\/p1\//);
});

test('renderTimeline: thumbnails have onerror fallback (R4)', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /onerror=/);
});

// ── Slider (M22) ─────────────────────────────────────────────────
test('renderTimeline: renders the range slider input', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /id="tl-slider"/);
  assert.match(html, /type="range"/);
});

test('renderTimeline: slider max equals timeline.length - 1', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /max="1"/); // timeline has 2 entries → max=1
});

test('renderTimeline: slider label shows first day label', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /id="tl-slider-label"/);
  assert.match(html, /15 במרץ 2011/); // first bucket label
});

test('renderTimeline: photos link to their album', () => {
  const html = renderTimeline({ manifest, timeline, page: 1, dpr: 1 });
  assert.match(html, /href="\/nepal\/2"/);
});

test('renderTimeline: PAGE_SIZE is exported', () => {
  assert.ok(typeof PAGE_SIZE === 'number' && PAGE_SIZE > 0);
});

// Load-more pagination
const bigTimeline = Array.from({ length: 25 }, (_, i) => ({
  key: `2011-01-${String(i + 1).padStart(2, '0')}`,
  label: `${i + 1} בינואר 2011`,
  photos: [{ photo: { id: `p${i}`, capturedAt: `2011-01-${String(i + 1).padStart(2, '0')}T00:00:00` },
              album: { id: 2, primary: 'np', name: 'נגארקוט', title: 'נגארקוט' } }],
}));

test('renderTimeline: page 1 shows only PAGE_SIZE buckets', () => {
  const html = renderTimeline({ manifest, timeline: bigTimeline, page: 1, dpr: 1 });
  const days = html.match(/class="tl-day"/g) || [];
  assert.equal(days.length, PAGE_SIZE);
});

test('renderTimeline: shows load-more button when more remain', () => {
  const html = renderTimeline({ manifest, timeline: bigTimeline, page: 1, dpr: 1 });
  assert.match(html, /data-tl-more/);
});

test('renderTimeline: page 3 shows all 25 buckets (no load-more)', () => {
  const html = renderTimeline({ manifest, timeline: bigTimeline, page: 3, dpr: 1 });
  const days = html.match(/class="tl-day"/g) || [];
  assert.equal(days.length, 25);
  assert.doesNotMatch(html, /data-tl-more/);
});
