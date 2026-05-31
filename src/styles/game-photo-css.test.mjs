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
