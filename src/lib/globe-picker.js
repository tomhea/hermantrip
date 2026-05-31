// "Choose which album" picker for a globe point that holds 2+ albums
// (M38 / ask #10). Pure HTML-string builder — no DOM, no fetch. main.js mounts
// the returned markup as an overlay and wires the links / close button.
//
// A city visited more than once (e.g. Bangkok ×3, Kathmandu ×2) groups several
// albums at one globe point; clicking it used to silently open only the first.
// Now it opens this picker so the visitor chooses which visit to view.

import { albumPath } from './paths.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Build the picker overlay markup for a list of albums. Each album becomes a
// link carrying data-href (main.js intercepts it for SPA navigation).
export function globePickerHTML(albums, title = '') {
  const items = (albums || []).map((a) => {
    const href = albumPath(a.primary, a.slug);
    const label = escapeHTML(a.title || a.name);
    return `<li><a class="globe-picker-link map-popup-link" data-href="${href}" href="${href}">${label}</a></li>`;
  }).join('');
  const heading = title ? escapeHTML(title) : 'איזה ביקור?';
  return `
    <div class="globe-picker-backdrop" data-globe-picker-backdrop>
      <div class="globe-picker" role="dialog" aria-modal="true" aria-label="בחירת אלבום">
        <button type="button" class="globe-picker-close" data-globe-picker-close aria-label="סגירה">✕</button>
        <p class="globe-picker-title">${heading}</p>
        <ul class="globe-picker-list">${items}</ul>
      </div>
    </div>
  `;
}
