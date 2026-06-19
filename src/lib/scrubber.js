// src/lib/scrubber.js
// Build the timeline scrubber: a chronological list of coloured segments.
// Input: timeline buckets (from buildTimeline), chronological. Each bucket's
// photos carry album.primary + album.countries. Output: [{country,color,weight}]
// — proportional to photo-days, recurring countries repeat, multi-country
// albums split per country (display order via SHARED_ORDER), adjacent
// same-country segments merged.
//
// Pure logic — no DOM, no fetch.
import { countryColor } from './country-colors.js';

// Display order for shared albums where it differs from COUNTRY_ORDER.
// Keyed by sorted member set. (Album 37: china+australia+thailand → cn,th,au.)
const SHARED_ORDER = {
  'au,cn,th': ['cn', 'th', 'au'],
  'np,th': ['th', 'np'],
};

// An album's display countries: single-country → [primary]; cross-country
// albums (countries>1) split per country in display order (SHARED_ORDER).
function albumCountries(album) {
  if (!album) return [];
  const set = album.countries && album.countries.length > 1 ? album.countries : [album.primary];
  if (set.length === 1) return set;
  const key = [...set].sort().join(',');
  return SHARED_ORDER[key] || set;
}

export function buildScrubberSegments(timeline) {
  if (!Array.isArray(timeline)) return [];
  // Aggregate photos per ALBUM across all of its (possibly interleaved) days,
  // remembering each album's first chronological appearance. Building the
  // journey per-album — not per-day — means a multi-day or interleaved album is
  // ONE period (no per-day sliver-flicker), while a country that genuinely
  // recurs as a SEPARATE album (Thailand at the Bangkok stopover, album 19,
  // album 37, the 77–88 leg) still repeats at its real spot.
  const albums = new Map(); // album → { album, weight, order }
  let order = 0;
  for (const bucket of timeline) {
    for (const { album } of bucket.photos) {
      if (!album) continue;
      let rec = albums.get(album);
      if (!rec) { rec = { album, weight: 0, order: order += 1 }; albums.set(album, rec); }
      rec.weight += 1;
    }
  }
  const ordered = [...albums.values()].sort((a, b) => a.order - b.order);

  const raw = [];
  for (const { album, weight } of ordered) {
    const countries = albumCountries(album);
    if (countries.length === 0) continue;
    const per = weight / countries.length; // split a cross-country album's weight
    for (const code of countries) raw.push({ country: code, weight: per });
  }
  // Merge adjacent same-country (so a cross-country album's shared edges fold
  // into the neighbouring blocks, leaving only the "other" country's sliver).
  const merged = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.country === seg.country) last.weight += seg.weight;
    else merged.push({ country: seg.country, weight: seg.weight });
  }
  return merged.map((s) => ({ ...s, color: countryColor(s.country) }));
}

// Map a scrub position (fraction 0..1 along the scrubber) to a timeline bucket
// index, by CUMULATIVE PHOTO WEIGHT — so the tooltip date lines up with the
// visually weight-proportional segments (not a bucket-linear guess). Clamps.
// Powers the press-and-hold tooltip + release-to-jump.
export function scrubToBucketIndex(fraction, timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return 0;
  const total = timeline.reduce((s, b) => s + b.photos.length, 0);
  if (total === 0) return 0;
  const target = Math.max(0, Math.min(1, Number(fraction))) * total;
  let cum = 0;
  for (let i = 0; i < timeline.length; i += 1) {
    cum += timeline[i].photos.length;
    if (cum >= target) return i;
  }
  return timeline.length - 1;
}

// Inverse of the above: a bucket index → its fraction (0..1) along the scrubber,
// at the MIDPOINT of the bucket's cumulative-weight span. Positions the
// always-on scrubber handle to mirror the current scroll position. Clamps.
export function bucketToScrubFraction(idx, timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return 0;
  const total = timeline.reduce((s, b) => s + b.photos.length, 0);
  if (total === 0) return 0;
  const i = Math.max(0, Math.min(timeline.length - 1, Math.round(Number(idx) || 0)));
  let before = 0;
  for (let k = 0; k < i; k += 1) before += timeline[k].photos.length;
  const mid = before + timeline[i].photos.length / 2;
  return Math.max(0, Math.min(1, mid / total));
}
