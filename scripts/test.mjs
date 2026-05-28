#!/usr/bin/env node
// Wrapper around the node:test programmatic API so the CR-ist has a single
// entry point that exits non-zero on failure (R1). Uses the programmatic
// run() rather than `node --test` auto-discovery, otherwise this very file
// (whose basename matches the test-runner pattern `test.mjs`) gets picked
// up as a test, triggering recursion warnings.

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const IGNORE_DIRS = new Set(['node_modules', '.git', 'versions', 'dist']);
const TEST_FILE_RE = /\.test\.m?js$/;

async function findTests(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await findTests(full, results);
    } else if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const files = await findTests(repoRoot);
if (files.length === 0) {
  console.error('No *.test.mjs files found under', repoRoot);
  process.exit(1);
}

const stream = run({ files, concurrency: true });
stream.compose(new spec()).pipe(process.stdout);

let failed = 0;
stream.on('test:fail', () => { failed += 1; });
stream.on('end', () => { process.exit(failed > 0 ? 1 : 0); });
