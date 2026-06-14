// Guard for the M4 album grid + the M65.1 polish (uniform-width tiles, sticky
// day headers only where the mobile URL bar doesn't fight them, no header overflow).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');
function block(sel){const re=new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\{([^}]*)\\}`);const m=css.match(re);return m?m[2]:null;}

test('.photo-grid is a uniform auto-fill grid (every tile the same width, incl. the last row)', () => {
  const b = block('.photo-grid'); assert.ok(b, '.photo-grid rule missing');
  assert.match(b, /display:\s*grid/);
  assert.match(b, /grid-template-columns:\s*repeat\(auto-fill,\s*minmax/);
});

test('.album-photo keeps a fixed row height + object-fit cover (uniform landscape tiles)', () => {
  const b = block('.album-photo'); assert.ok(b, '.album-photo rule missing');
  assert.match(b, /height:\s*\d+px/);
  assert.match(b, /object-fit:\s*cover/);
});

test('.day-header sticks to the top while scrolling (pins the current date, all viewports)', () => {
  const b = block('.day-header'); assert.ok(b, '.day-header rule missing');
  assert.match(b, /position:\s*sticky/);
  assert.match(b, /top:\s*0/);
  // no phone override forcing it static — sticky everywhere now
  assert.equal(/\.day-header\s*\{\s*position:\s*static/.test(css), false);
});

test('.slim-title can wrap (no nowrap) so a long header never overflows the phone width', () => {
  const b = block('.slim-title'); assert.ok(b, '.slim-title rule missing');
  assert.equal(/white-space:\s*nowrap/.test(b), false);
});
