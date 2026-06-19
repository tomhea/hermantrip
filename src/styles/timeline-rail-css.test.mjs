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

test('M8: portrait — scrubber is a 13px vertical rail', () => {
  const rail = ruleBlock('.tl-scrubber[data-orient="rail"]');
  assert.ok(rail, '.tl-scrubber[data-orient="rail"] rule missing');
  assert.match(rail, /width:\s*13px/);
  assert.match(rail, /flex-direction:\s*column/);
});

test('M8: desktop/landscape — scrubber is a horizontal bar (flex row)', () => {
  const bar = ruleBlock('.tl-scrubber[data-orient="bar"]');
  assert.ok(bar, '.tl-scrubber[data-orient="bar"] rule missing');
  assert.match(bar, /flex-direction:\s*row/);
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
