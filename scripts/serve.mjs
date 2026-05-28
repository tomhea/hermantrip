#!/usr/bin/env node
// Tiny zero-dep static server for local development.
//
//   node scripts/serve.mjs            # serves repo root on :8080
//   node scripts/serve.mjs --port 3000
//
// Why a custom script instead of `npx serve`:
//   - Zero install, zero network for an offline dev loop.
//   - Honors hash routing (no rewrites needed — we don't fall back to
//     index.html for unknown paths, because hash routing keeps the URL
//     path = /).
//   - Sets sensible MIME types for .mjs and .webmanifest which not every
//     static server gets right out of the box.

import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const argv = process.argv.slice(2);
const portIdx = argv.indexOf('--port');
const PORT = portIdx >= 0 ? parseInt(argv[portIdx + 1], 10) : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

async function tryServe(reqPath) {
  let fsPath = join(ROOT, decodeURIComponent(reqPath));
  // Prevent path traversal outside ROOT.
  if (!fsPath.startsWith(ROOT)) return null;
  try {
    let s = await stat(fsPath);
    if (s.isDirectory()) {
      fsPath = join(fsPath, 'index.html');
      s = await stat(fsPath);
    }
    if (!s.isFile()) return null;
    const body = await readFile(fsPath);
    const type = MIME[extname(fsPath)] ?? 'application/octet-stream';
    return { body, type };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const out = await tryServe(url.pathname);
  if (out) {
    res.writeHead(200, {
      'Content-Type': out.type,
      'Cache-Control': 'no-cache',
    });
    res.end(out.body);
    console.log(`200 ${url.pathname}`);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 ${url.pathname}\n`);
    console.log(`404 ${url.pathname}`);
  }
});

server.listen(PORT, () => {
  console.log(`hermantrip dev server: http://localhost:${PORT}/`);
  console.log(`(serving from ${ROOT})`);
});
