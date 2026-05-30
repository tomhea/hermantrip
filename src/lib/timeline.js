// Timeline logic (M20).
//
// Groups all photos from all albums by day (using capturedAt) and returns a
// sorted list of day-buckets for the timeline view.
//
// Pure logic — no DOM, no fetch.

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// Parse a naive ISO date string "YYYY-MM-DDTHH:MM:SS" → Date (UTC treated as local).
// Returns null for null/undefined/invalid.
export function parseDate(capturedAt) {
  if (!capturedAt) return null;
  const m = String(capturedAt).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Format a Date as a Hebrew day label, e.g. "15 במרץ 2011".
export function formatDayHe(date) {
  if (!date) return null;
  return `${date.getDate()} ב${MONTHS_HE[date.getMonth()]} ${date.getFullYear()}`;
}

// Derive a sortable day-key string "YYYY-MM-DD" from a capturedAt string.
export function dayKey(capturedAt) {
  if (!capturedAt) return null;
  const m = String(capturedAt).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// Build a timeline: an array of day-buckets sorted chronologically.
// Each bucket: { key: "YYYY-MM-DD", label: "15 במרץ 2011", photos: [{photo,album}] }
//
// - All albums in the manifest are included (including cross-country).
// - Photos without a date go into a special bucket at the end (key: null).
export function buildTimeline(manifest) {
  if (!manifest || !Array.isArray(manifest.albums)) return [];

  const buckets = new Map(); // key → { key, label, photos: [] }
  const undated = [];

  for (const album of manifest.albums) {
    for (const photo of album.photos) {
      const k = dayKey(photo.capturedAt);
      if (!k) {
        undated.push({ photo, album });
        continue;
      }
      if (!buckets.has(k)) {
        const date = parseDate(photo.capturedAt);
        buckets.set(k, { key: k, label: formatDayHe(date), photos: [] });
      }
      buckets.get(k).photos.push({ photo, album });
    }
  }

  // Sort chronologically.
  const sorted = [...buckets.values()].sort((a, b) => a.key < b.key ? -1 : 1);

  // Append undated bucket last (if any).
  if (undated.length > 0) {
    sorted.push({ key: null, label: 'תאריך לא ידוע', photos: undated });
  }

  return sorted;
}

// Total photo count across all buckets.
export function timelinePhotoCount(timeline) {
  return timeline.reduce((s, b) => s + b.photos.length, 0);
}
