// Album list view (country page): /{country} → its albums.
//
// M3 refresh: a slim header (back-to-home + a country-random pill + theme
// toggle), the FIRST album a wide FEATURED overlay tile, the rest an overlay
// grid. Each tile overlays the album name + count·dates on its cover photo.
// Pure HTML-string builder; navigation via <a href>. Tiles use lazy <img>
// (photoImgHTML → loading="lazy" + onerror, R4/R5). R3-tested for
// loading / fetch-failed / unknown-country / empty paths.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { albumsForCountry } from '../lib/album-query.js';
import { photoImgHTML } from '../lib/photo-img.js';
import { albumPath, countryRandomPath } from '../lib/paths.js';
import { albumDateLabel } from '../lib/album-dates.js';
import { viewHeader } from '../lib/view-header.js';
import { icon } from '../lib/nav-icons.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const BACK = { href: '/', label: 'דף הבית' };

function header(country, subtitle, code) {
  const actions = `
    <a class="slim-nav" href="${countryRandomPath(code)}" data-random-play data-href="${countryRandomPath(code)}">${icon('slideshow')} מצגת<span class="nav-long"> אקראית</span></a>
    <button type="button" class="slim-nav slim-toggle" data-theme-toggle aria-label="מצב בהיר/כהה">${icon('moon')}${icon('sun')}</button>`;
  return viewHeader({ title: country.he, subtitle, back: BACK, actions });
}

function albumTile(album, code, dpr, featured) {
  const first = album.photos[0];
  const count = album.photos.length;
  const dateLabel = albumDateLabel(album.photos);
  const name = album.title ?? album.name;
  const sub = `${count.toLocaleString('he-IL')} תמונות${dateLabel ? ` · ${escapeHTML(dateLabel)}` : ''}`;
  const img = first
    ? photoImgHTML(first, { intent: featured ? 'hero' : 'card', dpr, className: 'album-tile-img' })
    : '<div class="album-tile-img photo-broken" aria-hidden="true"></div>';
  return `
    <a class="album-tile${featured ? ' album-tile-featured' : ''}" href="${albumPath(code, album.slug)}">
      ${img}
      <span class="album-tile-scrim" aria-hidden="true"></span>
      <span class="album-tile-name">${escapeHTML(name)}</span>
      <span class="album-tile-sub">${sub}</span>
    </a>`;
}

export function renderAlbumList({ manifest, error, code, dpr = 1 }) {
  if (error) {
    return `${viewHeader({ title: 'אלבומים', back: BACK })}${errorHTML('לא הצלחנו לטעון את האלבומים. נסו לרענן.')}`;
  }
  if (!manifest) {
    return `${viewHeader({ title: 'אלבומים', back: BACK })}${loadingHTML()}`;
  }
  const country = manifest.countries?.find((c) => c.code === code);
  if (!country) {
    return `${viewHeader({ title: 'מדינה לא נמצאה', back: BACK })}<p class="muted">המדינה המבוקשת לא נמצאה. <a href="/">חזרה לדף הבית</a>.</p>`;
  }
  const albums = albumsForCountry(manifest, code);
  const totalPhotos = albums.reduce((s, a) => s + a.photos.length, 0);
  const subtitle = `${albums.length} אלבומים · ${totalPhotos.toLocaleString('he-IL')} תמונות`;
  if (albums.length === 0) {
    return `${header(country, subtitle, code)}<p class="muted">אין אלבומים להצגה.</p>`;
  }
  return `${header(country, subtitle, code)}
    <main class="country-page">
      ${albums.map((a, i) => albumTile(a, code, dpr, i === 0)).join('')}
    </main>`;
}
