// Album date span from its photos' EXIF capture dates (M15). Photos without
// a capturedAt are ignored. Pure.
//
//   albumDateRange(photos) → { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } | null
//   albumDateLabel(photos) → compact Hebrew range string ('' if no dates)

import { formatDateRange } from './photo-date.js';

export function albumDateRange(photos) {
  let min = null;
  let max = null;
  for (const p of photos ?? []) {
    const c = p.capturedAt;
    if (typeof c !== 'string' || c.length < 10) continue;
    const d = c.slice(0, 10); // YYYY-MM-DD; lexical compare works for ISO
    if (min === null || d < min) min = d;
    if (max === null || d > max) max = d;
  }
  return min === null ? null : { start: min, end: max };
}

export function albumDateLabel(photos) {
  const r = albumDateRange(photos);
  return r ? formatDateRange(r.start, r.end) : '';
}
