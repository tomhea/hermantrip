// Random slideshow view (M17): plays a shuffled photo playlist that spans
// many albums. Reuses the slideshow chrome (same CSS classes) but, because
// there's no per-photo URL, navigation is JS-driven — zones/keyboard/swipe/
// autoplay advance an in-memory playlist (main.js), so the prev/next zones
// are <button data-nav> and the shell carries data-random instead of
// data-next/-prev hrefs.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { albumPlace } from '../lib/album-place.js';
import { speedLabel } from '../lib/slideshow-speed.js';
import { formatHebrewDate, hebrewWeekday, formatClock } from '../lib/photo-date.js';
import { COUNTRIES } from '../lib/countries.js';
import { albumPath } from '../lib/paths.js';

const COUNTRY_HE = new Map(COUNTRIES.map((c) => [c.code, c.he]));

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function infoPanel(album, photo) {
  const countries = (album.countries || []).map((c) => COUNTRY_HE.get(c)).filter(Boolean).join(' · ');
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
        ${row('קובץ', photo.name)}
      </dl>
    </details>
  `;
}

export function renderRandomShow({
  manifest, item, scope, autoplay = false, speed = 4000, dpr = 1, viewport = 'phone',
  error, exitHref = '/',
}) {
  if (error) {
    return `<div class="slideshow-shell">${errorHTML('לא הצלחנו לטעון את התמונות. נסו לרענן.')}</div>`;
  }
  if (!manifest) {
    return `<div class="slideshow-shell">${loadingHTML()}</div>`;
  }
  if (!item || !item.photo) {
    return `
      <div class="slideshow-shell">
        <p class="muted">אין תמונות להצגה. <a href="${escapeHTML(exitHref)}">חזרה</a>.</p>
      </div>
    `;
  }

  const { photo, album } = item;
  const src = imageUrl(photo.id, 'slide', { dpr, viewport });
  const onerror = "this.classList.add('photo-broken')";
  const playGlyph = autoplay ? '❚❚' : '▶';
  const playLabel = autoplay ? 'השהיית מצגת' : 'הפעלת מצגת';
  const downloadHref = imageUrl(photo.id, 'download');
  // The bar shows the source album (links to it) since a random photo's
  // position has no meaning.
  const albumTitle = album.title ?? albumPlace(album.name);
  const albumHref = albumPath(album.primary, album.slug);

  return `
    <div class="slideshow-shell" data-slideshow data-random="${escapeHTML(scope)}"
         data-exit="${escapeHTML(exitHref)}"
         data-autoplay-on="${autoplay ? 'true' : 'false'}" data-speed="${speed}">
      <div class="slideshow-stage">
        <img class="slideshow-photo" src="${src}" alt="${escapeHTML(albumTitle)}"
             decoding="async" fetchpriority="high" onerror="${onerror}">
        <button type="button" class="slideshow-zone slideshow-zone-next" data-nav="next" aria-label="תמונה אקראית הבאה"></button>
        <button type="button" class="slideshow-zone slideshow-zone-prev" data-nav="prev" aria-label="התמונה הקודמת"></button>
      </div>
      <div class="slideshow-bar">
        <a class="slideshow-close" href="${escapeHTML(exitHref)}" aria-label="סגירה">✕</a>
        <button type="button" class="slideshow-play" data-autoplay-toggle
                aria-label="${playLabel}" aria-pressed="${autoplay ? 'true' : 'false'}">${playGlyph}</button>
        <button type="button" class="slideshow-speed-btn" data-speed-toggle
                aria-label="מהירות מצגת">${escapeHTML(speedLabel(speed))}</button>
        <button type="button" class="slideshow-fs" data-fullscreen-toggle aria-label="מסך מלא">⛶</button>
        <a class="slideshow-dl" href="${downloadHref}" download="${escapeHTML(photo.name)}"
           aria-label="הורדת התמונה המקורית">⬇</a>
        ${infoPanel(album, photo)}
        <a class="slideshow-title" href="${albumHref}">${escapeHTML(albumTitle)}</a>
      </div>
    </div>
  `;
}
