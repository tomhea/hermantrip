import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');
function block(sel){const re=new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\{([^}]*)\\}`);const m=css.match(re);return m?m[2]:null;}

test('.home-fit fills the viewport and does not scroll', () => {
  const b = block('.home-fit');
  assert.ok(b); assert.match(b, /height:\s*(100svh|100vh|calc\()/); assert.match(b, /overflow:\s*hidden/);
});
test('desktop layers hidden on phone, phone layers hidden on desktop', () => {
  assert.match(css, /\[data-layers="phone"\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /min-width:\s*769px[^]*\[data-layers="desktop"\]\s*\{[^}]*display:\s*none/);
});
test('the finale desktop layer grows taller', () => {
  assert.match(css, /\.home-layer\[data-finale\]\s*\{[^}]*flex:\s*1\.5/);
});
test('country-tile name sits on the photo with a scrim', () => {
  assert.ok(block('.country-tile-name')); assert.ok(block('.country-tile-scrim'));
});
test('count is hidden until hover (desktop)', () => {
  assert.match(css, /\.country-tile-count\s*\{[^}]*opacity:\s*0/);
});
