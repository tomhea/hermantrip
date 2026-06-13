// Guard for the shared slim header layout contract (M1.5).
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

test('.slim-header lays out title + actions with space between', () => {
  const b = ruleBlock('.slim-header');
  assert.ok(b, '.slim-header rule missing');
  assert.match(b, /justify-content:\s*space-between/);
});

test('.slim-actions is a flex action group', () => {
  const b = ruleBlock('.slim-actions');
  assert.ok(b, '.slim-actions rule missing');
  assert.match(b, /display:\s*flex/);
});
