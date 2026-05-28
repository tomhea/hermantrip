// Picks one representative photo for a country card.
//
// Strategy: scan the country's PRIMARY albums (lowest id first) and return
// the first photo of the first album that has any. So we never show a
// Thailand photo on the Australia card just because album 37 is multi-
// country, and we tolerate empty primary albums.
//
// Returns the photo record `{ id, name, ... }` or null if the country has
// no primary album with photos.

export function pickCountryThumb(manifest, countryCode) {
  const country = manifest.countries?.find((c) => c.code === countryCode);
  if (!country) return null;

  // Sort a defensive copy so we don't depend on input order.
  const primaryIds = [...(country.primaryAlbums ?? [])].sort((a, b) => a - b);
  for (const id of primaryIds) {
    const album = manifest.albums?.find((a) => a.id === id);
    if (album && Array.isArray(album.photos) && album.photos.length > 0) {
      return album.photos[0];
    }
  }
  return null;
}
