#!/usr/bin/env node
// Builds data/manifest.json by enumerating the public Google Drive folder
// via Drive API v3 with a simple API key (no OAuth — the folder is public).
//
// Usage:
//   DRIVE_API_KEY=AIza... node scripts/build-manifest.mjs
//
// Output: data/manifest.json with structure:
//   {
//     rootFolderId, generatedAt, counts: { albums, photos },
//     countries: [{ code, he, en, primaryAlbums: [id...] }],
//     albums:    [{ id, name, folderIds, countries, primary, photos: [...] }]
//   }
//
// The Drive folder is frozen (per the user) so this script runs ONCE and the
// manifest gets committed forever. No CI re-run, no cron, no long-lived
// secret to rotate.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { extractAlbumNumber } from '../src/lib/album-name.js';
import { extractPhotoMeta } from '../src/lib/photo-meta.js';
import { assignAlbumToCountries, COUNTRIES } from '../src/lib/countries.js';
import { sortPhotosByFilename } from '../src/lib/ordering.js';
import { mergeFolders } from '../src/lib/album-merge.js';

const ROOT_FOLDER_ID = '1MUS4Zl3eB5DmV-LPDulOla0r0bfouc7a';
const API_BASE = 'https://www.googleapis.com/drive/v3/files';
const FIELDS =
  'nextPageToken,files(id,name,mimeType,thumbnailLink,modifiedTime,imageMediaMetadata)';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const API_KEY = process.env.DRIVE_API_KEY;
if (!API_KEY) {
  console.error(
    'ERROR: Set DRIVE_API_KEY in env. Create one at console.cloud.google.com\n' +
    '       → APIs & Services → Credentials → Create credentials → API key.\n' +
    '       Restrict it to Google Drive API for safety. The key can be revoked\n' +
    '       after this script finishes — the Drive folder is frozen.',
  );
  process.exit(1);
}

async function listChildren(folderId) {
  const out = [];
  let pageToken = null;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      key: API_KEY,
      fields: FIELDS,
      pageSize: '1000',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive API ${res.status} listing ${folderId}: ${text}`);
    }
    const json = await res.json();
    out.push(...(json.files ?? []));
    pageToken = json.nextPageToken ?? null;
  } while (pageToken);
  return out;
}

async function listPhotosRecursive(folderId) {
  const photos = [];
  const queue = [folderId];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = await listChildren(current);
    for (const child of children) {
      if (child.mimeType === FOLDER_MIME) {
        queue.push(child.id);
      } else if (typeof child.mimeType === 'string' && child.mimeType.startsWith('image/')) {
        photos.push(extractPhotoMeta(child));
      }
      // Non-image, non-folder files (videos, docs, etc.) are intentionally
      // skipped — this is a photo album site.
    }
  }
  return photos;
}

async function buildManifest() {
  console.error(`Listing root folder ${ROOT_FOLDER_ID}...`);
  const rootChildren = await listChildren(ROOT_FOLDER_ID);

  // Sort by folder name so "14" lands before "14a" — mergeFolders takes the
  // first-seen name as the display name.
  rootChildren.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const rawAlbums = [];
  for (const child of rootChildren) {
    if (child.mimeType !== FOLDER_MIME) continue;
    const albumId = extractAlbumNumber(child.name);
    if (albumId === null) {
      console.error(`  skip non-album folder: "${child.name}"`);
      continue;
    }
    process.stderr.write(`  album ${String(albumId).padStart(2, '0')} "${child.name}"... `);
    const photos = await listPhotosRecursive(child.id);
    rawAlbums.push({ id: albumId, name: child.name, folderId: child.id, photos });
    process.stderr.write(`${photos.length} photos\n`);
  }

  const merged = mergeFolders(rawAlbums);
  for (const album of merged) {
    album.photos = sortPhotosByFilename(album.photos);
    const { countries, primary } = assignAlbumToCountries(album.id);
    album.countries = countries;
    album.primary = primary;
  }
  merged.sort((a, b) => a.id - b.id);

  const countriesOut = COUNTRIES.map((c) => ({
    code: c.code,
    he: c.he,
    en: c.en,
    primaryAlbums: merged.filter((a) => a.primary === c.code).map((a) => a.id),
  }));

  return {
    rootFolderId: ROOT_FOLDER_ID,
    generatedAt: new Date().toISOString(),
    counts: {
      albums: merged.length,
      photos: merged.reduce((s, a) => s + a.photos.length, 0),
      sourceFolders: rawAlbums.length,
    },
    countries: countriesOut,
    albums: merged,
  };
}

const manifest = await buildManifest();

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'data');
await mkdir(outDir, { recursive: true });
const outPath = resolve(outDir, 'manifest.json');
await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.error('');
console.error(`Wrote ${outPath}`);
console.error(`  source folders: ${manifest.counts.sourceFolders}`);
console.error(`  merged albums:  ${manifest.counts.albums}`);
console.error(`  total photos:   ${manifest.counts.photos}`);
if (manifest.counts.sourceFolders !== manifest.counts.albums) {
  const merges = manifest.albums.filter((a) => a.folderIds.length > 1);
  console.error(`  merged ${merges.length} albums from multiple source folders:`);
  for (const a of merges) {
    console.error(`    album ${a.id} (${a.name}) ← ${a.folderIds.length} folders`);
  }
}
