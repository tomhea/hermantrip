// Guard: every relative import in src/ must resolve to a file that exists.
//
// Why this exists: main.js is the DOM layer — the test suite never imports it
// (it touches document/window at module load), and `node --check` only checks
// SYNTAX, not import resolution. So a broken `import ... from './lib/trail.js'`
// in main.js passed every gate and shipped, 404-ing in the browser and taking
// the whole module down. This pure static check would have caught it.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (/\.(js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

// Match static `import ... from '...'`, bare `import '...'`, and
// `export ... from '...'`. Dynamic import() URLs (http) are skipped.
const IMPORT_RE = /(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;

test('every relative import in src/ resolves to an existing file', () => {
  const problems = [];
  for (const file of jsFiles(SRC)) {
    const code = readFileSync(file, 'utf8');
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(code)) !== null) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith('.')) continue; // skip bare/URL imports
      const target = resolve(dirname(file), spec);
      if (!existsSync(target)) {
        problems.push(`${file} → ${spec}`);
      }
    }
  }
  assert.deepEqual(problems, [], `broken relative imports:\n${problems.join('\n')}`);
});
