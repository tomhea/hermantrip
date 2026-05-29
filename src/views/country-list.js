// Country list view — the home page from M3 onward.
//
// Pure HTML-string builder: takes the current state ({ manifest, error })
// and returns the HTML to inject into #app. Click navigation uses plain
// `<a href="#/country/...">` so no DOM event handlers are needed —
// the router catches hashchange and re-renders.
//
// R3: tested for no-data + fetch-failed render paths in
// country-list.test.mjs.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { pickCountryThumb } from '../lib/country-thumb.js';
import { countryPath } from '../lib/paths.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Schematic globe — pale ocean disk, sage land blobs, one terra-cotta
// "we were here" dot. Repeated from M2's home stub.
const GLOBE_SVG = `<svg class="home-globe" viewBox="0 0 80 80" aria-hidden="true">
  <circle cx="40" cy="40" r="32" fill="var(--earth-pale)" stroke="var(--text)" stroke-width="1.2"/>
  <path d="M 16 32 Q 24 26, 32 32 Q 38 36, 44 32 Q 50 30, 56 34 L 55 40 Q 48 44, 40 42 Q 30 42, 20 40 Z"
        fill="var(--earth-sage)" opacity="0.85"/>
  <path d="M 24 52 Q 32 50, 42 54 Q 50 56, 56 52 L 54 60 Q 44 62, 34 60 Q 28 58, 24 56 Z"
        fill="var(--earth-sage)" opacity="0.85"/>
  <ellipse cx="40" cy="40" rx="32" ry="9" fill="none" stroke="var(--text)" stroke-width="0.4" opacity="0.35"/>
  <ellipse cx="40" cy="40" rx="11" ry="32" fill="none" stroke="var(--text)" stroke-width="0.4" opacity="0.35"/>
  <circle cx="46" cy="36" r="1.6" fill="var(--accent)"/>
</svg>`;

const COUNTRY_DOT = {
  np: 'var(--earth-slate)',
  in: 'var(--earth-ochre)',
  vn: 'var(--earth-sage)',
  cn: 'var(--earth-slate)',
  au: 'var(--accent)',
  nz: 'var(--earth-sage)',
  th: 'var(--earth-ochre)',
};

function renderHeader() {
  return `
    <header class="home-header">
      <div class="home-header-text">
        <h1 class="display">הרמן בדרכים</h1>
        <p class="tagline">אלבום משפחתי מטיול בן שנה</p>
      </div>
      ${GLOBE_SVG}
    </header>
  `;
}

function renderCountryCard(country, manifest, dpr) {
  const thumb = pickCountryThumb(manifest, country.code);
  const total = manifest.albums
    .filter((a) => a.countries.includes(country.code))
    .reduce((s, a) => s + a.photos.length, 0);
  const dotColor = COUNTRY_DOT[country.code] ?? 'var(--accent)';
  // Same-origin /img/ proxy can't be ORB-blocked, so the old
  // onerror→thumbnailLink hop is gone; onerror just shows the placeholder
  // on a genuine miss.
  const thumbHTML = thumb
    ? `<img class="country-thumb" src="${imageUrl(thumb.id, 'card', { dpr })}" loading="lazy" alt="" decoding="async" onerror="this.classList.add('country-thumb-broken')">`
    : '<div class="country-thumb country-thumb-empty" aria-hidden="true"></div>';
  return `
    <li class="country-card">
      <a href="${countryPath(country.code)}">
        ${thumbHTML}
        <div class="country-card-meta">
          <span class="country-dot" style="background:${dotColor}" aria-hidden="true"></span>
          <span class="country-name">${escapeHTML(country.he)}</span>
          <span class="country-count">${total.toLocaleString('he-IL')} תמונות</span>
        </div>
      </a>
    </li>
  `;
}

export function renderCountryList({ manifest, error, dpr = 1 }) {
  if (error) {
    return `${renderHeader()}${errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.')}`;
  }
  if (!manifest) {
    return `${renderHeader()}${loadingHTML()}`;
  }
  if (!Array.isArray(manifest.countries) || manifest.countries.length === 0) {
    return `${renderHeader()}<p class="muted">אין מדינות להצגה.</p>`;
  }

  return `
    ${renderHeader()}
    <ul class="country-grid" aria-label="מדינות">
      ${manifest.countries.map((c) => renderCountryCard(c, manifest, dpr)).join('')}
    </ul>
    <p class="home-coming-soon">
      בחרו מדינה כדי לדפדף באלבומים שלה.
      סלאידשואו, מפה, משחק ניחושים וציר זמן יגיעו במילסטונים הבאים.
    </p>
  `;
}
