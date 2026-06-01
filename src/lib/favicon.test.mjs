// Guards that the favicon / app-icon wiring (M60 / #9) stays in place: the icon
// files exist, index.html links them, and the web manifest lists the PNG icons.
// Pure file/text assertions — no DOM.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');

test('all referenced icon files exist in the repo root', () => {
  for (const f of ['favicon.ico', 'favicon.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon.svg']) {
    assert.ok(existsSync(resolve(repoRoot, f)), `${f} must exist`);
  }
});

test('index.html links the favicon, an SVG icon, and the apple-touch icon', () => {
  const html = read('index.html');
  assert.match(html, /<link[^>]+rel="icon"[^>]+href="\/favicon\.ico"/);
  assert.match(html, /<link[^>]+rel="icon"[^>]+type="image\/svg\+xml"[^>]+href="\/icon\.svg"/);
  assert.match(html, /<link[^>]+rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/);
});

test('manifest lists PNG icons (128 + 180) alongside the SVG', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const srcs = manifest.icons.map((i) => i.src);
  assert.ok(srcs.includes('/favicon-32.png'), 'expected the 128px PNG');
  assert.ok(srcs.includes('/apple-touch-icon.png'), 'expected the 180px PNG');
  assert.ok(srcs.includes('/icon.svg'), 'expected the SVG icon');
  // every icon entry has a sizes + type
  for (const i of manifest.icons) {
    assert.ok(i.sizes && i.type, `icon ${i.src} needs sizes + type`);
  }
});

test('no oversized SVG favicon is shipped (the 4.4 MB source was dropped)', () => {
  // icon.svg is the lightweight vector; a multi-MB favicon would blow the perf
  // budget. Guard that icon.svg stays small.
  const stat = readFileSync(resolve(repoRoot, 'icon.svg'));
  assert.ok(stat.length < 20_000, 'icon.svg must stay a lightweight vector');
});
