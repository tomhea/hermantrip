// Boot: load manifest, mount the hash router, render views.
//
// Per R6 this file is the DOM-side wiring layer. It uses window/document/fetch
// freely. Pure logic stays in src/lib/.

import { createRouter } from './lib/router.js';
import { keyToAction, swipeToAction, preloadIndices } from './lib/slideshow-nav.js';
import { nextSpeed } from './lib/slideshow-speed.js';
import { controlsVisible, CONTROLS_HIDE_MS } from './lib/controls-timer.js';
import { albumById } from './lib/album-query.js';
import { sortPhotosByDate } from './lib/ordering.js';
import { imageUrl } from './lib/image-url.js';
import { codeFromSlug, slugFromCode } from './lib/countries.js';
import { albumPath, countryPath } from './lib/paths.js';
import { transformManifest } from './lib/album-transform.js';
import { shuffle } from './lib/random.js';
import { shouldReloadForController } from './lib/sw-update.js';
import { allPhotos, countryPhotos } from './lib/photo-pool.js';
import { renderCountryList } from './views/country-list.js';
import { renderAlbumList } from './views/album-list.js';
import { renderAlbumGrid } from './views/album-grid.js';
import { renderSlideshow } from './views/slideshow.js';
import { renderRandomShow } from './views/random-slideshow.js';
import { renderMap } from './views/map.js';
import { coordsForAlbum } from './lib/album-coords.js';
import { renderGame, renderGameCountry, renderGameAlbum, renderGameResult, renderGameDone } from './views/game.js';
import { eligibleAlbums, albumChoices, scoreCountry, scoreAlbum, generateRounds, TOTAL_ROUNDS, MAX_SCORE } from './lib/game.js';

// Clean-path routes (M12). Order matters: literal first segments are listed
// before the /:country catch-all, and the more-specific /:country/random &
// /:country/:id/:idx before /:country/:id, so first-match-wins resolves
// correctly.
const ROUTES = [
  { pattern: '/', name: 'home' },
  { pattern: '/random', name: 'random' },
  { pattern: '/map', name: 'map' },
  { pattern: '/game', name: 'game' },
  { pattern: '/timeline', name: 'timeline' },
  { pattern: '/day', name: 'day' },
  { pattern: '/day/:date', name: 'day-date' },
  { pattern: '/:country/random', name: 'country-random' },
  { pattern: '/:country/:id/:idx', name: 'slide' },
  { pattern: '/:country/:id', name: 'album' },
  { pattern: '/:country', name: 'country' },
];

// Old hash routes (pre-M12) — parsed only to redirect shared old links to
// the new clean paths.
const OLD_ROUTES = [
  { pattern: '/', name: 'home' },
  { pattern: '/country/:code', name: 'country' },
  { pattern: '/album/:id/slide/:idx', name: 'slide' },
  { pattern: '/album/:id', name: 'album' },
  { pattern: '/country/:code/random', name: 'country-random' },
  { pattern: '/random', name: 'random' },
  { pattern: '/map', name: 'map' },
  { pattern: '/game', name: 'game' },
  { pattern: '/timeline', name: 'timeline' },
];

const router = createRouter(ROUTES);
const oldRouter = createRouter(OLD_ROUTES);
const app = document.getElementById('app');

let manifest = null;
let manifestError = null;

