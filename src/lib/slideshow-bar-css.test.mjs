// Guard for the slideshow control-bar layout contract (M30 / ask #2).
//
// The bug: on a portrait phone the bar was a single non-wrapping flex row, so
// once it held 7+ controls the end buttons were clipped off-screen; and the
// ⓘ info panel was absolutely anchored to the summary, so it spilled past the
// viewport edge when the ⓘ sat near the bar's inline edge.
//
// These are pure-CSS fixes, so the regression guard is a CSS-contract check in
// the same spirit as syntax-integrity / boot-invoked: read main.css and assert
// the layout rules that keep every control on-screen are present. Visual
// confirmation lives in the PR's R2 DOM probes.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  fileURLToPath(new URL('../styles/main.css', import.meta.url)),
  'utf8',
);

// Return the body of the FIRST rule block for an exact selector at line start.
function ruleBlock(selector) {
  const re = new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  return m ? m[2] : null;
}

test('the slideshow bar wraps so every control stays visible on a phone', () => {
  const bar = ruleBlock('.slideshow-bar');
  assert.ok(bar, '.slideshow-bar rule not found in main.css');
  assert.match(bar, /flex-wrap:\s*wrap/, '.slideshow-bar must set flex-wrap: wrap (ask #2)');
});

test('the phone info panel is viewport-anchored (fixed + centred), not summary-anchored', () => {
  const body = ruleBlock('.slideshow-info .info-body');
  assert.ok(body, '.slideshow-info .info-body rule not found');
  assert.match(body, /position:\s*fixed/, 'phone base .info-body must be position: fixed so it can not spill off-screen');
  assert.match(body, /left:\s*50%/, 'phone base .info-body must be horizontally centred');
  assert.match(body, /transform:\s*translateX\(-50%\)/, 'phone base .info-body must centre via translateX(-50%)');
});

test('≥600px restores the contextual button-anchored info panel', () => {
  // Confirm there is a min-width:600px media block that re-anchors the panel
  // absolutely (so the desktop look is preserved, not lost to the phone fix).
  assert.match(
    css,
    /@media\s*\(min-width:\s*600px\)\s*\{[^@]*\.slideshow-info\s+\.info-body\s*\{[^}]*position:\s*absolute/,
    'expected a min-width:600px override setting .info-body back to position: absolute',
  );
});
