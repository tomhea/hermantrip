import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  LOOP_MODES, DEFAULT_LOOP, normalizeLoop, nextLoopMode, loopGlyph, loopAriaLabel,
} from './slideshow-loop.js';

test('two loop modes, repeat default', () => {
  assert.deepEqual(LOOP_MODES, ['repeat', 'continue']);
  assert.equal(DEFAULT_LOOP, 'repeat');
});

test('nextLoopMode toggles and wraps', () => {
  assert.equal(nextLoopMode('repeat'), 'continue');
  assert.equal(nextLoopMode('continue'), 'repeat');
  assert.equal(nextLoopMode('bogus'), 'repeat');
});

test('normalizeLoop defaults unknown values', () => {
  assert.equal(normalizeLoop('continue'), 'continue');
  assert.equal(normalizeLoop(undefined), 'repeat');
  assert.equal(normalizeLoop('x'), 'repeat');
});

test('each mode has a distinct glyph and a non-empty Hebrew aria-label', () => {
  assert.notEqual(loopGlyph('repeat'), loopGlyph('continue'));
  for (const m of LOOP_MODES) {
    assert.ok(loopGlyph(m).length > 0);
    assert.ok(loopAriaLabel(m).length > 0);
  }
});
