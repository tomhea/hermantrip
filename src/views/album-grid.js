// Album grid view: #/album/{id} → all photos in the album, lex-ordered.
//
// Pure HTML-string builder. Photos arrive already lex-sorted in the
// manifest (build-manifest applies sortPhotosByFilename), but we re-sort
// defensively here so the view is correct regardless of manifest order.
// First EAGER_COUNT photos load eagerly; the rest use loading="lazy" so
// first paint stays within the R5 budget (≤12 images). R3-tested for
// loading / fetch-failed / unknown-album / empty paths.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { albumById, albumAfterInCountry } from '../lib/album-query.js';
import { sortPhotosByDate } from '../lib/ordering.js';
import { groupPhotosByDay } from '../lib/photo-group.js';
import { formatHebrewDate } from '../lib/photo-date.js';
import { photoImgHTML } from '../lib/photo-img.js';
import { homePath, countryPath, slidePath, albumPath } from '../lib/paths.js';
import { albumDateLabel } from '../lib/album-dates.js';

const EAGER_COUNT = 12;

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function header(title, backHref, backLabel, subtitle) {
  return `
    <header class="view-header">
      <a class="back-link" href="${escapeHTML(backHref)}" aria-label="${escapeHTML(backLabel)}">→ ${escapeHTML(backLabel)}</a>
      <h1 class="h1">${escapeHTML(title)}</h1>
      ${subtitle ? `<p class="muted small">${escapeHTML(subtitle)}</p>` : ''}
    </header>
  `;
}

export function renderAlbumGrid({ manifest, error, code, id, dpr = 1 }) {
  const home = homePath();
  if (error) {
    return `${header('אלבום', home, 'דף הבית', '')}${errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.')}`;
  }
  if (!manifest) {
    return `${header('אלבום', home, 'דף הבית', '')}${loadingHTML()}`;
  }

  const album = albumById(manifest, id);
  if (!album) {
    return `
      ${header('אלבום לא נמצא', home, 'דף הבית', '')}
      <p class="muted">האלבום המבוקש לא נמצא. <a href="${home}">חזרה לדף הבית</a>.</p>
    `;
  }

  // Back to the country we navigated from (the URL's country); fall back to
  // the album's primary country if no context was passed.
  const backCode = code || album.primary;
  const backHref = countryPath(backCode);
  // Chronological order so day groups are contiguous AND the slide index
  // (position in this list) matches what the slideshow uses.
  const photos = sortPhotosByDate(album.photos);
  const dateLabel = albumDateLabel(album.photos);
  const subtitle = dateLabel
    ? `${photos.length.toLocaleString('he-IL')} תמונות · ${dateLabel}`
    : `${photos.length.toLocaleString('he-IL')} תמונות`;

  if (photos.length === 0) {
    return `${header(album.title ?? album.name, backHref, 'חזרה', subtitle)}<p class="muted">אין תמונות באלבום זה.</p>`;
  }

  // Group by day; render a section per day with a Hebrew date header. A
  // running global index keeps slide links + eager-loading correct across
  // sections.
  let i = 0;
  const sections = groupPhotosByDay(photos).map((group) => {
    const heading = group.date ? formatHebrewDate(`${group.date}T00:00:00`) : 'ללא תאריך';
    const tiles = group.photos.map((photo) => {
      const eager = i < EAGER_COUNT;
      const img = photoImgHTML(photo, {
        intent: 'thumb',
        dpr,
        className: 'photo album-photo',
        loading: eager ? 'eager' : 'lazy',
        priority: eager ? 'high' : null,
      });
      const tile = `<li class="photo-tile"><a href="${slidePath(backCode, album.slug, i)}">${img}</a></li>`;
      i += 1;
      return tile;
    }).join('');
    return `
      <section class="day-group">
        <h2 class="day-header">${escapeHTML(heading)}</h2>
        <ul class="photo-grid" aria-label="${escapeHTML(heading)}">${tiles}</ul>
      </section>`;
  }).join('');

  // Labelled play button under the album name (#2): same data-album-play hook
  // as the country-page card button (main.js → first photo, autoplay,
  // fullscreen). slide 0 of this album.
  const name = album.title ?? album.name;
  const playBtn = `
    <button type="button" class="album-page-play" data-album-play
            data-slide-href="${slidePath(backCode, album.slug, 0)}"
            aria-label="הפעלת מצגת — ${escapeHTML(name)}">
      <span class="album-page-play-icon" aria-hidden="true">▶</span> הצג את האלבום
    </button>
  `;

  // "Next album" link at the bottom (#6): the next album within the VIEWING
  // country (backCode), so a cross-country album points to the right neighbour.
  // Hidden on the last album in the country (albumAfterInCountry → null, no wrap).
  const next = albumAfterInCountry(manifest, backCode, album.id);
  const nextBtn = next
    ? `<a class="album-next" href="${albumPath(backCode, next.slug)}">← האלבום הבא: ${escapeHTML(next.title ?? next.name)}</a>`
    : '';

  return `
    ${header(name, backHref, 'חזרה', subtitle)}
    ${playBtn}
    ${sections}
    ${nextBtn}
  `;
}
