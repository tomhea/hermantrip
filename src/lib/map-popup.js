// Map pin popup markup (M46 / #9). Pure — no DOM, no fetch.
//
// A pin groups all trip stops at one coordinate. The popup lists the albums
// there as SPA links, by ALBUM NAME (several albums at one city — e.g. Bangkok
// — would otherwise all read the city label "בנגקוק"). Linkless trail-only
// stops (the opening/closing גבעת שמואל·Bangkok markers) are shown ONLY when
// the pin has no album links at all, so the Bangkok pin drops its bare
// "בנגקוק" while album-less גבעת שמואל still shows its label once.

import { albumPath } from './paths.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Distinct album hrefs at a pin, in first-seen order (M52 / #3). The map uses
// the count to decide: exactly one → click navigates DIRECTLY (no "pick 1 of 1"
// popup); two or more → the popup lists them. Linkless trail markers contribute
// no href. URL follows the pin's per-city country (#8), like the popup links.
export function albumHrefsForStops(stops) {
  const list = Array.isArray(stops) ? stops : [];
  const seen = new Set();
  const hrefs = [];
  for (const s of list) {
    if (!s.albumId) continue;
    const href = albumPath(s.country || s.primary, s.slug);
    if (seen.has(href)) continue;
    seen.add(href);
    hrefs.push(href);
  }
  return hrefs;
}

export function stopPopupHTML(stops) {
  const list = Array.isArray(stops) ? stops : [];
  const hasAlbum = list.some((s) => s.albumId);
  const seenHref = new Set();
  const seenLabel = new Set();
  const rows = list.map((s) => {
    if (!s.albumId) {
      if (hasAlbum) return ''; // drop linkless markers when the pin has albums
      const label = escapeHTML(s.label);
      if (seenLabel.has(label)) return '';
      seenLabel.add(label);
      return `<span class="map-popup-label">${label}</span>`;
    }
    // Use the pin's per-city country so a map entry points to ITS country's
    // shared album (#8): album 1's Bangkok pin → /thailand/…, its Kathmandu
    // pin → /nepal/…. Falls back to primary for stops without a country.
    const href = albumPath(s.country || s.primary, s.slug);
    if (seenHref.has(href)) return '';
    seenHref.add(href);
    const text = escapeHTML(s.albumTitle || s.label);
    return `<a href="${href}" class="map-popup-link" data-href="${href}">${text}</a>`;
  }).filter(Boolean).join('');
  return `<div class="map-popup">${rows}</div>`;
}
