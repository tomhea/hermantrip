// Groups an album's photos into day buckets for the album grid (M14).
// Assumes the input is already chronologically sorted (sortPhotosByDate),
// so each day is one contiguous run. Returns
//   [{ date: 'YYYY-MM-DD' | null, photos: [...] }, ...]
// with `date` null for photos lacking EXIF capture time. The view formats
// `date` into a Hebrew header. Pure.

export function groupPhotosByDay(photos) {
  const groups = [];
  let cur = null;
  for (const p of photos) {
    const date = (typeof p.capturedAt === 'string' && p.capturedAt.length >= 10)
      ? p.capturedAt.slice(0, 10)
      : null;
    if (!cur || cur.date !== date) {
      cur = { date, photos: [] };
      groups.push(cur);
    }
    cur.photos.push(p);
  }
  return groups;
}
