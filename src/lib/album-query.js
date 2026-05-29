// Album lookups against the manifest. Pure — no DOM, no fetch.

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

// The album with the given id, or null. Accepts numeric or string id
// (router params arrive as strings). Non-numeric strings → null.
export function albumById(manifest, id) {
  const numId = typeof id === 'number' ? id : Number.parseInt(id, 10);
  if (!Number.isInteger(numId)) return null;
  const albums = manifest?.albums ?? [];
  return albums.find((a) => a.id === numId) ?? null;
}
