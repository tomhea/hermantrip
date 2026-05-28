import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { answer } from './trivial.mjs';

test('M0 sentinel — answer() returns 42', () => {
  assert.equal(answer(), 42);
});
