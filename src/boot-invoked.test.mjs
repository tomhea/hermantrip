// Guard: main.js must INVOKE its boot IIFE, not just define it.
//
// Regression: the boot wrapper once shipped as `(async function boot(){…});`
// — defined but never called (the `()` invocation was dropped during an
// unrelated edit). The whole app silently never booted: the page sat on the
// static "loading…" shell forever, with no console error (the function just
// never ran). node --check passed (syntactically valid), every unit test
// passed (they don't import main.js), and module-eval succeeded — so nothing
// caught it. This static check asserts the IIFE is actually invoked.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const main = readFileSync(fileURLToPath(new URL('./main.js', import.meta.url)), 'utf8');

test('boot is defined as an async IIFE', () => {
  assert.match(main, /\(async function boot\(\)\s*\{/, 'boot IIFE wrapper missing');
});

test('the boot IIFE is actually invoked (ends with })();, not });)', () => {
  // The file must contain an IIFE invocation `})();` — the boot wrapper's
  // closing call. Without it the function is defined but never runs.
  assert.match(main, /\}\)\(\);/, "main.js never invokes its boot IIFE — found no '})();'");
});

test('main.js does not end with a bare un-invoked function expression', () => {
  const tail = main.trimEnd().slice(-8);
  assert.notEqual(tail.endsWith('});'), main.trimEnd().endsWith('})();') ? false : true,
    `main.js ends with "${tail}" — boot IIFE looks un-invoked`);
});
