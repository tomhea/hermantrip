// Slideshow view: #/album/{id}/slide/{idx} → one photo, fullscreen.
//
// Pure HTML-string builder. Prev/next are plain <a href> to neighbour
// slide indices (wrapping), so click-zone navigation needs no JS. The
// root carries data-next / data-prev / data-exit attributes that main.js
// reads to wire keyboard + swipe via slideshow-nav's pure mappers.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { albumById } from '../lib/album-query.js';
import { sortPhotosByDate } from '../lib/ordering.js';
import { imageUrl } from '../lib/image-url.js';
import { clampIndex, nextIndex, prevIndex } from '../lib/slideshow-nav.js';
import { speedLabel } from '../lib/slideshow-speed.js';
import { albumPlace } from '../lib/album-place.js';
import { formatHebrewDate, hebrewWeekday, formatClock } from '../lib/photo-date.js';
import { COUNTRIES } from '../lib/countries.js';
import { homePath, albumPath, slidePath } from '../lib/paths.js';

const COUNTRY_HE = new Map(COUNTRIES.map((c) => [c.code, c.he]));

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Info panel: date · weekday · time · country · place · album · position.
// Rendered inside a <details> so the toggle needs no JS.
function infoPanel(album, photo, i, total) {
  const countries = (album.countries || [])
    .map((c) => COUNTRY_HE.get(c)).filter(Boolean).join(' · ');
  const place = album.title ?? albumPlace(album.name);
  const date = formatHebrewDate(photo.capturedAt);
  const wd = hebrewWeekday(photo.capturedAt);
  const clock = formatClock(photo.capturedAt);
  const row = (label, value) => (value
    ? `<div class="info-row"><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`
    : '');
  return `
    <details class="slideshow-info">
      <summary aria-label="פרטי התמונה" title="פרטים">ⓘ</summary>
      <dl class="info-body">
        ${row('תאריך', [wd, date].filter(Boolean).join(', '))}
        ${row('שעה', clock)}
        ${row('מדינה', countries)}
        ${row('מקום', place)}
        ${row('אלבום', album.title ?? album.name)}
        <div class="info-row"><dt>תמונה</dt><dd dir="ltr">${i + 1} / ${total}</dd></div>
        ${row('קובץ', photo.name)}
      </dl>
    </details>
  `;
}

export function renderSlideshow({ manifest, error, code, id, idx, dpr = 1, viewport = 'phone', autoplay = false, speed = 4000 }) {
  if (error) {
    return `<div class="slideshow-shell">${errorHTML('לא הצלחנו לטעון את התמונה. נסו לרענן.')}</div>`;
  }
  if (!manifest) {
    return `<div class="slideshow-shell">${loadingHTML()}</div>`;
  }

  const album = albumById(manifest, id);
  if (!album) {
    return `
      <div class="slideshow-shell">
        <p class="muted">האלבום המבוקש לא נמצא. <a href="${homePath()}">חזרה לדף הבית</a>.</p>
      </div>
    `;
  }

  // Keep navigation in the country we came from (URL context); fall back to
  // the album's primary country.
  const navCode = code || album.primary;
  const exitHref = albumPath(navCode, album.slug);
  const photos = sortPhotosByDate(album.photos);
  if (photos.length === 0) {
    return `
      <div class="slideshow-shell">
        <p class="muted">אין תמונות באלבום זה. <a href="${exitHref}">חזרה לאלבום</a>.</p>
      </div>
    `;
  }

  const i = clampIndex(idx, photos.length);
  const photo = photos[i];
  const nextHref = slidePath(navCode, album.slug, nextIndex(i, photos.length));
  const prevHref = slidePath(navCode, album.slug, prevIndex(i, photos.length));
  const src = imageUrl(photo.id, 'slide', { dpr, viewport });
  // Same-origin /img/ proxy can't be ORB-blocked; onerror just shows the
  // placeholder on a genuine miss.
  const onerror = "this.classList.add('photo-broken')";

  const counter = `${i + 1} / ${photos.length}`;

  // Autoplay toggle: ▶ when paused, ❚❚ when playing. main.js reads
  // data-autoplay-toggle to wire the click and data-autoplay-on to know
  // whether to (re)start the advance timer after each slide render.
  const playGlyph = autoplay ? '❚❚' : '▶';
  const playLabel = autoplay ? 'השהיית מצגת' : 'הפעלת מצגת';
  const downloadHref = imageUrl(photo.id, 'download');

  return `
    <div class="slideshow-shell" data-slideshow
         data-next="${nextHref}" data-prev="${prevHref}" data-exit="${exitHref}"
         data-autoplay-on="${autoplay ? 'true' : 'false'}" data-speed="${speed}">
      <div class="slideshow-stage">
        <img class="slideshow-photo" src="${src}" alt="${escapeHTML(album.title ?? album.name)} — ${i + 1}"
             decoding="async" fetchpriority="high" onerror="${onerror}">
        <a class="slideshow-zone slideshow-zone-next" href="${nextHref}" aria-label="התמונה הבאה"></a>
        <a class="slideshow-zone slideshow-zone-prev" href="${prevHref}" aria-label="התמונה הקודמת"></a>
      </div>
      <div class="slideshow-bar">
        <a class="slideshow-close" href="${exitHref}" aria-label="סגירה וחזרה לאלבום">✕</a>
        <button type="button" class="slideshow-play" data-autoplay-toggle
                aria-label="${playLabel}" aria-pressed="${autoplay ? 'true' : 'false'}">${playGlyph}</button>
        <button type="button" class="slideshow-speed-btn" data-speed-toggle
                aria-label="מהירות מצגת">${escapeHTML(speedLabel(speed))}</button>
        <button type="button" class="slideshow-fs" data-fullscreen-toggle
                aria-label="מסך מלא">⛶</button>
        <a class="slideshow-dl" href="${downloadHref}" download="${escapeHTML(photo.name)}"
           aria-label="הורדת התמונה המקורית">⬇</a>
        ${infoPanel(album, photo, i, photos.length)}
        <span class="slideshow-counter" dir="ltr">${counter}</span>
      </div>
    </div>
  `;
}