async function loadManifest() {
  try {
    const res = await fetch('/data/manifest.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Apply the presentation transform (clean titles + album merges) once;
    // every view then works with the merged albums + display titles.
    manifest = transformManifest(await res.json());
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
  // params.country is the URL slug ('nepal'); views work in codes ('np').
  const code = codeFromSlug(params.country);
  app.innerHTML = renderAlbumList({ manifest, error: manifestError, code, dpr: dpr() });
  window.scrollTo(0, 0);
}

function renderAlbum(params) {
  const code = codeFromSlug(params.country);
  app.innerHTML = renderAlbumGrid({
    manifest, error: manifestError, code, id: params.id, dpr: dpr(),
  });
  window.scrollTo(0, 0);
}

function viewportClass() {
  if (window.matchMedia('(min-width: 1200px)').matches) return 'desktop';
  if (window.matchMedia('(min-width: 769px)').matches) return 'tablet';
  return 'phone';
}

// SPA navigation: push a clean path and re-render (M12). Accepts a leading
// '#'-stripped path for back-compat with any caller still passing one.
function go(path) {
  if (!path) return;
  const clean = path.replace(/^#/, '');
  if (clean !== currentPath()) {
    window.history.pushState({}, '', clean);
  }
  render();
}

function currentPath() {
  const p = window.location.pathname || '/';
  // normalize a trailing slash (except root) so '/nepal/' === '/nepal'
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

// Autoplay state persists across the re-render that each slide navigation
// triggers; the timer is rescheduled on every slide render while on.
let autoplayOn = false;
let autoplayTimer = null;
let autoplaySpeed = 4000; // ms between auto-advances; cycled by the speed button

// Random slideshow (M17). The shuffled playlist + position live at module
// scope; it's rebuilt on FRESH entry (or scope change) and preserved across
// the re-renders that advancing / toggling controls trigger, so a session
// keeps one order until you leave (cleared in render()).
let randomPlaylist = null; // [{ photo, album }]
let randomPos = 0;
let randomScope = null;    // 'all' | country code
// Hold preloaded Image() refs for the current slide so they aren't GC'd
// before they finish loading; replaced (not appended) each render.
let preloadRefs = [];

function stopAutoplayTimer() {
  if (autoplayTimer !== null) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }
}

function renderSlide(params) {
  const code = codeFromSlug(params.country);
  app.innerHTML = renderSlideshow({
    manifest, error: manifestError, code, id: params.id, idx: params.idx,
    dpr: dpr(), viewport: viewportClass(), autoplay: autoplayOn, speed: autoplaySpeed,
  });
  window.scrollTo(0, 0);
  wireSlideshow();
  preloadNeighbours(params);
}

// Warm ±2 neighbour slide images into the browser cache so navigation
// (manual or autoplay) is instant (ask #3).
function preloadNeighbours(params) {
  preloadRefs = [];
  if (!manifest) return;
  const album = albumById(manifest, params.id);
  if (!album || album.photos.length === 0) return;
  const photos = sortPhotosByDate(album.photos);
  const cur = Math.max(0, Math.min(photos.length - 1, Number.parseInt(params.idx, 10) || 0));
  const vp = viewportClass();
  for (const pi of preloadIndices(cur, photos.length)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = imageUrl(photos[pi].id, 'slide', { dpr: dpr(), viewport: vp });
    preloadRefs.push(img);
  }
}

// --- Random slideshow (M17) ---
function renderRandom(scope, exitHref) {
  if (manifest && (randomPlaylist === null || randomScope !== scope)) {
    const pool = scope === 'all' ? allPhotos(manifest) : countryPhotos(manifest, scope);
    randomPlaylist = shuffle(pool);
    randomPos = 0;
    randomScope = scope;
  }
  const item = randomPlaylist && randomPlaylist.length ? randomPlaylist[randomPos] : null;
  app.innerHTML = renderRandomShow({
    manifest, error: manifestError, item, scope, exitHref,
    autoplay: autoplayOn, speed: autoplaySpeed, dpr: dpr(), viewport: viewportClass(),
  });
  window.scrollTo(0, 0);
  wireSlideshow();
  // Warm the next random photo so autoplay/next is instant.
  if (randomPlaylist && randomPlaylist.length > 1) {
    const nxt = randomPlaylist[(randomPos + 1) % randomPlaylist.length];
    const img = new Image();
    img.decoding = 'async';
    img.src = imageUrl(nxt.photo.id, 'slide', { dpr: dpr(), viewport: viewportClass() });
    preloadRefs = [img];
  }
}

function advanceRandom(dir) {
  if (!randomPlaylist || !randomPlaylist.length) return;
  randomPos = (randomPos + dir + randomPlaylist.length) % randomPlaylist.length;
  render(); // URL stays on the random route → renderRandom keeps the playlist
}

// next/prev for either slideshow flavour: random advances the in-memory
// playlist; album navigates by URL.
function slideAdvance(shell, dir) {
  if (shell.dataset.random !== undefined) advanceRandom(dir);
  else go(dir > 0 ? shell.dataset.next : shell.dataset.prev);
}

// Attach swipe + autoplay-toggle handlers to the freshly-rendered slideshow.
// Album click-zones are plain <a href>; random zones are <button data-nav>
// wired here. Keyboard is global below.
function wireSlideshow() {
  const shell = app.querySelector('[data-slideshow]');
  if (!shell) return;
  const hrefs = {
    next: shell.dataset.next,
    prev: shell.dataset.prev,
    exit: shell.dataset.exit,
  };

  // Random-mode prev/next zone buttons.
  for (const btn of shell.querySelectorAll('[data-nav]')) {
    btn.addEventListener('click', () => slideAdvance(shell, btn.dataset.nav === 'next' ? 1 : -1));
  }

  // Touch swipe on the stage.
  const stage = shell.querySelector('.slideshow-stage');
  if (stage) {
    let startX = null;
    stage.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      const action = swipeToAction(dx);
      if (action === 'next') slideAdvance(shell, 1);
      else if (action === 'prev') slideAdvance(shell, -1);
    }, { passive: true });
  }

  // Autoplay toggle button.
  const toggle = shell.querySelector('[data-autoplay-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      autoplayOn = !autoplayOn;
      render(); // re-render the slide so the button reflects the new state
    });
  }

  // Speed button — cycle the auto-advance interval. Re-render so the label
  // updates and (if playing) the timer below reschedules at the new speed.
  const speedBtn = shell.querySelector('[data-speed-toggle]');
  if (speedBtn) {
    speedBtn.addEventListener('click', () => {
      autoplaySpeed = nextSpeed(autoplaySpeed);
      render();
    });
  }

  // Fullscreen toggle. We fullscreen the PERSISTENT documentElement, not
  // the shell — because each slide advance replaces #app's innerHTML, which
  // would destroy a fullscreened shell and drop out of fullscreen. With
  // <html> fullscreened, navigation/autoplay re-render freely inside it and
  // fullscreen survives (fixes "slideshow doesn't work in fullscreen").
  const fsBtn = shell.querySelector('[data-fullscreen-toggle]');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        document.documentElement.requestFullscreen?.().catch(() => { /* not fatal */ });
      }
    });
  }

  wireControls(shell);

  // (Re)schedule the auto-advance while autoplay is on. Each slide render
  // sets a fresh timer; navigating away clears it (see render()).
  stopAutoplayTimer();
  if (autoplayOn) {
    autoplayTimer = setTimeout(() => slideAdvance(shell, 1), autoplaySpeed);
  }
}

