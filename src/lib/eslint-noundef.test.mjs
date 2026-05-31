// Guard: ESLint `no-undef` must pass on the whole tree (R8 — the REAL fix).
//
// Why this exists, and why the other guards weren't enough:
//   M28 used `globeResizeHandler` in six places and declared it in none.
//   `render()` is the first line boot runs, so it threw ReferenceError on
//   every page — the site sat on the static "loading…" shell, 100% down.
//   It evaded every gate we had:
//     • `node --check` / syntax-integrity.test.mjs — passes (valid syntax,
//       the failure is a runtime ReferenceError, not a parse error).
//     • the unit suite — never imports main.js (it touches document/window at
//       module load), so the bad reference is never evaluated.
//     • boot-invoked.test.mjs — checks the IIFE is *called*, not that the code
//       inside it resolves.
//   The thing that actually catches "this name resolves to nothing" is a
//   linter with scope analysis. So we run one, here, as part of `node --test`.
//
// Implementation: shell out to `npx eslint@9` against eslint.config.mjs (which
// enables no-undef + a few other correctness rules). The project has no
// node_modules by design, so eslint comes from the npx cache; the FIRST run on
// a fresh machine fetches it once (needs network), every run after is offline.
// If eslint cannot be invoked at all we FAIL loudly rather than skip — a gate
// that silently no-ops is not a gate.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

test('eslint no-undef passes on the whole tree (catches the M28 outage class)', () => {
  // `npx` is a .cmd shim on Windows, so go through the shell. `--no-install`
  // is intentionally NOT passed: we want the one-time fetch to succeed on a
  // fresh checkout. eslint@9 is pinned so the ruleset can't drift under us.
  // --max-warnings=0 mirrors R8: warnings (e.g. an unused eslint-disable
  // directive) fail the gate too, so dead directives can't quietly pile up.
  const r = spawnSync('npx eslint@9 --max-warnings=0 .', {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    timeout: 180_000, // generous: covers a cold npx fetch on first run.
  });

  if (r.error) {
    assert.fail(
      `Could not invoke ESLint (${r.error.code || r.error.message}). ` +
      'Run `npm run lint` once while online to populate the npx cache, then re-run the suite.',
    );
  }

  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  // eslint exits 0 = clean, 1 = lint errors found, 2 = config/crash.
  assert.equal(
    r.status,
    0,
    `eslint reported problems (exit ${r.status}). ` +
    'A `no-undef` error here is exactly the bug that took the site down — ' +
    `declare the missing name before shipping.\n\n${out}`,
  );
});
