// Guard for the guessing-game photo size (M35 / ask #5).
//
// The photo is the fun part of the game, so it should fill the screen rather
// than sit in a fixed 45dvh letterbox. This asserts the layout contract: the
// stage flex-grows and the photo fills it. Visual confirmation is in the PR's
// R2 DOM probes (measured photo height as a share of the viewport).

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

test('.game-stage grows to fill leftover space (flex grow with basis 0)', () => {
  const stage = ruleBlock('.game-stage');
  assert.ok(stage, '.game-stage rule missing');
  // basis MUST be 0, not auto — auto inflates to the image's intrinsic height
  // and pushes the answer grid off-screen.
  assert.match(stage, /flex:\s*1\s+1\s+0/, '.game-stage must be flex: 1 1 0 (basis 0) to maximise the photo without overflow');
});

test('.game-stage is no longer hard-capped at 45dvh', () => {
  const stage = ruleBlock('.game-stage');
  assert.equal(/max-height:\s*45dvh/.test(stage), false, 'the 45dvh cap should be gone (ask #5)');
});

test('.game-shell is a full-viewport takeover (escapes main#app padding)', () => {
  // Without this the shell sat inside main#app's vertical padding and the
  // answer grid was pushed below the fold once the photo grew.
  const shell = ruleBlock('.game-shell');
  assert.ok(shell, '.game-shell rule missing');
  assert.match(shell, /position:\s*fixed/);
  assert.match(shell, /inset:\s*0/);
});

test('.game-photo fills the stage height (height: 100%, not a fixed dvh)', () => {
  const photo = ruleBlock('.game-photo');
  assert.ok(photo, '.game-photo rule missing');
  assert.match(photo, /height:\s*100%/);
  assert.equal(/height:\s*45dvh/.test(photo), false);
});

// ── M7 (Task 7.2): progress strip + landscape side-by-side layout ──────
test('M7: .game-progress strip has a styled track rule block', () => {
  const prog = ruleBlock('.game-progress');
  assert.ok(prog, '.game-progress rule missing');
  // a thin track with a background so the unfilled portion is visible
  assert.match(prog, /background/);
});

test('M7: .game-progress-bar is the proportional fill (accent background)', () => {
  const bar = ruleBlock('.game-progress-bar');
  assert.ok(bar, '.game-progress-bar rule missing');
  assert.match(bar, /height:\s*100%/);
  assert.match(bar, /background/);
});

test('M68.1: only SHORT landscape (phone) flips the body to a side rail — not PC', () => {
  // PC is also landscape orientation; options go BELOW the photo there. The
  // side-rail row layout is gated to short viewports (landscape phones).
  assert.match(
    css,
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*500px\)\s*\{[\s\S]*?\.game-body\s*\{[\s\S]*?flex-direction:\s*row/,
    'expected @media (orientation: landscape) and (max-height: 500px){ .game-body { flex-direction: row } }',
  );
});

test('M68.1: landscape-phone rail stacks the options in a single column (4 rows × 1)', () => {
  assert.match(
    css,
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*500px\)\s*\{[\s\S]*?\.game-answers\s+\.game-country-grid[\s\S]*?grid-template-columns:\s*1fr/,
    'expected the rail grids to collapse to a single column on landscape phones',
  );
});

test('M68.1: on wider screens the country grid is 4-in-a-row (only 4 options now, was 7)', () => {
  assert.match(
    css,
    /@media\s*\(min-width:\s*600px\)\s*\{[\s\S]*?\.game-country-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/,
  );
  assert.equal(/grid-template-columns:\s*repeat\(7/.test(css), false, 'no 7-column country grid remains');
});

test('M68.1: game option buttons set an explicit themeable text colour (not UA black)', () => {
  const country = ruleBlock('.game-country-btn');
  const album = ruleBlock('.game-album-btn');
  assert.match(country, /color:\s*var\(--text\)/, '.game-country-btn must set color: var(--text)');
  assert.match(album, /color:\s*var\(--text\)/, '.game-album-btn must set color: var(--text)');
});

test('M68.1: dark mode gives the option buttons a more visible border', () => {
  // Require the literal dark override selector with its own border-color,
  // not just any co-occurrence across the stylesheet.
  assert.match(
    css,
    /\[data-theme="dark"\]\s+\.game-country-btn[^{]*\{[^}]*border-color/,
    'expected a [data-theme="dark"] .game-country-btn { … border-color … } override',
  );
});

test('M7: .game-body is a flex container that fills the shell (basis 0)', () => {
  const body = ruleBlock('.game-body');
  assert.ok(body, '.game-body rule missing');
  assert.match(body, /flex:\s*1\s+1\s+0/);
  assert.match(body, /flex-direction:\s*column/);
});
