import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  TRANSITIONS, DEFAULT_TRANSITION, normalizeTransition,
  nextTransition, transitionLabel, transitionClass,
} from './slideshow-transition.js';

test('there are exactly five transition choices', () => {
  assert.equal(TRANSITIONS.length, 5);
  assert.deepEqual(TRANSITIONS, ['none', 'fade', 'zoom', 'slide', 'kenburns']);
});

test('nextTransition cycles through all five and wraps', () => {
  assert.equal(nextTransition('none'), 'fade');
  assert.equal(nextTransition('fade'), 'zoom');
  assert.equal(nextTransition('zoom'), 'slide');
  assert.equal(nextTransition('slide'), 'kenburns');
  assert.equal(nextTransition('kenburns'), 'none'); // wrap
});

test('nextTransition on an unknown value starts at the first', () => {
  assert.equal(nextTransition('bogus'), 'none');
});

test('normalizeTransition keeps known values, defaults the rest', () => {
  assert.equal(normalizeTransition('slide'), 'slide');
  assert.equal(normalizeTransition('kenburns'), 'kenburns');
  assert.equal(normalizeTransition(undefined), DEFAULT_TRANSITION);
  assert.equal(normalizeTransition('💥'), DEFAULT_TRANSITION);
  assert.equal(DEFAULT_TRANSITION, 'fade');
});

test('every transition has a non-empty Hebrew label', () => {
  for (const t of TRANSITIONS) {
    const label = transitionLabel(t);
    assert.ok(typeof label === 'string' && label.length > 0, `missing label for ${t}`);
  }
  // unknown value falls back to the default label, never blank
  assert.equal(transitionLabel('bogus'), transitionLabel(DEFAULT_TRANSITION));
});

test('transitionClass renders a tr-<name> class, normalised', () => {
  assert.equal(transitionClass('none'), 'tr-none');
  assert.equal(transitionClass('kenburns'), 'tr-kenburns');
  assert.equal(transitionClass('garbage'), 'tr-fade');
});
