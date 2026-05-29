import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { SPEEDS, nextSpeed, speedLabel } from './slideshow-speed.js';

test('SPEEDS are ascending second-multiples in ms', () => {
  assert.ok(Array.isArray(SPEEDS) && SPEEDS.length >= 3);
  assert.deepEqual([...SPEEDS].sort((a, b) => a - b), SPEEDS);
  for (const s of SPEEDS) assert.equal(s % 1000, 0);
});

test('nextSpeed cycles to the next speed', () => {
  assert.equal(nextSpeed(SPEEDS[0]), SPEEDS[1]);
});

test('nextSpeed wraps from last back to first', () => {
  assert.equal(nextSpeed(SPEEDS[SPEEDS.length - 1]), SPEEDS[0]);
});

test('nextSpeed with an unknown value returns the first speed', () => {
  assert.equal(nextSpeed(999999), SPEEDS[0]);
});

test('speedLabel shows seconds with a Hebrew suffix', () => {
  assert.equal(speedLabel(5000), "5ש'");
  assert.equal(speedLabel(3000), "3ש'");
  assert.equal(speedLabel(10000), "10ש'");
});

test('the default 4s interval (M7) is one of the options', () => {
  assert.ok(SPEEDS.includes(4000));
});
