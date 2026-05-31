import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  DEFAULT_PREFS, normalizePrefs, parsePrefs, serializePrefs,
} from './slideshow-prefs.js';

test('defaults: 4000ms, fade, repeat', () => {
  assert.deepEqual({ ...DEFAULT_PREFS }, { speed: 4000, transition: 'fade', loopMode: 'repeat' });
});

test('normalizePrefs keeps valid values', () => {
  assert.deepEqual(
    normalizePrefs({ speed: 7000, transition: 'kenburns', loopMode: 'continue' }),
    { speed: 7000, transition: 'kenburns', loopMode: 'continue' },
  );
});

test('normalizePrefs repairs invalid / partial / non-object input', () => {
  assert.deepEqual(normalizePrefs({ speed: 999, transition: 'x', loopMode: 'y' }),
    { speed: 4000, transition: 'fade', loopMode: 'repeat' });
  assert.deepEqual(normalizePrefs({ transition: 'zoom' }),
    { speed: 4000, transition: 'zoom', loopMode: 'repeat' });
  assert.deepEqual(normalizePrefs(null), { ...DEFAULT_PREFS });
  assert.deepEqual(normalizePrefs('nope'), { ...DEFAULT_PREFS });
});

test('parsePrefs tolerates empty / garbage / malformed JSON', () => {
  assert.deepEqual(parsePrefs(''), { ...DEFAULT_PREFS });
  assert.deepEqual(parsePrefs(undefined), { ...DEFAULT_PREFS });
  assert.deepEqual(parsePrefs('{not json'), { ...DEFAULT_PREFS });
  assert.deepEqual(parsePrefs('[1,2,3]'), { ...DEFAULT_PREFS }); // array → normalised to defaults
});

test('parsePrefs round-trips a serialized blob', () => {
  const prefs = { speed: 10000, transition: 'slide', loopMode: 'continue' };
  assert.deepEqual(parsePrefs(serializePrefs(prefs)), prefs);
});

test('serializePrefs never persists garbage', () => {
  const out = JSON.parse(serializePrefs({ speed: 1, transition: 'bad', loopMode: 'bad', extra: 'x' }));
  assert.deepEqual(out, { ...DEFAULT_PREFS });
});