// Control-bar visibility (M10 + M11).
//   - NOT fullscreen: the bar is CONSTANT (always shown, below the photo).
//   - Fullscreen: the bar auto-hides CONTROLS_HIDE_MS after the LAST REAL
//     pointer activity (mouse move / tap / hovering the bar) — crucially NOT
//     reset by slide re-renders, so autoplay no longer keeps it pinned on.
// Activity state lives at module scope so it persists across the innerHTML
// re-render that every slide advance performs.
let lastPointerActivityAt = 0;
let hoveringBar = false;
let controlsPollTimer = null;

function applyControls() {
  const shell = app.querySelector('[data-slideshow]');
  if (!shell) return;
  const fs = !!document.fullscreenElement;
  shell.classList.toggle('is-fullscreen', fs);
  const vis = controlsVisible({
    fullscreen: fs, lastActivityAt: lastPointerActivityAt,
    now: performance.now(), hoveringBar,
  });
  shell.classList.toggle('controls-visible', vis);
  // While fullscreen + visible, keep polling so it hides once idle elapses.
  if (controlsPollTimer !== null) { clearTimeout(controlsPollTimer); controlsPollTimer = null; }
  if (fs && vis) controlsPollTimer = setTimeout(applyControls, 400);
}

function noteActivity() {
  lastPointerActivityAt = performance.now();
  applyControls();
}

