// Guard for the timeline sticky-header overlap fix (M36 / ask #11).
//
// The bug: the header ("← חזרה / ציר זמן") was sticky at top:0 AND the slider
// sticky at top:48px — but the header renders ~73px tall, so the slider sat
// 25px UNDER the header and day headings hid behind the bar. Fix: the header
// scrolls away (not sticky); only the slider stays sticky, at top:0.

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

test('.tl-header is no longer sticky (it scrolls away, freeing the content)', () => {
  const header = ruleBlock('.tl-header');
  assert.ok(header, '.tl-header rule missing');
  assert.equal(/position:\s*sticky/.test(header), false, '.tl-header must not be sticky (ask #11)');
});

test('.tl-slider-wrap is the lone sticky bar, pinned to the very top', () => {
  const slider = ruleBlock('.tl-slider-wrap');
  assert.ok(slider, '.tl-slider-wrap rule missing');
  assert.match(slider, /position:\s*sticky/);
  assert.match(slider, /top:\s*0/, 'slider must stick at top:0 (header no longer occupies that space)');
});

test('.tl-day scroll-margin clears only the slider, not the old 108px header+slider', () => {
  // (.tl-day has two rule blocks; check the stylesheet globally for the offset.)
  assert.match(css, /\.tl-day\s*\{\s*scroll-margin-top:\s*60px/);
  assert.equal(/scroll-margin-top:\s*108px/.test(css), false);
});
