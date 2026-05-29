// Pure builder for a photo <img> string. Shared by every view that renders
// photos. All image URLs come from imageUrl() (R4), which now emits
// same-origin /img/ paths — so the ORB-era onerror→thumbnailLink fallback
// chain is gone: same-origin proxied images can't be ORB-blocked. On the
// rare genuine failure (missing file), onerror tags the element so CSS can
// show an intentional placeholder instead of the broken-image glyph.
//
// Pure: returns a string, touches no DOM.

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

  return `<img class="${escapeHTML(className)}" src="${src}" loading="${escapeHTML(loading)}"${priorityAttr} decoding="async" alt="${escapeHTML(alt)}" onerror="this.classList.add('photo-broken')">`;
}
