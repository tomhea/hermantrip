// Pure builder for a photo <img> string with the R4 onerror fallback chain.
//
// Shared by every view that renders Drive photos (album-list, album-grid,
// and country-list from M4 onward). Keeps the onerror chain — lh3 URL →
// manifest thumbnailLink → CSS broken-placeholder class — in ONE place so
// the fallback behavior can't drift between views.
//
// Pure: returns a string, touches no DOM. R4 requires all Drive URLs go
// through imageUrl(); this is the only place the onerror string is built.

import { imageUrl } from './image-url.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function photoImgHTML(photo, opts = {}) {
  const {
    intent = 'thumb',
    dpr = 1,
    viewport = 'phone',
    className = 'photo',
    alt = '',
    loading = 'lazy',
    priority = null, // 'high' to jump the network queue for on-screen images
  } = opts;

  const src = imageUrl(photo.id, intent, { dpr, viewport });
  const priorityAttr = priority ? ` fetchpriority="${escapeHTML(priority)}"` : '';

  // R4 fallback chain: on first error swap to the manifest's thumbnailLink
  // (a different lh3 path); on the second error tag the element so CSS can
  // render an intentional placeholder instead of the broken-image glyph.
  const fallback = photo.thumbnailLink ? escapeHTML(photo.thumbnailLink) : '';
  const onerror = fallback
    ? `if(!this.dataset.fb){this.dataset.fb='1';this.src='${fallback}'}else{this.classList.add('photo-broken')}`
    : "this.classList.add('photo-broken')";

  return `<img class="${escapeHTML(className)}" src="${src}" loading="${escapeHTML(loading)}"${priorityAttr} decoding="async" alt="${escapeHTML(alt)}" onerror="${onerror}">`;
}
