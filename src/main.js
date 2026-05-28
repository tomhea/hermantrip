// Boot: load manifest, mount the hash router, render views.
//
// Per R6 this file is the DOM-side wiring layer. It uses window/document/fetch
// freely. Pure logic stays in src/lib/.

import { parseHash, createRouter } from './lib/router.js';
import { loadingHTML, errorHTML } from './lib/loading.js';

const ROUTES = [
  { pattern: '/', name: 'home' },
  // Stubs for routes added in later milestones — declared now so we have a
  // place to send the user; views land progressively.
  { pattern: '/country/:code', name: 'country' },
  { pattern: '/album/:id', name: 'album' },
  { pattern: '/album/:id/slide/:idx', name: 'slide' },
  { pattern: '/country/:code/random', name: 'country-random' },
  { pattern: '/random', name: 'random' },
  { pattern: '/map', name: 'map' },
  { pattern: '/game', name: 'game' },
  { pattern: '/timeline', name: 'timeline' },
];

const router = createRouter(ROUTES);
const app = document.getElementById('app');

let manifest = null;
let manifestError = null;

async function loadManifest() {
  try {
    const res = await fetch('/data/manifest.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    manifestError = err;
    console.error('Failed to load manifest:', err);
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Schematic globe — pale ocean disk, sage land blobs, faint meridian +
// equator lines, one terra-cotta dot for "we were here". Atlas-feel, not
// a literal earth render.
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

// Country code → earth-tone palette. The mapping is loose, just enough
// variation to make the country list feel atlas-coded rather than uniform.
const COUNTRY_DOT = {
  np: 'var(--earth-slate)',   // Nepal — mountains
  in: 'var(--earth-ochre)',   // India — warm, varied
  vn: 'var(--earth-sage)',    // Vietnam — jungle
  cn: 'var(--earth-slate)',   // China — mountains, clay
  au: 'var(--accent)',        // Australia — outback (terra-cotta)
  nz: 'var(--earth-sage)',    // New Zealand — green hills
  th: 'var(--earth-ochre)',   // Thailand — tropical
};

function renderHome() {
  if (manifestError) {
    app.innerHTML = errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
    return;
  }
  if (!manifest) {
    app.innerHTML = loadingHTML();
    return;
  }
  const { counts, countries } = manifest;
  app.innerHTML = `
    <header class="home-header">
      <div class="home-header-text">
        <h1 class="display">הרמן בדרכים</h1>
        <p class="tagline">אלבום משפחתי מטיול בן שנה</p>
      </div>
      ${GLOBE_SVG}
    </header>
    <section class="home-stats" aria-label="סטטיסטיקה">
      <dl>
        <div>
          <dt>תמונות</dt>
          <dd>${counts.photos.toLocaleString('he-IL')}</dd>
        </div>
        <div>
          <dt>אלבומים</dt>
          <dd>${counts.albums}</dd>
        </div>
        <div>
          <dt>מדינות</dt>
          <dd>${countries.length}</dd>
        </div>
      </dl>
    </section>
    <ul class="home-countries" aria-label="מדינות">
      ${countries.map((c) => {
        const total = manifest.albums
          .filter((a) => a.countries.includes(c.code))
          .reduce((s, a) => s + a.photos.length, 0);
        const dotColor = COUNTRY_DOT[c.code] ?? 'var(--accent)';
        return `<li>
          <span class="country-dot" style="background:${dotColor}" aria-hidden="true"></span>
          <span class="country-name">${escapeHTML(c.he)}</span>
          <span class="country-count">${total.toLocaleString('he-IL')} תמונות · ${c.primaryAlbums.length} אלבומים</span>
        </li>`;
      }).join('')}
    </ul>
    <p class="home-coming-soon">
      צפייה באלבומים, סלאידשואו, מפה, משחק ניחושים וציר זמן —
      יגיעו במילסטונים הקרובים.
    </p>
  `;
}

function renderNotFound(path) {
  app.innerHTML = `
    <div class="notfound">
      <h1 class="display">404</h1>
      <p class="muted">הדף <code>${escapeHTML(path)}</code> לא נמצא.</p>
      <p><a href="#/">חזרה לדף הבית</a></p>
    </div>
  `;
}

function render() {
  const path = parseHash(window.location.hash);
  const match = router.match(path);
  if (!match) {
    renderNotFound(path);
    return;
  }
  switch (match.name) {
    case 'home':
      renderHome();
      break;
    default:
      // Placeholder for routes whose views ship in later milestones.
      app.innerHTML = `
        <div class="notfound">
          <h1 class="display">בקרוב</h1>
          <p class="muted">הדף <code>${escapeHTML(path)}</code> יופיע במילסטון הבא.</p>
          <p><a href="#/">חזרה לדף הבית</a></p>
        </div>
      `;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('popstate', render);

(async function boot() {
  render(); // shows loading state
  await loadManifest();
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }
})();