function wireControls(shell) {
  shell.addEventListener('mousemove', noteActivity);
  shell.addEventListener('touchstart', noteActivity, { passive: true });
  const bar = shell.querySelector('.slideshow-bar');
  if (bar) {
    bar.addEventListener('mouseenter', () => { hoveringBar = true; noteActivity(); });
    bar.addEventListener('mouseleave', () => { hoveringBar = false; noteActivity(); });
  }
  // Apply persisted state to this freshly-rendered shell WITHOUT resetting
  // the activity clock (the bug fix). In non-fullscreen this shows the
  // constant bar; in fullscreen it respects time since the last real move.
  applyControls();
}

// Entering/leaving fullscreen: reveal for the hide window on entry, and
// re-apply (constant bar) on exit.
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) lastPointerActivityAt = performance.now();
  applyControls();
});

// One global keyboard listener; acts only while a slideshow is mounted.
window.addEventListener('keydown', (e) => {
  const shell = app.querySelector('[data-slideshow]');
  if (!shell) return;
  const action = keyToAction(e.key);
  if (!action) return;
  e.preventDefault();
  if (action === 'exit') go(shell.dataset.exit);
  else slideAdvance(shell, action === 'next' ? 1 : -1);
});

// ── Map (M18) ────────────────────────────────────────────────────
// Country colors for map pins — match the design token palette.
const MAP_COUNTRY_COLORS = {
  np: '#5d7593', // earth-slate
  in: '#c8943d', // earth-ochre
  vn: '#6b8459', // earth-sage
  cn: '#5d7593', // earth-slate
  au: '#b56439', // accent (terra-cotta)
  nz: '#6b8459', // earth-sage
  th: '#c8943d', // earth-ochre
};

// Lazy-load Leaflet CSS+JS once, then resolve window.L.
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

async function renderMapView() {
  app.innerHTML = renderMap({ manifest, error: manifestError });
  window.scrollTo(0, 0);
  if (!manifest) return;

  let L;
  try { L = await loadLeaflet(); } catch {
    const c = document.getElementById('map-container');
    if (c) c.innerHTML = '<p class="muted" style="padding:1rem">לא הצלחנו לטעון את המפה.</p>';
    return;
  }
  const container = document.getElementById('map-container');
  if (!container) return; // user navigated away while loading

  const map = L.map(container, { zoomControl: false });
  // Expose for DevTools / screenshot helpers (harmless in production).
  window._hermanMap = map;
  L.control.zoom({ position: 'topleft' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const bounds = [];
  for (const album of manifest.albums) {
    const coords = coordsForAlbum(album.id);
    if (!coords) continue;
    const [lat, lng] = coords;
    bounds.push([lat, lng]);
    const color = MAP_COUNTRY_COLORS[album.primary] || '#888';
    const icon = L.divIcon({
      html: `<div class="map-pin" style="background:${color}"></div>`,
      className: 'map-pin-wrapper',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10],
    });
    const marker = L.marker([lat, lng], { icon });
    const href = albumPath(album.primary, album.id);
    const title = escapeHTML(album.title || album.name);
    marker.bindPopup(
      `<div class="map-popup"><a href="${href}" class="map-popup-link">${title}</a></div>`,
      { maxWidth: 220 },
    );
    marker.on('popupopen', () => {
      const el = marker.getPopup().getElement();
      const link = el && el.querySelector('.map-popup-link');
      if (link) {
        link.addEventListener('click', (e) => { e.preventDefault(); go(href); });
      }
    });
    marker.addTo(map);
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });
}

// ── Game (M19) ───────────────────────────────────────────────────
// Game state (persists across the re-renders within a game session).
let gameRounds = null;   // [{ photo, album }] — 10 items
let gameStep = 'country'; // 'country' | 'album' | 'result' | 'done'
let gameRoundIdx = 0;
let gameScore = 0;
let gameCountryCorrect = false;
let gameAlbumCorrect = false;
let gameAlbumChoices = null;

function startGame() {
  if (!manifest) return;
  gameRounds = generateRounds(manifest);
  gameRoundIdx = 0;
  gameScore = 0;
  gameStep = 'country';
  gameCountryCorrect = false;
  gameAlbumCorrect = false;
  gameAlbumChoices = null;
}

