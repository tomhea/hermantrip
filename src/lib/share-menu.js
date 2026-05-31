// Share menu for the slideshow (M42 / ask #4). Pure HTML-string builder — no
// DOM, no clipboard/share calls (those are web-API wiring, done in main.js).
//
// Four actions, each a button main.js wires by its data-share value:
//   copy-link     → copy the current photo's page URL to the clipboard
//   copy-picture  → copy the image itself to the clipboard (as PNG)
//   share-link    → Web Share the URL
//   share-picture → Web Share the image file
//
// Rendered inside a <details> (same no-JS-to-open pattern as the info panel).
// main.js hides the actions the browser can't do (no navigator.share /
// clipboard) so only working options show.

export const SHARE_ACTIONS = [
  { key: 'copy-link', label: 'העתק קישור', kind: 'copy' },
  { key: 'copy-picture', label: 'העתק תמונה', kind: 'copy' },
  { key: 'share-link', label: 'שתף קישור', kind: 'share' },
  { key: 'share-picture', label: 'שתף תמונה', kind: 'share' },
];

export function shareMenuHTML() {
  const rows = SHARE_ACTIONS.map((a) => (
    `<button type="button" class="slideshow-share-item" data-share="${a.key}" data-share-kind="${a.kind}">${a.label}</button>`
  )).join('');
  return `
    <details class="slideshow-share">
      <summary aria-label="שיתוף" title="שיתוף">⤴</summary>
      <div class="slideshow-share-menu">${rows}</div>
    </details>
  `;
}
