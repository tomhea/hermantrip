// Guard for the M8 timeline scrubber's two responsive orientations + tooltip.
// This repo tests CSS by asserting on rule-block text.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');

function ruleBlock(selector) {
  const re = new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  return m ? m[2] : null;
}

test('M69.1: portrait — scrubber is a 22px vertical rail on its own reserved column', () => {
  const rail = ruleBlock('.tl-scrubber[data-orient="rail"]');
  assert.ok(rail, '.tl-scrubber[data-orient="rail"] rule missing');
  assert.match(rail, /width:\s*22px/);
  // the rail's track runs vertically
  const railTrack = ruleBlock('.tl-scrubber[data-orient="rail"] .tl-scrub-track');
  assert.ok(railTrack, 'rail track rule missing');
  assert.match(railTrack, /flex-direction:\s*column/);
  // the page reserves a column so the rail never overlaps the photos/dates/names
  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)\s*and\s*\(orientation:\s*portrait\)\s*\{[^@]*?\.tl-page\s*\{[^}]*padding-right:\s*28px/,
    'portrait .tl-page must reserve a right column for the rail',
  );
  // M69.3/.4: the rail floats with a gap from the screen top/bottom edges
  assert.match(rail, /top:\s*28px/);
  assert.match(rail, /bottom:\s*28px/);
});

test('M69.3: portrait photo feed is a 3-up grid filling the width', () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)\s*and\s*\(orientation:\s*portrait\)\s*\{[^@]*?\.tl-photo-strip\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/,
  );
});

test('M69.5: the scrubber suppresses text selection (a drag must not mark labels/feed)', () => {
  const sc = ruleBlock('.tl-scrubber');
  assert.ok(sc, '.tl-scrubber rule missing');
  assert.match(sc, /user-select:\s*none/);
});

test('M69.3: the day heading floats (sticky) like the album day-headers', () => {
  const h = ruleBlock('.tl-day-heading');
  assert.ok(h, '.tl-day-heading rule missing');
  assert.match(h, /position:\s*sticky/);
  assert.match(h, /top:\s*var\(--tl-bar-h/);
});

test('M69.3: a too-narrow segment label may overflow its cell (the "ת\'" sliver)', () => {
  const mini = ruleBlock('.tl-scrub-label.is-mini');
  assert.ok(mini, '.tl-scrub-label.is-mini rule missing');
  assert.match(mini, /overflow:\s*visible/);
});

test('M69.1: the scrubber has a position handle rule (a rounded thumb)', () => {
  const h = ruleBlock('.tl-scrubber-handle');
  assert.ok(h, '.tl-scrubber-handle rule missing');
  assert.match(h, /border-radius/);
});

test('M8/M69.2: desktop/landscape — the track is a horizontal bar (flex row)', () => {
  const barTrack = ruleBlock('.tl-scrubber[data-orient="bar"] .tl-scrub-track');
  assert.ok(barTrack, 'bar track rule missing');
  assert.match(barTrack, /flex-direction:\s*row/);
});

test('M69.2: country labels render below the track (bar), hidden on the rail', () => {
  assert.ok(ruleBlock('.tl-scrub-labels'), '.tl-scrub-labels rule missing');
  assert.match(css, /\.tl-scrubber\[data-orient="rail"\]\s*\.tl-scrub-labels\s*\{[^}]*display:\s*none/);
});

test('M69.2: on a wide desktop the bar stretches past the page width (full-bleed vw)', () => {
  assert.match(
    css,
    /@media\s*\(min-width:\s*1000px\)\s*\{[^@]*?\.tl-scrubber\[data-orient="bar"\]\s*\{[^}]*width:\s*92vw/,
    'desktop bar should stretch to ~92vw',
  );
});

test('M8: each segment grows proportionally (flex-basis 0)', () => {
  const seg = ruleBlock('.tl-seg');
  assert.ok(seg, '.tl-seg rule missing');
  assert.match(seg, /flex-basis:\s*0/);
});

test('M8: a tooltip rule exists and hides when [hidden]', () => {
  assert.ok(ruleBlock('.tl-tip'), '.tl-tip rule missing');
  assert.match(css, /\.tl-tip\[hidden\]\s*\{[^}]*display:\s*none/);
});
