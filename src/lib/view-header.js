// src/lib/view-header.js
// Shared slim header: title (+ inline subtitle) on the RTL start (right),
// action group on the left, optional back link top-right. Pure HTML string.
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
// subtitle: a plain string (escaped here). subtitleHTML: pre-built, caller-
// trusted markup (the caller escapes its own dynamic parts) — used when the
// subtitle needs structure, e.g. separately-targetable count/date spans.
export function viewHeader({ title, subtitle = '', subtitleHTML = '', back = null, actions = '' }) {
  const backHTML = back
    ? `<a class="slim-back" href="${escapeHTML(back.href)}" aria-label="${escapeHTML(back.label)}">→ ${escapeHTML(back.label)}</a>`
    : '';
  const subInner = subtitleHTML || (subtitle ? escapeHTML(subtitle) : '');
  const sub = subInner ? `<span class="slim-sub">${subInner}</span>` : '';
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
