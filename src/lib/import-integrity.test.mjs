// Guard: every relative import in non-test src/ files must resolve to a file
// that exists.
//
// Why this exists: main.js is the DOM layer; the test suite never imports it
// (it touches document/window at module load), and node check only validates
// SYNTAX, not import resolution. So a dangling relative import in main.js can
// pass every gate and ship, 404-ing in the browser and taking the whole ES
// module down. This pure static check catches that class of bug.
//
// Test files (*.test.mjs) are EXCLUDED: the test runner imports them directly,
// so a broken import there already fails the suite loudly — and scanning them
// would also false-match example specifiers written inside their own comments.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(js|mjs)$/.test(name) && !/\.test\.mjs$/.test(name)) out.push(full);
  }
  return out;
}

// Static `import ... from '...'`, bare `import '...'`, and `export ... from '...'`.
// Only relative specifiers (starting with '.') are checked; bare/URL imports skip.
const IMPORT_RE = /(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;

test('every relative import in non-test src/ resolves to an existing file', () => {
  const problems = [];
  for (const file of sourceFiles(SRC)) {
    const code = readFileSync(file, 'utf8');
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(code)) !== null) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith('.')) continue;
      if (!existsSync(resolve(dirname(file), spec))) {
        problems.push(`${file} → ${spec}`);
      }
    }
  }
  assert.deepEqual(problems, [], `broken relative imports:\n${problems.join('\n')}`);
});
