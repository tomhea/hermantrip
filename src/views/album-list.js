// Album list view: #/country/{code} → the albums in that country.
//
// Pure HTML-string builder. Navigation is plain <a href> so the hash
// router handles it; no event wiring needed. R3-tested for loading /
// fetch-failed / unknown-country paths.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { albumsForCountry } from '../lib/album-query.js';
import { photoImgHTML } from '../lib/photo-img.js';
import { homePath, albumPath } from '../lib/paths.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function backHeader(title, subtitle) {
  return `
    <header class="view-header">
      <a class="back-link" href="${homePath()}" aria-label="חזרה לדף הבית">→ דף הבית</a>
      <h1 class="h1">${escapeHTML(title)}</h1>
      ${subtitle ? `<p class="muted small">${escapeHTML(subtitle)}</p>` : ''}
    </header>
  `;
}

function albumCard(album, code, dpr) {
  const first = album.photos[0];
  const count = album.photos.length;
  const thumb = first
    ? photoImgHTML(first, { intent: 'card', dpr, className: 'album-thumb' })
    : '<div class="album-thumb photo-broken" aria-hidden="true"></div>';
  return `
    <li class="album-card">
      <a href="${albumPath(code, album.id)}">
        ${thumb}
        <div class="album-card-meta">
          <span class="album-name">${escapeHTML(album.title ?? album.name)}</span>
          <span class="album-count">${count.toLocaleString('he-IL')} תמונות</span>
        </div>
      </a>
    </li>
  `;
}

export function renderAlbumList({ manifest, error, code, dpr = 1 }) {
  if (error) {
    return `${backHeader('אלבומים', '')}${errorHTML('לא הצלחנו לטעון את האלבומים. נסו לרענן.')}`;
  }
  if (!manifest) {
    return `${backHeader('אלבומים', '')}${loadingHTML()}`;
  }

  const country = manifest.countries?.find((c) => c.code === code);
  if (!country) {
    return `
      ${backHeader('מדינה לא נמצאה', '')}
      <p class="muted">המדינה המבוקשת לא נמצאה. <a href="${homePath()}">חזרה לדף הבית</a>.</p>
    `;
  }

  const albums = albumsForCountry(manifest, code);
  const totalPhotos = albums.reduce((s, a) => s + a.photos.length, 0);
  const subtitle = `${albums.length} אלבומים · ${totalPhotos.toLocaleString('he-IL')} תמונות`;

  if (albums.length === 0) {
    return `${backHeader(country.he, subtitle)}<p class="muted">אין אלבומים להצגה.</p>`;
  }

  return `
    ${backHeader(country.he, subtitle)}
    <ul class="album-grid-list" aria-label="אלבומים">
      ${albums.map((a) => albumCard(a, code, dpr)).join('')}
    </ul>
  `;
}
