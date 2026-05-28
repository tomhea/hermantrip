// Hebrew loading-state + error-state HTML factories.
//
// Pure string builders so they can be unit-tested without a DOM. Views
// inject the returned HTML via `element.innerHTML = loadingHTML()` etc.
//
// Hebrew copy is hand-written, not machine-translated (R2 anti-AI check).

export const DEFAULT_LOADING_TEXT = 'טוען...';
export const DEFAULT_ERROR_TEXT = 'משהו השתבש. נסו לרענן.';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function loadingHTML(text = DEFAULT_LOADING_TEXT) {
  const safe = escapeHTML(text);
  return `<div class="loading" role="status" aria-live="polite"><span class="loading-spinner" aria-hidden="true"></span><span class="loading-text">${safe}</span></div>`;
}

export function errorHTML(text = DEFAULT_ERROR_TEXT) {
  const safe = escapeHTML(text);
  return `<div class="error" role="alert"><span class="error-text">${safe}</span></div>`;
}
