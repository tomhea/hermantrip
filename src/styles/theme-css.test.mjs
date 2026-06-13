// src/styles/theme-css.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');

test('dark tokens are defined under [data-theme="dark"]', () => {
  assert.match(css, /\[data-theme="dark"\]\s*\{/);
});
test('dark bg is the warm charcoal', () => {
  const m = css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(m, 'dark block missing');
  assert.match(m[1], /--bg:\s*#1b1815/);
  assert.match(m[1], /--text:\s*#f3ece1/);
  assert.match(m[1], /--accent:\s*#cf7a4e/);
});
test('a --stage token exists for the slideshow surface', () => {
  assert.match(css, /--stage:\s*#211e1b/);
});
test('transitions on bg/color for a smooth theme switch', () => {
  assert.match(css, /body\s*\{[^}]*transition:[^}]*background/);
});
