// Guard: every .js/.mjs under src/ must PARSE (node --check) cleanly.
//
// Why this exists: main.js is the DOM layer — the test suite never imports it
// (it touches document/window at module load). So a SyntaxError in main.js
// (e.g. a botched edit producing a duplicate `const`) ships silently: unit
// tests stay green, the browser fails to parse the whole module, and the SPA
// is dead on any fresh load. This guard spawns `node --check` on every source
// file so a parse error fails the suite loudly.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

test('every src/ .js/.mjs parses cleanly (node --check)', () => {
  const broken = [];
  for (const file of sourceFiles(SRC)) {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status !== 0) broken.push(`${file}\n${(r.stderr || '').split('\n')[0]}`);
  }
  assert.deepEqual(broken, [], `files with syntax errors:\n${broken.join('\n')}`);
});
