// Hand-curated photo capture-date corrections (M16). Applied at load by
// album-transform; pure + version-controlled so the raw manifest stays
// untouched and a future rebuild won't silently lose the fixes.
//
// Two kinds:
//   PHOTO_DATE_SET   — set capturedAt for a specific photo id (e.g. PNG
//                      screenshots that carry no EXIF date).
//   ALBUM_DATE_SHIFT — within one album, rewrite the YYYY-MM-DD of photos
//                      that match `from` to `to`, preserving the time (a
//                      camera whose clock was a year off).

// 2 undated PNGs in album 6 (פארק צ'יטואן, 28–29 March 2011).
const PHOTO_DATE_SET = {
  '1shHURQWbUdWA6TJUpFRcoGTgSzMvhyEx': '2011-03-29T21:11:37',
  '17jxRQM7P2S_3Uj-f1USxJfcTEp3M0R8r': '2011-03-29T21:13:18',
};

// Album 78 (צ'יאנג מאי) — 15 photos shot 25 Jan 2012 but stamped 2011.
const ALBUM_DATE_SHIFT = [
  { album: 78, from: '2011-01-25', to: '2012-01-25' },
];

export function correctPhotoDate(photo, albumId) {
  const set = PHOTO_DATE_SET[photo.id];
  if (set) return { ...photo, capturedAt: set };

  const c = photo.capturedAt;
  if (typeof c === 'string' && c.length >= 10) {
    for (const s of ALBUM_DATE_SHIFT) {
      if (s.album === albumId && c.slice(0, 10) === s.from) {
        return { ...photo, capturedAt: s.to + c.slice(10) };
      }
    }
  }
  return photo;
}
