// Album grid view: #/album/{id} → all photos in the album, lex-ordered.
//
// Pure HTML-string builder. Photos arrive already lex-sorted in the
// manifest (build-manifest applies sortPhotosByFilename), but we re-sort
// defensively here so the view is correct regardless of manifest order.
// First EAGER_COUNT photos load eagerly; the rest use loading="lazy" so
// first paint stays within the R5 budget (≤12 images). R3-tested for
// loading / fetch-failed / unknown-album / empty paths.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { albumById } from '../lib/album-query.js';
import { sortPhotosByFilename } from '../lib/ordering.js';
import { photoImgHTML } from '../lib/photo-img.js';
import { homePath, countryPath, slidePath } from '../lib/paths.js';

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
  const photos = sortPhotosByFilename(album.photos);
  const subtitle = `${photos.length.toLocaleString('he-IL')} תמונות`;

  if (photos.length === 0) {
    return `${header(album.name, backHref, 'חזרה', subtitle)}<p class="muted">אין תמונות באלבום זה.</p>`;
  }

  const tiles = photos.map((photo, i) => {
    const eager = i < EAGER_COUNT;
    const img = photoImgHTML(photo, {
      intent: 'thumb',
      dpr,
      className: 'photo album-photo',
      loading: eager ? 'eager' : 'lazy',
      // The first screenful jumps the network queue so on-screen thumbs
      // appear fast (ask #2); off-screen tiles stay lazy + normal priority.
      priority: eager ? 'high' : null,
    });
    return `<li class="photo-tile"><a href="${slidePath(backCode, album.id, i)}">${img}</a></li>`;
  });

  return `
    ${header(album.name, backHref, 'חזרה', subtitle)}
    <ul class="photo-grid" aria-label="תמונות באלבום">
      ${tiles.join('')}
    </ul>
  `;
}
