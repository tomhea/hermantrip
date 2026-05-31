import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Regression guard for the random-slideshow "grey sides" bug.
//
// The prev/next tap-zones are <button> in the random slideshow (JS-driven
// nav). A bare <button> paints the UA default ButtonFace background
// (~#f0f0f0), which covered 80% of the photo area. The .slideshow-zone rule
// MUST therefore neutralise the UA button chrome — otherwise the regression
// silently returns. This reads the shipped stylesheet and asserts the reset.

const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');

// Grab the declaration block for an exact `.slideshow-zone {...}` rule
// (the bare selector, not `.slideshow-zone-next` etc.).
function zoneRuleBody() {
  const m = css.match(/\.slideshow-zone\s*\{([^}]*)\}/);
  return m ? m[1] : null;
}

test('.slideshow-zone exists in the stylesheet', () => {
  assert.ok(zoneRuleBody(), 'rule should be present');
});

test('.slideshow-zone clears the UA button background (transparent)', () => {
  assert.match(zoneRuleBody(), /background:\s*transparent/);
});

test('.slideshow-zone removes the UA button border', () => {
  assert.match(zoneRuleBody(), /border:\s*0/);
});

test('.slideshow-zone neutralises native control appearance', () => {
  assert.match(zoneRuleBody(), /appearance:\s*none/);
});

// M33 / ask #8 — long-press on a tap-zone must do nothing (no iOS callout /
// text selection). The contextmenu no-op is wired in main.js; the CSS half is
// the callout/selection suppression asserted here.
test('.slideshow-zone suppresses the iOS long-press callout', () => {
  assert.match(zoneRuleBody(), /-webkit-touch-callout:\s*none/);
});

test('.slideshow-zone is not text-selectable (no long-press selection)', () => {
  assert.match(zoneRuleBody(), /user-select:\s*none/);
});
