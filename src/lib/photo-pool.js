// Photo pools for the random slideshows (M17). Each entry is
// { photo, album } so the random view can show which album/country a photo
// is from. Pure.
//
//   allPhotos(manifest)         — every photo across every album.
//   countryPhotos(manifest, code) — photos from albums in that country
//                                   (cross-country albums included).

export function allPhotos(manifest) {
  const out = [];
  for (const album of manifest?.albums ?? []) {
    for (const photo of album.photos ?? []) out.push({ photo, album });
  }
  return out;
}

export function countryPhotos(manifest, code) {
  const out = [];
  for (const album of manifest?.albums ?? []) {
    if (!Array.isArray(album.countries) || !album.countries.includes(code)) continue;
    for (const photo of album.photos ?? []) out.push({ photo, album });
  }
  return out;
}
