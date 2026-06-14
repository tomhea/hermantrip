// Guard for the M3 country page (featured-first overlay album grid).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');
function block(sel){const re=new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\{([^}]*)\\}`);const m=css.match(re);return m?m[2]:null;}

test('.country-page is a grid — 2 cols on phone, 3 on desktop', () => {
  const b = block('.country-page'); assert.ok(b, '.country-page rule missing');
  assert.match(b, /display:\s*grid/);
  assert.match(b, /grid-template-columns:\s*repeat\(2/);
  assert.match(css, /min-width:\s*769px[^]*\.country-page\s*\{[^}]*grid-template-columns:\s*repeat\(3/);
});

test('phone-portrait: the featured tile spans the full row and is wide (21/9)', () => {
  const b = block('.album-tile-featured'); assert.ok(b, '.album-tile-featured rule missing');
  assert.match(b, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(b, /aspect-ratio:\s*21\s*\/\s*9/);
});

test('desktop/landscape: the featured tile is a normal grid cell (even 3-col grid, no full-width banner)', () => {
  // at ≥769px the first album is just a normal tile so several albums show without scrolling
  assert.match(css, /min-width:\s*769px[^]*\.album-tile-featured\s*\{[^}]*grid-column:\s*auto/);
});

test('album tiles overlay the name + sub on the cover photo (with a scrim)', () => {
  assert.ok(block('.album-tile-name'));
  assert.ok(block('.album-tile-sub'));
  assert.ok(block('.album-tile-scrim'));
});

test('the tile photo fills the tile (object-fit cover)', () => {
  const b = block('.album-tile-img'); assert.ok(b, '.album-tile-img rule missing');
  assert.match(b, /object-fit:\s*cover/);
});