function renderGameView() {
  if (!manifest) {
    app.innerHTML = renderGame({ manifest: null, error: manifestError });
    return;
  }
  if (manifestError) {
    app.innerHTML = renderGame({ manifest: null, error: manifestError });
    return;
  }
  if (!gameRounds) startGame();

  const round = gameRounds[gameRoundIdx];
  const roundNum = gameRoundIdx + 1;
  const base = { round, roundNum, totalRounds: TOTAL_ROUNDS, score: gameScore, dpr: dpr(), viewport: viewportClass() };

  if (gameStep === 'country') {
    app.innerHTML = renderGameCountry(base);
    wireGame();
  } else if (gameStep === 'album') {
    if (!gameAlbumChoices) {
      gameAlbumChoices = albumChoices(eligibleAlbums(manifest), round.album);
    }
    app.innerHTML = renderGameAlbum({ ...base, choices: gameAlbumChoices, countryCorrect: gameCountryCorrect });
    wireGame();
  } else if (gameStep === 'result') {
    const isLast = gameRoundIdx >= TOTAL_ROUNDS - 1;
    app.innerHTML = renderGameResult({ ...base, countryCorrect: gameCountryCorrect, albumCorrect: gameAlbumCorrect, isLast });
    wireGame();
  } else if (gameStep === 'done') {
    app.innerHTML = renderGameDone({ score: gameScore, maxScore: MAX_SCORE });
    wireGame();
  }
  window.scrollTo(0, 0);
}

function wireGame() {
  // Country buttons
  for (const btn of app.querySelectorAll('[data-country]')) {
    btn.addEventListener('click', () => {
      const guessed = btn.dataset.country;
      const correct = gameRounds[gameRoundIdx].album.primary;
      gameCountryCorrect = scoreCountry(guessed, correct) === 1;
      if (gameCountryCorrect) gameScore += 1;
      gameStep = 'album';
      gameAlbumChoices = null;
      renderGameView();
    });
  }
  // Album buttons
  for (const btn of app.querySelectorAll('[data-album-id]')) {
    btn.addEventListener('click', () => {
      const guessedId = Number(btn.dataset.albumId);
      const correctId = gameRounds[gameRoundIdx].album.id;
      gameAlbumCorrect = scoreAlbum(guessedId, correctId) === 1;
      if (gameAlbumCorrect) gameScore += 1;
      // Briefly highlight the correct answer before advancing.
      btn.classList.add(gameAlbumCorrect ? 'correct' : 'wrong');
      const correctBtn = app.querySelector(`[data-album-id="${correctId}"]`);
      if (correctBtn && !gameAlbumCorrect) correctBtn.classList.add('correct');
      setTimeout(() => {
        gameStep = 'result';
        renderGameView();
      }, 600);
    });
  }
  // Next / finish / replay
  for (const btn of app.querySelectorAll('[data-game-action]')) {
    btn.addEventListener('click', () => {
      const action = btn.dataset.gameAction;
      if (action === 'next') {
        gameRoundIdx += 1;
        gameStep = 'country';
        gameCountryCorrect = false;
        gameAlbumCorrect = false;
        gameAlbumChoices = null;
        renderGameView();
      } else if (action === 'finish') {
        gameStep = 'done';
        renderGameView();
      } else if (action === 'replay') {
        startGame();
        renderGameView();
      }
    });
  }
}

function renderNotFound(path) {
  app.innerHTML = `
    <div class="notfound">
      <h1 class="display">404</h1>
      <p class="muted">הדף <code>${escapeHTML(path)}</code> לא נמצא.</p>
      <p><a href="/">חזרה לדף הבית</a></p>
    </div>
  `;
}

