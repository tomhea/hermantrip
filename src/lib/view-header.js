// src/lib/view-header.js
// Shared slim header: title (+ inline subtitle) on the RTL start (right),
// action group on the left, optional back link top-right. Pure HTML string.
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
export function viewHeader({ title, subtitle = '', back = null, actions = '' }) {
  const backHTML = back
    ? `<a class="slim-back" href="${escapeHTML(back.href)}" aria-label="${escapeHTML(back.label)}">→ ${escapeHTML(back.label)}</a>`
    : '';
  const sub = subtitle ? `<span class="slim-sub">${escapeHTML(subtitle)}</span>` : '';
  return `
    <header class="slim-header">
      <div class="slim-title-wrap">
        ${backHTML}
        <h1 class="slim-title">${escapeHTML(title)}${sub ? ` ${sub}` : ''}</h1>
      </div>
      <div class="slim-actions">${actions}</div>
    </header>
  `;
}
