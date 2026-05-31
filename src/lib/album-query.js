// Album lookups against the manifest. Pure — no DOM, no fetch.

import { aliasesForAlbum } from './album-slugs.js';

// Every album whose `countries` array includes the given code, sorted by
// album id ascending. Cross-country albums (e.g. album 1 = np+th) appear
// under every country they belong to. Returns a new array; never mutates
// the manifest.
export function albumsForCountry(manifest, countryCode) {
  const albums = manifest?.albums ?? [];
  return albums
    .filter((a) => Array.isArray(a.countries) && a.countries.includes(countryCode))
    .slice()
    .sort((a, b) => a.id - b.id);
}

// The next album after `currentId` within a country's ordered list (M32 /
// ask #3, "continue to next album"). Order matches the album grid
// (albumsForCountry: by id ascending). Wraps round to the first album when at
// the last. Returns the next album object, or null if the country has 0/1
// albums or the current id isn't in it.
export function nextAlbumInCountry(manifest, countryCode, currentId) {
  const list = albumsForCountry(manifest, countryCode);
  if (list.length <= 1) return null;
  const numId = typeof currentId === 'number' ? currentId : Number.parseInt(currentId, 10);
  const i = list.findIndex((a) => a.id === numId);
  if (i === -1) return null;
  return list[(i + 1) % list.length];
}

// The album with the given id, or null. Accepts numeric or string id
// (router params arrive as strings). Non-numeric strings → null.
export function albumById(manifest, id) {
  const numId = typeof id === 'number' ? id : Number.parseInt(id, 10);
  if (!Number.isInteger(numId)) return null;
  const albums = manifest?.albums ?? [];
  return albums.find((a) => a.id === numId) ?? null;
}

// Resolve a URL slug to an album within a country (M23). Matches an album
// whose `primary === code` (canonical URLs live under the primary country)
// where the slug equals the album's canonical `slug` OR one of its aliases.
// Returns { album, isAlias } or null. `isAlias` true ⇒ caller should redirect
// to the canonical URL.
export function albumBySlug(manifest, code, slug) {
  if (!manifest || !code || !slug) return null;
  const albums = manifest.albums ?? [];
  // Exact canonical match first.
  const canonical = albums.find((a) => a.primary === code && a.slug === slug);
  if (canonical) return { album: canonical, isAlias: false };
  // Alias match → caller redirects to the canonical URL.
  const aliased = albums.find(
    (a) => a.primary === code && aliasesForAlbum(a.id).includes(slug),
  );
  if (aliased) return { album: aliased, isAlias: true };
  return null;
}