function render() {
  const path = currentPath();
  const match = router.match(path);
  // Country/album/slide carry a country SLUG — reject unknown slugs as 404
  // (e.g. /atlantis) rather than rendering an empty country view.
  if (match && ['country', 'country-random', 'album', 'slide'].includes(match.name)
      && codeFromSlug(match.params.country) === null) {
    stopAutoplayTimer();
    autoplayOn = false;
    renderNotFound(path);
    return;
  }
  // Any navigation cancels a pending auto-advance; renderSlide reschedules
  // if we're landing on another slide and autoplay is still on. Leaving the
  // slideshow entirely turns autoplay back off so it doesn't silently resume.
  stopAutoplayTimer();
  const inSlideshow = match && ['slide', 'random', 'country-random'].includes(match.name);
  if (!inSlideshow) {
    autoplayOn = false;
    // Leaving the slideshow: drop out of fullscreen so the album/home view
    // isn't stuck filling the screen, and forget the random playlist so the
    // next random visit reshuffles ("random each time").
    if (document.fullscreenElement) document.exitFullscreen?.();
    randomPlaylist = null;
    randomScope = null;
  }
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
    case 'slide':
      renderSlide(match.params);
      break;
    case 'random':
      renderRandom('all', '/');
      break;
    case 'country-random': {
      const code = codeFromSlug(match.params.country);
      renderRandom(code, countryPath(code));
      break;
    }
    case 'map':
      renderMapView();
      break;
    case 'game':
      renderGameView();
      break;
    default:
      // Placeholder for routes whose views ship in later milestones
      // (random / map / game / timeline / day).
      app.innerHTML = `
        <div class="notfound">
          <h1 class="display">בקרוב</h1>
          <p class="muted">הדף <code>${escapeHTML(path)}</code> יופיע במילסטון הבא.</p>
          <p><a href="/">חזרה לדף הבית</a></p>
        </div>
      `;
  }
}

// Intercept same-origin link clicks for SPA navigation. Skips downloads,
// new-tab/modified clicks, cross-origin, and the /img/ proxy (real fetches).
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return; // external / non-path
  if (a.hasAttribute('download') || a.target === '_blank') return;
  if (href.startsWith('/img/')) return; // image download/proxy — let it fetch
  e.preventDefault();
  go(href);
});

window.addEventListener('popstate', render);

// Migrate old hash URLs (pre-M12) so shared links keep working:
// '#/album/1/slide/0' → '/nepal/1/0', etc. Album→country uses the album's
// primary country (manifest must be loaded first).
function migrateOldHash() {
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) return false;
  const oldPath = hash.slice(1); // '/album/1/slide/0'
  const m = oldRouter.match(oldPath);
  if (!m) return false;
  let newPath = '/';
  const albumCode = (id) => {
    const al = albumById(manifest, id);
    return al ? al.primary : null;
  };
  if (m.name === 'home') newPath = '/';
  else if (m.name === 'random') newPath = '/random';
  else if (['map', 'game', 'timeline'].includes(m.name)) newPath = `/${m.name}`;
  else if (m.name === 'country' || m.name === 'country-random') {
    const slug = slugFromCode(m.params.code);
    newPath = slug ? `/${slug}${m.name === 'country-random' ? '/random' : ''}` : '/';
  } else if (m.name === 'album' || m.name === 'slide') {
    const code = manifest ? albumCode(m.params.id) : null;
    if (code) {
      newPath = m.name === 'slide'
        ? `${albumPath(code, m.params.id)}/${m.params.idx}`
        : albumPath(code, m.params.id);
    }
  }
  window.history.replaceState({}, '', newPath);
  return true;
}

(async function boot() {
  render(); // shows loading state
  await loadManifest();
  migrateOldHash(); // needs the manifest for album→country
  render();

  if ('serviceWorker' in navigator) {
    // Auto-update: when a NEW sw.js installs it activates immediately
    // (skipWaiting + clients.claim) and fires controllerchange — reload once
    // so the page runs the fresh assets. This stops users getting stuck on a
    // stale build (the recurring cache gremlin). Not on first install.
    const hadController = !!navigator.serviceWorker.controller;
    let alreadyReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (shouldReloadForController({ alreadyReloaded, hadController })) {
        alreadyReloaded = true;
        window.location.reload();
      }
    });
    // Module worker so sw.js can import the shared routing policy from
    // src/lib/sw-strategy.js (universally supported in modern browsers).
    navigator.serviceWorker.register('/sw.js', { type: 'module' }).then((reg) => {
      // Proactively check for an update on each load.
      reg.update?.();
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }
})();
