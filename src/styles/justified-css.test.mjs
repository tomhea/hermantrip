// Guard for the M4 album grid: justified rows by day + sticky day headers.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');
function block(sel){const re=new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\{([^}]*)\\}`);const m=css.match(re);return m?m[2]:null;}

test('.photo-grid lays out justified rows (flex wrap, not a fixed-column grid)', () => {
  const b = block('.photo-grid'); assert.ok(b, '.photo-grid rule missing');
  assert.match(b, /display:\s*flex/);
  assert.match(b, /flex-wrap:\s*wrap/);
});

test('.photo-tile has a flex-basis so rows actually wrap, and a fixed row height', () => {
  const b = block('.photo-tile'); assert.ok(b, '.photo-tile rule missing');
  assert.match(b, /flex:\s*1\s+1\s+\d+px/); // grow + shrink + a real basis
  assert.match(b, /height:\s*\d+px/);
});

test('.album-photo keeps a fixed row height + object-fit cover (uniform fallback)', () => {
  const b = block('.album-photo'); assert.ok(b, '.album-photo rule missing');
  assert.match(b, /height:\s*\d+px/);
  assert.match(b, /object-fit:\s*cover/);
});

test('.day-header sticks to the top while scrolling', () => {
  const b = block('.day-header'); assert.ok(b, '.day-header rule missing');
  assert.match(b, /position:\s*sticky/);
  assert.match(b, /top:\s*0/);
});
