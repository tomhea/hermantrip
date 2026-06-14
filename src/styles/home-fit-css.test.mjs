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
test('desktop set is a bento grid with named areas, shown on wide viewports', () => {
  const b = block('.home-bento'); assert.ok(b, '.home-bento rule missing');
  assert.match(b, /grid-template-areas/);
  assert.match(css, /\.home-bento\[data-layers="desktop"\]\s*\{[^}]*display:\s*grid/);
});
test('country-tile name + count sit on the RTL start (right) of the photo', () => {
  // RTL: inset-inline-start is the right edge (the M63.1 fix — was inset-inline-end = left).
  const name = block('.country-tile-name'); assert.ok(name);
  assert.match(name, /inset-inline-start/);
  assert.equal(/inset-inline-end/.test(name), false);
});
test('country-tile name sits on the photo with a scrim', () => {
  assert.ok(block('.country-tile-name')); assert.ok(block('.country-tile-scrim'));
});
test('count is hidden until hover (desktop)', () => {
  assert.match(css, /\.country-tile-count\s*\{[^}]*opacity:\s*0/);
});
test('the home escapes main#app padding/max-width so it fills the viewport (no scroll)', () => {
  // main#app has page padding + a 64rem max-width; the home must escape both or
  // the 7-tile no-scroll fit overflows. The header is flex:0, the fit flex:1 so
  // the fill is robust to the taller phone-portrait header (no magic calc number).
  assert.match(css, /main#app:has\(\.home-fit\)\s*\{[^}]*padding:\s*0/);
  assert.match(css, /main#app:has\(\.home-fit\)\s*\{[^}]*height:\s*100svh/);
});
