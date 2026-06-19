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
    /@media\s*\(max-width:\s*768px\)\s*and\s*\(orientation:\s*portrait\)\s*\{[^@]*?\.tl-page\s*\{[^}]*padding-right:\s*26px/,
    'portrait .tl-page must reserve a 26px right column for the rail',
  );
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
