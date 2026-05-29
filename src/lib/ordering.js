// Photo ordering within an album.
//
// Spec (docs/spec.md): photos sorted lexicographically by filename. Pure
// string comparison — codepoint-by-codepoint, case-sensitive — so that
// IMG_010 < IMG_2 (because '0' < '2' at position 4) and uppercase 'A'
// sorts before lowercase 'b'. NOT a numeric/natural sort.

export function sortPhotosByFilename(photos) {
  return [...photos].sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

// Chronological order by EXIF capture time (M14) — the album grid groups
// by day and the slideshow advances in this same order, so day groups are
// contiguous and grid↔slide indices stay aligned. Photos with a capturedAt
// sort before undated ones; ties (and undated photos) fall back to filename
// order (preserving the old behavior for albums without EXIF). Stable +
// non-mutating.
export function sortPhotosByDate(photos) {
  return photos
    .map((p, i) => [p, i])
    .sort(([a, ai], [b, bi]) => {
      const ca = a.capturedAt;
      const cb = b.capturedAt;
      if (ca && cb) {
        if (ca < cb) return -1;
        if (ca > cb) return 1;
      } else if (ca && !cb) {
        return -1; // dated before undated
      } else if (!ca && cb) {
        return 1;
      }
      // tie / both undated → filename, then original index for stability
      const an = a.name ?? '';
      const bn = b.name ?? '';
      if (an < bn) return -1;
      if (an > bn) return 1;
      return ai - bi;
    })
    .map(([p]) => p);
}
