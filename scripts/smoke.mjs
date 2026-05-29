#!/usr/bin/env node
// End-to-end smoke test: boots the real dev server and verifies that the
// app shell AND actual photos load through the /img/ proxy. This is the
// check that would have caught "none of the pictures load" — the unit
// tests only assert the client emits /img/ URLs; this proves the server
// honors them and returns real image bytes.
//
//   node scripts/smoke.mjs
//
// Hits the network (Google lh3 via the proxy), so it's deliberately NOT in
// `npm test` (which must stay offline + deterministic). Run it before a
// release, or whenever the image path changes. Exit 0 = all good.

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT = 8123;
const BASE = `http://localhost:${PORT}`;

const manifest = JSON.parse(await readFile(resolve(ROOT, 'data/manifest.json'), 'utf8'));
// Pick a few real photo ids from different albums.
const sampleIds = manifest.albums.slice(0, 5).map((a) => a.photos[0]?.id).filter(Boolean);

const server = spawn('node', ['scripts/serve.mjs', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
const fail = (msg) => { console.error('✖ ' + msg); server.kill(); process.exit(1); };
const ok = (msg) => console.log('✔ ' + msg);

// Wait for the server to accept connections.
async function waitUp(tries = 30) {
  for (let i = 0; i < tries; i += 1) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  fail('server did not start');
}

try {
  await waitUp();
  ok('server up');

  // 1. App shell.
  for (const path of ['/', '/src/main.js', '/data/manifest.json']) {
    const r = await fetch(BASE + path);
    if (!r.ok) fail(`${path} → HTTP ${r.status}`);
  }
  ok('app shell (/, main.js, manifest) serves 200');

  // 2. Photos through the /img/ proxy — the part that broke.
  let imgOk = 0;
  for (const id of sampleIds) {
    const r = await fetch(`${BASE}/img/${id}/280`);
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) fail(`/img/${id}/280 → HTTP ${r.status} (proxy not serving images!)`);
    if (!ct.startsWith('image/')) fail(`/img/${id}/280 → content-type "${ct}", expected image/*`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) fail(`/img/${id}/280 → only ${buf.length} bytes, not a real image`);
    imgOk += 1;
  }
  ok(`${imgOk}/${sampleIds.length} photos load via /img/ proxy (real image bytes)`);

  // 3. Original download path sets an attachment header.
  const od = await fetch(`${BASE}/img/${sampleIds[0]}/orig`);
  if (!od.ok) fail(`/img/${sampleIds[0]}/orig → HTTP ${od.status}`);
  if (!(od.headers.get('content-disposition') || '').includes('attachment')) {
    fail('/img/.../orig missing Content-Disposition: attachment');
  }
  ok('original download path serves with attachment header');

  console.log('\nSMOKE PASS — app shell + photos load end-to-end.');
  server.kill();
  process.exit(0);
} catch (err) {
  fail(`unexpected error: ${err}`);
}
