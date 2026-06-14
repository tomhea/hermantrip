import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// M5 slideshow re-skin guard. Asserts the charcoal stage token, the centred &
// contained photo, the FLOATING auto-hide control bar (windowed + fullscreen),
// the on-demand filmstrip, and the anti-glassmorphism rule (design.md: no
// backdrop-filter anywhere in the slideshow chrome).

const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');

// Body of an EXACT top-level rule `<sel> { ... }` (sel at a line start, so a
// compound like `.slideshow-shell.tr-fade ...` won't match the bare selector).
function block(sel) {
  const re = new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  return m ? m[2] : null;
}

// The whole M5 slideshow section, from its marker to the next top-level section.
function slideshowSection() {
  const start = css.indexOf('/* ---- M5: slideshow ---- */');
  assert.ok(start !== -1, 'slideshow section marker present');
  const end = css.indexOf('/* Map popup */', start);
  assert.ok(end !== -1, 'section is bounded by the next section comment');
  return css.slice(start, end);
}

test('stage is charcoal in BOTH themes via a local --stage override', () => {
  const b = block('.slideshow-shell');
  assert.ok(b, '.slideshow-shell rule present');
  assert.match(b, /--stage:\s*#211e1b/);
  assert.match(b, /background:\s*var\(--stage\)/);
});

test('photo is centred & contained', () => {
  const stage = block('.slideshow-stage');
  assert.ok(stage, '.slideshow-stage rule present');
  assert.match(stage, /align-items:\s*center/);
  assert.match(stage, /justify-content:\s*center/);
  const photo = block('.slideshow-photo');
  assert.ok(photo, '.slideshow-photo rule present');
  assert.match(photo, /object-fit:\s*contain/);
});

test('the control dock is ONE floating overlay; the bar carries a plain gradient scrim', () => {
  const dock = block('.slideshow-dock');
  assert.ok(dock, '.slideshow-dock rule present');
  assert.match(dock, /position:\s*absolute/);
  assert.match(dock, /bottom:\s*0/);
  assert.match(dock, /flex-direction:\s*column/); // filmstrip stacks above the bar
  const bar = block('.slideshow-bar');
  assert.ok(bar, '.slideshow-bar rule present');
  assert.match(bar, /linear-gradient/);
});

test('the dock auto-hides by default and shows only with .controls-visible', () => {
  const dock = block('.slideshow-dock');
  assert.match(dock, /opacity:\s*0/);
  assert.match(dock, /pointer-events:\s*none/);
  // gated reveal works in the WINDOWED viewer too (no .is-fullscreen prefix)
  assert.match(css, /\.slideshow-shell\.controls-visible\s+\.slideshow-dock\s*\{[^}]*opacity:\s*1/);
});

test('an on-demand filmstrip rail exists, has NO scrollbar, and supports drag', () => {
  const strip = block('.slideshow-filmstrip');
  assert.ok(strip, '.slideshow-filmstrip rule present');
  assert.match(strip, /scrollbar-width:\s*none/);                 // Firefox: hidden
  assert.match(css, /\.slideshow-filmstrip::-webkit-scrollbar\s*\{[^}]*display:\s*none/); // WebKit: hidden
  assert.match(strip, /cursor:\s*grab/);                          // drag affordance
});

test('filmstrip thumbnails are fully opaque (current marked by outline only)', () => {
  const thumb = block('.filmstrip-thumb');
  assert.ok(thumb, '.filmstrip-thumb rule present');
  assert.equal(/opacity:\s*0?\.\d/.test(thumb), false, 'no fractional opacity dimming');
  assert.match(css, /\.filmstrip-thumb\.is-active\s*\{[^}]*outline-color/);
});

test('no glassmorphism anywhere in the slideshow chrome (design.md)', () => {
  assert.equal(/backdrop-filter/.test(slideshowSection()), false);
});
