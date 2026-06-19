// Timeline view (M20; lazy-hydrated in M25).
//
// Renders a chronological feed of ALL trip photos grouped by day. Every day
// is rendered up front as a lightweight SHELL (date heading + count + an
// empty, min-height photo-strip placeholder). main.js attaches an
// IntersectionObserver that hydrates a day's photos (via dayStripHTML) once
// it has been on screen for ~0.5s. This keeps the whole timeline scrollable
// and slider-addressable end-to-end without rendering thousands of <img> at
// once (replaces the old PAGE_SIZE "load more" pagination, which stopped the
// slider past the first page).
//
// Pure HTML-string builder.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { slidePath } from '../lib/paths.js';
import { slideIndexInAlbum } from '../lib/album-query.js';
import { icon } from '../lib/nav-icons.js';
import { COUNTRIES } from '../lib/countries.js';
import { motifDefs, motifFill } from '../lib/country-motifs.js';

const COUNTRY_HE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.he]));

// Span of the trip in days (first → last dated bucket), for the header subtitle.
function daysCovered(timeline) {
  const keys = timeline.map((b) => b.key).filter(Boolean).sort();
  if (keys.length === 0) return timeline.length;
  const d0 = new Date(keys[0]);
  const d1 = new Date(keys[keys.length - 1]);
  return Math.round((d1 - d0) / 86400000) + 1;
}

// The textured chronological scrubber: one coloured, motif-filled segment per
// country run, sized by weight. main.js sets data-orient (bar vs rail) + wires
// the press/hold tooltip + jump. Returns '' when there are no segments.
function renderScrubber(segments) {
  if (!segments || segments.length === 0) return '';
  const segs = segments.map((s, i) => {
    const label = COUNTRY_HE[s.country] || s.country;
    return `
      <div class="tl-seg" data-seg="${i}" data-country="${escapeHTML(s.country)}"
           style="flex-grow:${s.weight}; background:${s.color}" title="${escapeHTML(label)}">
        <svg class="tl-seg-tex" preserveAspectRatio="none" aria-hidden="true"><rect width="100%" height="100%" fill="${motifFill(s.country)}"></rect></svg>
      </div>`;
  }).join('');
  return `
    <svg class="tl-motif-defs" width="0" height="0" aria-hidden="true">${motifDefs()}</svg>
    <div class="tl-scrubber" data-orient="bar" role="presentation" aria-hidden="true">
      ${segs}
    </div>
    <div class="tl-tip" role="status" hidden></div>
  `;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Render a single photo thumbnail within a day bucket.
function photoThumb({ photo, album }, dpr) {
  const src = imageUrl(photo.id, 'thumb', { dpr });
  // Link to the EXACT photo's slide (#1), not the album top — its position in
  // the album's date-sorted order, matching the grid/slideshow indexing.
  const href = slidePath(album.primary, album.slug, slideIndexInAlbum(album, photo.id));
  return `
    <a class="tl-thumb-link" href="${href}" title="${escapeHTML(album.title || album.name)}">
      <img class="tl-thumb" src="${src}" alt="" loading="lazy" decoding="async"
           onerror="this.classList.add('tl-thumb-broken')">
    </a>
  `;
}

// Inner HTML of a day's photo strip (album tags + thumbnails). Called by
// main.js to HYDRATE a shell when it scrolls into view.
export function dayStripHTML(bucket, dpr) {
  let lastAlbumId = null;
  return bucket.photos.map(({ photo, album }) => {
    let albumTag = '';
    if (album.id !== lastAlbumId) {
      lastAlbumId = album.id;
      albumTag = `<span class="tl-album-tag">${escapeHTML(album.title || album.name)}</span>`;
    }
    return albumTag + photoThumb({ photo, album }, dpr);
  }).join('');
}

// One day SHELL: heading + count + EMPTY strip placeholder carrying its
// bucket index (so the observer + slider can address it). The strip is
// hydrated lazily; its CSS min-height keeps page height roughly stable.
function dayShell(bucket, index) {
  const label = escapeHTML(bucket.label || 'תאריך לא ידוע');
  return `
    <section class="tl-day" data-bucket-index="${index}" aria-label="${label}">
      <h2 class="tl-day-heading">${label}
        <span class="tl-day-count">${bucket.photos.length} תמונות</span>
      </h2>
      <div class="tl-photo-strip" data-bucket-index="${index}"></div>
    </section>
  `;
}

export function renderTimeline({ manifest, error, timeline, segments, dpr }) {
  if (error) return errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
  if (!manifest || !timeline) return loadingHTML();
  if (timeline.length === 0) {
    return `<p class="muted" style="padding:2rem;text-align:center">אין תמונות להצגה.</p>`;
  }

  const total = timeline.length;
  const firstLabel = escapeHTML(timeline[0].label || '');
  const lastLabel = escapeHTML(timeline[total - 1].label || '');
  const days = daysCovered(timeline);

  return `
    <div class="tl-page">
      <!-- Date slider FIRST so it's pinned at the very top (top:0) from scroll
           0 and never shifts (#1a). The back/title header sits below it and
           scrolls away. Slider is visually reversed (RTL) so the trip START
           (value 0) sits on the RIGHT (M25). -->
      <div class="tl-slider-wrap" aria-label="ניווט מהיר בציר הזמן">
        <span class="tl-slider-edge tl-slider-start" aria-hidden="true">${firstLabel}</span>
        <input type="range" id="tl-slider" class="tl-slider"
               min="0" max="${total - 1}" value="0" step="1"
               aria-label="בחר תאריך" aria-valuetext="${firstLabel}">
        <span class="tl-slider-edge tl-slider-end" aria-hidden="true">${lastLabel}</span>
        <output for="tl-slider" id="tl-slider-label" class="tl-slider-label">${firstLabel}</output>
      </div>
      ${renderScrubber(segments)}
      <header class="tl-header">
        <a class="tl-back" href="/">← חזרה</a>
        <h1 class="tl-title">ציר זמן <span class="tl-sub">${days} ימים · שנה אחת</span></h1>
        <button type="button" class="slim-nav slim-toggle" data-theme-toggle aria-label="מצב בהיר/כהה">${icon('moon')}${icon('sun')}</button>
      </header>
      <div class="tl-feed" id="tl-feed">
        ${timeline.map((b, i) => dayShell(b, i)).join('')}
      </div>
    </div>
  `;
}
