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
import { albumPath } from '../lib/paths.js';

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

export function renderTimeline({ manifest, error, timeline, dpr }) {
  if (error) return errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
  if (!manifest || !timeline) return loadingHTML();
  if (timeline.length === 0) {
    return `<p class="muted" style="padding:2rem;text-align:center">אין תמונות להצגה.</p>`;
  }

  const total = timeline.length;
  const firstLabel = escapeHTML(timeline[0].label || '');
  const lastLabel = escapeHTML(timeline[total - 1].label || '');

  return `
    <div class="tl-page">
      <header class="tl-header">
        <a class="tl-back" href="/">← חזרה</a>
        <h1 class="tl-title">ציר זמן</h1>
      </header>
      <!-- Date slider — jump to any day. Visually reversed (RTL) so the
           trip START (value 0) sits on the RIGHT (M25). -->
      <div class="tl-slider-wrap" aria-label="ניווט מהיר בציר הזמן">
        <span class="tl-slider-edge tl-slider-start" aria-hidden="true">${firstLabel}</span>
        <input type="range" id="tl-slider" class="tl-slider"
               min="0" max="${total - 1}" value="0" step="1"
               aria-label="בחר תאריך" aria-valuetext="${firstLabel}">
        <span class="tl-slider-edge tl-slider-end" aria-hidden="true">${lastLabel}</span>
        <output for="tl-slider" id="tl-slider-label" class="tl-slider-label">${firstLabel}</output>
      </div>
      <div class="tl-feed" id="tl-feed">
        ${timeline.map((b, i) => dayShell(b, i)).join('')}
      </div>
    </div>
  `;
}
