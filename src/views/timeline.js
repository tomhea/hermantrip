// Timeline view (M20).
//
// Renders a chronological feed of all trip photos grouped by day.
// Virtual rendering: only the first PAGE_SIZE day-buckets are rendered;
// a "load more" button appends the next batch (no IntersectionObserver
// complexity — simple and accessible).
//
// Pure HTML-string builder; main.js mounts it and wires the load-more
// button after rendering.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { albumPath } from '../lib/paths.js';
import { COUNTRIES } from '../lib/countries.js';

const PAGE_SIZE = 10; // day-buckets per page

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Render a single photo thumbnail within a day bucket.
function photoThumb({ photo, album }, dpr) {
  const src = imageUrl(photo.id, 'thumb', { dpr });
  const href = albumPath(album.primary, album.slug);
  return `
    <a class="tl-thumb-link" href="${href}" title="${escapeHTML(album.title || album.name)}">
      <img class="tl-thumb" src="${src}" alt="" loading="lazy" decoding="async"
           onerror="this.classList.add('tl-thumb-broken')">
    </a>
  `;
}

// Render one day-bucket (the heading + photo strip).
function dayBucket(bucket, dpr) {
  const label = escapeHTML(bucket.label || 'תאריך לא ידוע');
  // Show album name changes within the day.
  let lastAlbumId = null;
  const items = bucket.photos.map(({ photo, album }) => {
    let albumTag = '';
    if (album.id !== lastAlbumId) {
      lastAlbumId = album.id;
      albumTag = `<span class="tl-album-tag">${escapeHTML(album.title || album.name)}</span>`;
    }
    return albumTag + photoThumb({ photo, album }, dpr);
  }).join('');

  return `
    <section class="tl-day" aria-label="${label}">
      <h2 class="tl-day-heading">${label}
        <span class="tl-day-count">${bucket.photos.length} תמונות</span>
      </h2>
      <div class="tl-photo-strip">${items}</div>
    </section>
  `;
}

export function renderTimeline({ manifest, error, timeline, page, dpr }) {
  if (error) return errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
  if (!manifest || !timeline) return loadingHTML();
  if (timeline.length === 0) {
    return `<p class="muted" style="padding:2rem;text-align:center">אין תמונות להצגה.</p>`;
  }

  const shown = timeline.slice(0, (page || 1) * PAGE_SIZE);
  const remaining = timeline.length - shown.length;
  const total = timeline.length;
  const firstLabel = escapeHTML(timeline[0].label || '');
  const lastLabel  = escapeHTML(timeline[total - 1].label || '');

  return `
    <div class="tl-page">
      <header class="tl-header">
        <a class="tl-back" href="/">← חזרה</a>
        <h1 class="tl-title">ציר זמן</h1>
      </header>
      <!-- Date slider — lets users jump to any day directly (M22) -->
      <div class="tl-slider-wrap" aria-label="ניווט מהיר בציר הזמן">
        <span class="tl-slider-edge tl-slider-start" aria-hidden="true">${firstLabel}</span>
        <input type="range" id="tl-slider" class="tl-slider"
               min="0" max="${total - 1}" value="0" step="1"
               aria-label="בחר תאריך" aria-valuetext="${firstLabel}">
        <span class="tl-slider-edge tl-slider-end" aria-hidden="true">${lastLabel}</span>
        <output for="tl-slider" id="tl-slider-label" class="tl-slider-label">${firstLabel}</output>
      </div>
      <div class="tl-feed" id="tl-feed">
        ${shown.map((b) => dayBucket(b, dpr)).join('')}
      </div>
      ${remaining > 0
        ? `<div class="tl-more-wrap">
            <button class="tl-more-btn" data-tl-more="${shown.length}" aria-label="טען עוד ימים">
              עוד ${remaining} ימים
            </button>
           </div>`
        : ''}
    </div>
  `;
}

export { PAGE_SIZE };
