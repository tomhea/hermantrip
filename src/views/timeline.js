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

// The textured chronological scrubber — the timeline's sole navigator (M69.1,
// replaces the old date slider). One coloured, motif-filled segment per country
// run, sized by weight, plus an always-on position handle. main.js sets
// data-orient (bar vs rail), scroll-syncs the handle, and wires
// press/hold/keyboard → tooltip → jump. `total` = bucket count (for aria).
function renderScrubber(segments, total) {
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
    <div class="tl-scrubber" data-orient="bar" role="slider" tabindex="0"
         aria-label="ציר זמן — גררו, הקישו או השתמשו במקשי החצים כדי לקפוץ לתאריך"
         aria-valuemin="0" aria-valuemax="${Math.max(0, total - 1)}" aria-valuenow="0">
      ${segs}
      <div class="tl-scrubber-handle" aria-hidden="true"></div>
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

  return `
    <div class="tl-page">
      <!-- The textured scrubber is the navigator (M69.1, replaced the old date
           slider). Rendered FIRST so on desktop/landscape it sticks at top:0 and
           stays visible while the header + feed scroll under it. -->
      ${renderScrubber(segments, total)}
      <header class="tl-header">
        <a class="tl-back" href="/">← חזרה</a>
        <h1 class="tl-title">ציר זמן <span class="tl-sub">365 ימים · שנה אחת</span></h1>
        <button type="button" class="slim-nav slim-toggle" data-theme-toggle aria-label="מצב בהיר/כהה">${icon('moon')}${icon('sun')}</button>
      </header>
      <div class="tl-feed" id="tl-feed">
        ${timeline.map((b, i) => dayShell(b, i)).join('')}
      </div>
    </div>
  `;
}
