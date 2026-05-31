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

// Resolve a URL slug to an album within a country (M23; multi-country fix M51).
// Matches an album that BELONGS to `code` (i.e. `code` is in its `countries`)
// where the slug equals the album's canonical `slug` OR one of its aliases.
// Returns { album, isAlias } or null. `isAlias` true ⇒ caller should redirect
// to the canonical URL (within the same country).
//
// A cross-country album (e.g. album 1 = np+th) is therefore a first-class page
// under EVERY country it belongs to — /nepal/bangkok-kathmandu AND
// /thailand/bangkok-kathmandu both resolve as canonical (#8). Matching on
// `a.primary === code` (the old M23 rule) 404'd every non-primary country.
export function albumBySlug(manifest, code, slug) {
  if (!manifest || !code || !slug) return null;
  const albums = manifest.albums ?? [];
  // An album belongs to `code` if `code` is in its countries[]; fall back to
  // the primary for any manifest entry lacking a countries array.
  const inCountry = (a) => (Array.isArray(a.countries)
    ? a.countries.includes(code)
    : a.primary === code);
  // Exact canonical match first.
  const canonical = albums.find((a) => inCountry(a) && a.slug === slug);
  if (canonical) return { album: canonical, isAlias: false };
  // Alias match → caller redirects to the canonical URL (same country).
  const aliased = albums.find(
    (a) => inCountry(a) && aliasesForAlbum(a.id).includes(slug),
  );
  if (aliased) return { album: aliased, isAlias: true };
  return null;
}
