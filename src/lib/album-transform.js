// Manifest presentation transform (M13). Applied once at load — pure, so
// the raw manifest stays untouched and the rules live in code (testable).
//
// Two jobs:
//   1. Clean DISPLAY titles: every album gets a `title` = the place part of
//      its Drive name (number prefix + "country - " stripped via albumPlace),
//      unless an explicit override is set.
//   2. Merge configured album groups into one album (combine photos, keep the
//      lowest id, drop the others) and apply custom titles.
//
// Album NAMES in the raw manifest are kept as-is; views render `title`.

import { albumPlace } from './album-place.js';
import { correctPhotoDate } from './date-fixes.js';

// Merge groups: the albums in `ids` collapse into `into` (kept id), photos
// concatenated in id order, with the given title.
const MERGES = [
  { into: 3, ids: [3, 4], title: 'טרק פון היל' }, // Nepal trek part 1 + 2
];
// Standalone renames (no merge).
const TITLES = {
  14: 'באגסו',   // India (already merged 14+14a in M1)
  19: 'בנגקוק',  // Thailand
};

export function transformManifest(manifest) {
  // Clone albums (shallow per album + fresh photos array) so we never mutate
  // the input. Apply hand-curated photo date corrections (M16) per album as
  // we clone.
  let albums = (manifest.albums ?? []).map((a) => ({
    ...a,
    photos: a.photos.map((p) => correctPhotoDate(p, a.id)),
  }));

  const removedIds = new Set();
  for (const merge of MERGES) {
    const target = albums.find((a) => a.id === merge.into);
    if (!target) continue;
    // Combine photos from every id in the group (in id order), then mark the
    // non-target ids for removal.
    const combined = [];
    const countries = new Set();
    for (const id of [...merge.ids].sort((x, y) => x - y)) {
      const al = albums.find((a) => a.id === id);
      if (!al) continue;
      combined.push(...al.photos);
      (al.countries ?? []).forEach((c) => countries.add(c));
      if (id !== merge.into) removedIds.add(id);
    }
    target.photos = combined;
    target.title = merge.title;
    target.countries = [...countries];
  }

  albums = albums.filter((a) => !removedIds.has(a.id));

  // Assign display titles: explicit override, else merge-set title, else the
  // cleaned place name (number + "country - " prefix stripped).
  for (const a of albums) {
    if (TITLES[a.id]) a.title = TITLES[a.id];
    else if (!a.title) a.title = albumPlace(a.name);
  }

  // Drop absorbed ids from each country's primaryAlbums.
  const countries = (manifest.countries ?? []).map((c) => ({
    ...c,
    primaryAlbums: (c.primaryAlbums ?? []).filter((id) => !removedIds.has(id)),
  }));

  const counts = {
    ...(manifest.counts ?? {}),
    albums: albums.length,
  };

  return { ...manifest, countries, albums, counts };
}
