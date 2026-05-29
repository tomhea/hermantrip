// Slideshow view: #/album/{id}/slide/{idx} → one photo, fullscreen.
//
// Pure HTML-string builder. Prev/next are plain <a href> to neighbour
// slide indices (wrapping), so click-zone navigation needs no JS. The
// root carries data-next / data-prev / data-exit attributes that main.js
// reads to wire keyboard + swipe via slideshow-nav's pure mappers.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { albumById } from '../lib/album-query.js';
import { sortPhotosByFilename } from '../lib/ordering.js';
import { imageUrl } from '../lib/image-url.js';
import { clampIndex, nextIndex, prevIndex } from '../lib/slideshow-nav.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderSlideshow({ manifest, error, id, idx, dpr = 1, viewport = 'phone' }) {
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
        <p class="muted">האלבום המבוקש לא נמצא. <a href="#/">חזרה לדף הבית</a>.</p>
      </div>
    `;
  }

  const exitHref = `#/album/${album.id}`;
  const photos = sortPhotosByFilename(album.photos);
  if (photos.length === 0) {
    return `
      <div class="slideshow-shell">
        <p class="muted">אין תמונות באלבום זה. <a href="${exitHref}">חזרה לאלבום</a>.</p>
      </div>
    `;
  }

  const i = clampIndex(idx, photos.length);
  const photo = photos[i];
  const nextHref = `#/album/${album.id}/slide/${nextIndex(i, photos.length)}`;
  const prevHref = `#/album/${album.id}/slide/${prevIndex(i, photos.length)}`;
  const src = imageUrl(photo.id, 'slide', { dpr, viewport });

  // R4 onerror fallback chain (lh3 → thumbnailLink → broken placeholder).
  const fallback = photo.thumbnailLink ? escapeHTML(photo.thumbnailLink) : '';
  const onerror = fallback
    ? `if(!this.dataset.fb){this.dataset.fb='1';this.src='${fallback}'}else{this.classList.add('photo-broken')}`
    : "this.classList.add('photo-broken')";

  const counter = `${i + 1} / ${photos.length}`;

  return `
    <div class="slideshow-shell" data-slideshow
         data-next="${nextHref}" data-prev="${prevHref}" data-exit="${exitHref}">
      <div class="slideshow-stage">
        <img class="slideshow-photo" src="${src}" alt="${escapeHTML(album.name)} — ${i + 1}"
             decoding="async" onerror="${onerror}">
        <a class="slideshow-zone slideshow-zone-next" href="${nextHref}" aria-label="התמונה הבאה"></a>
        <a class="slideshow-zone slideshow-zone-prev" href="${prevHref}" aria-label="התמונה הקודמת"></a>
      </div>
      <div class="slideshow-bar">
        <a class="slideshow-close" href="${exitHref}" aria-label="סגירה וחזרה לאלבום">✕</a>
        <span class="slideshow-counter" dir="ltr">${counter}</span>
        <span class="slideshow-title">${escapeHTML(album.name)}</span>
      </div>
    </div>
  `;
}
