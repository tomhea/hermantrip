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
import { parseImgPath, lh3UrlFor } from '../src/lib/img-proxy.js';

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

// --- /img/ proxy (dev mirror of the production Caddy reverse-proxy) ---
// Browsers can't hotlink lh3 (ORB / Google throttle); a server can. So the
// app requests same-origin /img/{id}/{width}; we fetch it from lh3
// server-side and stream it back. In production Caddy does this with edge
// caching via Cloudflare; here we keep a small in-memory cache so the dev
// loop doesn't re-fetch (and re-trigger Google's per-IP throttle).
const imgCache = new Map(); // key `${id}/${size}` -> { buf, type }
const IMG_CACHE_MAX = 400;

async function serveImg(id, size, res) {
  const key = `${id}/${size}`;
  let hit = imgCache.get(key);
  if (!hit) {
    const r = await fetch(lh3UrlFor(id, size));
    if (!r.ok) { res.writeHead(502).end(`upstream ${r.status}`); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    hit = { buf, type: r.headers.get('content-type') || 'image/jpeg' };
    if (imgCache.size >= IMG_CACHE_MAX) imgCache.delete(imgCache.keys().next().value);
    imgCache.set(key, hit);
  }
  const headers = {
    'Content-Type': hit.type,
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  if (size === 'orig') headers['Content-Disposition'] = `attachment; filename="${id}.jpg"`;
  res.writeHead(200, headers);
  res.end(hit.buf);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  const img = parseImgPath(url.pathname);
  if (img) {
    try {
      await serveImg(img.id, img.size, res);
      console.log(`img ${url.pathname}`);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`502 image proxy error\n`);
      console.log(`502 ${url.pathname} ${err}`);
    }
    return;
  }

  const out = await tryServe(url.pathname);
  if (out) {
    res.writeHead(200, {
      'Content-Type': out.type,
      'Cache-Control': 'no-cache',
    });
    res.end(out.body);
    console.log(`200 ${url.pathname}`);
    return;
  }

  // SPA fallback (M12): clean paths like /nepal/1/0 are virtual routes, not
  // files. If the path has no file extension, serve index.html so the
  // client-side router handles it (mirrors the Caddy try_files in prod).
  if (!extname(url.pathname)) {
    const shell = await tryServe('/index.html');
    if (shell) {
      res.writeHead(200, { 'Content-Type': shell.type, 'Cache-Control': 'no-cache' });
      res.end(shell.body);
      console.log(`200 ${url.pathname} (→ index.html)`);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`404 ${url.pathname}\n`);
  console.log(`404 ${url.pathname}`);
});

server.listen(PORT, () => {
  console.log(`hermantrip dev server: http://localhost:${PORT}/`);
  console.log(`(serving from ${ROOT})`);
});
