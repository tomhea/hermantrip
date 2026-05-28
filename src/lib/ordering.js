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
