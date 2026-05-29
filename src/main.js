// Boot: load manifest, mount the hash router, render views.
//
// Per R6 this file is the DOM-side wiring layer. It uses window/document/fetch
// freely. Pure logic stays in src/lib/.

import { parseHash, createRouter } from './lib/router.js';
import { renderCountryList } from './views/country-list.js';
import { renderAlbumList } from './views/album-list.js';
import { renderAlbumGrid } from './views/album-grid.js';

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

const dpr = () => window.devicePixelRatio || 1;

function renderHome() {
  app.innerHTML = renderCountryList({ manifest, error: manifestError, dpr: dpr() });
}

function renderCountry(params) {
  app.innerHTML = renderAlbumList({ manifest, error: manifestError, code: params.code, dpr: dpr() });
  window.scrollTo(0, 0);
}

function renderAlbum(params) {
  app.innerHTML = renderAlbumGrid({ manifest, error: manifestError, id: params.id, dpr: dpr() });
  window.scrollTo(0, 0);
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
    case 'country':
      renderCountry(match.params);
      break;
    case 'album':
      renderAlbum(match.params);
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
