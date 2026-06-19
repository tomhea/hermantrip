import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { motifDefs, motifFill } from './country-motifs.js';

test('defs include a <pattern> per country (7)', () => {
  const d = motifDefs();
  for (const c of ['np', 'in', 'vn', 'cn', 'au', 'nz', 'th']) {
    assert.match(d, new RegExp(`<pattern id="motif-${c}"`));
  }
});

test('defs are wrapped in a <defs> block', () => {
  const d = motifDefs();
  assert.match(d, /^<defs>/);
  assert.match(d, /<\/defs>$/);
});

test('motifs are white strokes (read as light texture over the colour)', () => {
  assert.match(motifDefs(), /#fff/i);
});

test('motifFill references the pattern by id', () => {
  assert.equal(motifFill('np'), 'url(#motif-np)');
  assert.equal(motifFill('th'), 'url(#motif-th)');
});
