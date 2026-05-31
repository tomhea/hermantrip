// Boot: load manifest, mount the hash router, render views.
//
// Per R6 this file is the DOM-side wiring layer. It uses window/document/fetch
// freely. Pure logic stays in src/lib/.

import { createRouter } from './lib/router.js';
import { keyToAction, swipeToAction, preloadIndices } from './lib/slideshow-nav.js';
import { nextSpeed } from './lib/slideshow-speed.js';
import { nextTransition, DEFAULT_TRANSITION } from './lib/slideshow-transition.js';
import { nextLoopMode, DEFAULT_LOOP } from './lib/slideshow-loop.js';
import { parsePrefs, serializePrefs } from './lib/slideshow-prefs.js';
import { controlsVisible, CONTROLS_HIDE_MS } from './lib/controls-timer.js';
import { albumById, albumBySlug } from './lib/album-query.js';
import { sortPhotosByDate } from './lib/ordering.js';
import { imageUrl } from './lib/image-url.js';
import { codeFromSlug } from './lib/countries.js';
import { albumPath, slidePath, countryPath } from './lib/paths.js';
import { transformManifest } from './lib/album-transform.js';
import { shuffle } from './lib/random.js';
import { shouldReloadForController } from './lib/sw-update.js';
import { rememberScroll, recallScroll, isSlideOf } from './lib/scroll-store.js';
import { allPhotos, countryPhotos } from './lib/photo-pool.js';
import { renderCountryList } from './views/country-list.js';
import { renderAlbumList } from './views/album-list.js';
import { renderAlbumGrid } from './views/album-grid.js';
import { renderSlideshow } from './views/slideshow.js';
import { renderRandomShow } from './views/random-slideshow.js';
import { renderMap } from './views/map.js';
import { coordsForAlbum } from './lib/album-coords.js';
import {
  buildingsForGlobe, buildingHeightFraction, BUILDING_WIDTH, WINDOWS_PER_FLOOR, windowColumns,
} from './lib/globe-buildings.js';
import { trailSegments, arcPoints, trailArcs } from './lib/trail.js';
import { tripStopGroups, tripTrailPoints, ISRAEL, BANGKOK } from './lib/map-stops.js';
import { globeModuleUrl, threeModuleUrl } from './lib/globe-loader.js';
import { globePickerHTML } from './lib/globe-picker.js';
import { stopPopupHTML, albumHrefsForStops } from './lib/map-popup.js';
import { renderGame, renderGameCountry, renderGameAlbum, renderGameResult, renderGameDone } from './views/game.js';
import { renderTimeline, dayStripHTML } from './views/timeline.js';
import { buildTimeline, sliderValueToBucketIndex, scrollYToBucketIndex } from './lib/timeline.js';
import { eligibleAlbums, albumChoices, scoreCountry, scoreAlbum, generateRounds, TOTAL_ROUNDS, MAX_SCORE } from './lib/game.js';

// Clean-path routes (M12; album NAME slugs since M23). Order matters: literal
// first segments are listed before the /:country catch-all, and the more
// specific /:country/random & /:country/:album/:idx before /:country/:album,
// so first-match-wins resolves correctly.
const ROUTES = [
  { pattern: '/', name: 'home' },
  { pattern: '/random', name: 'random' },
  { pattern: '/map', name: 'map' },
  { pattern: '/game', name: 'game' },
  { pattern: '/timeline', name: 'timeline' },
  { pattern: '/day', name: 'day' },
  { pattern: '/day/:date', name: 'day-date' },
  { pattern: '/:country/random', name: 'country-random' },
  { pattern: '/:country/:album/:idx', name: 'slide' },
  { pattern: '/:country/:album', name: 'album' },
  { pattern: '/:country', name: 'country' },
];

const router = createRouter(ROUTES);
const app = document.getElementById('app');

let manifest = null;
let manifestError = null;

async function loadManifest() {
  try {
    // NOTE: no `cache: 'force-cache'`. Combined with the service worker's
    // fetch handler that flag could stall the very first page-load fetch
    // indefinitely (the SW bypasses the manifest, but force-cache during SW
    // activation raced and never resolved → the boot await hung and the app
    // stayed stuck on the "loading…" shell). A plain fetch with an explicit
    // timeout can never wedge boot. The SW already keeps the manifest fresh
    // (it's a bypass route) and Caddy sends `Cache-Control: no-cache`.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res;
    try {
      res = await fetch('/data/manifest.json', { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
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

function renderAlbum(params, fromPath) {
  const code = codeFromSlug(params.country);
  const res = manifest ? albumBySlug(manifest, code, params.album) : null;
  if (manifest && !res) { renderNotFound(currentPath()); return; }
  if (res && res.isAlias) {
    window.history.replaceState({}, '', albumPath(code, res.album.slug));
  }
  app.innerHTML = renderAlbumGrid({
    manifest, error: manifestError, code,
    id: res ? res.album.id : params.album, dpr: dpr(),
  });
  // Returning from this album's own slideshow → restore the prior scroll (#7);
  // arriving from anywhere else → start at the top.
  const here = currentPath();
  window.scrollTo(0, isSlideOf(fromPath, here) ? recallScroll(here) : 0);
}

function viewportClass() {
  if (window.matchMedia('(min-width: 1200px)').matches) return 'desktop';
  if (window.matchMedia('(min-width: 769px)').matches) return 'tablet';
  return 'phone';
}

// Path of the view rendered just before the current one — lets renderAlbum tell
// "returning from my own slideshow" (restore scroll, #7) apart from "arriving
// fresh from a country grid / deep link" (start at top). Updated in render().
let prevPath = null;

// SPA navigation: push a clean path and re-render (M12). Accepts a leading
// '#'-stripped path for back-compat with any caller still passing one.
function go(path) {
  if (!path) return;
  const clean = path.replace(/^#/, '');
  if (clean !== currentPath()) {
    const from = currentPath();
    // Opening a photo from an album → remember where we were so closing the
    // slideshow lands back at the same spot (#7).
    if (isSlideOf(clean, from)) rememberScroll(from, window.scrollY);
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
let slideTransition = DEFAULT_TRANSITION; // entry animation, cycled by the transition button (M31)
let slideLoopMode = DEFAULT_LOOP; // 'repeat' | 'continue', cycled by the loop button (M32)

// Persist the slideshow config picks (speed / transition / loop) across
// sessions (M32 / ask #4). localStorage access lives here in the wiring layer
// (src/lib stays pure, R6); slideshow-prefs.js handles validation. Autoplay is
// a transient play/pause control and is intentionally NOT persisted.
const SLIDESHOW_PREFS_KEY = 'hermantrip:slideshow';

function loadSlideshowPrefs() {
  let raw = null;
  try { raw = localStorage.getItem(SLIDESHOW_PREFS_KEY); } catch { /* storage blocked */ }
  const prefs = parsePrefs(raw);
  autoplaySpeed = prefs.speed;
  slideTransition = prefs.transition;
  slideLoopMode = prefs.loopMode;
}

function saveSlideshowPrefs() {
  try {
    localStorage.setItem(SLIDESHOW_PREFS_KEY, serializePrefs({
      speed: autoplaySpeed, transition: slideTransition, loopMode: slideLoopMode,
    }));
  } catch { /* storage blocked / full — non-fatal */ }
}

loadSlideshowPrefs();

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
  const res = manifest ? albumBySlug(manifest, code, params.album) : null;
  if (manifest && !res) { renderNotFound(currentPath()); return; }
  if (res && res.isAlias) {
    window.history.replaceState({}, '', slidePath(code, res.album.slug, params.idx));
  }
  const id = res ? res.album.id : params.album;
  app.innerHTML = renderSlideshow({
    manifest, error: manifestError, code, id, idx: params.idx,
    dpr: dpr(), viewport: viewportClass(), autoplay: autoplayOn, speed: autoplaySpeed,
    transition: slideTransition, loopMode: slideLoopMode,
  });
  window.scrollTo(0, 0);
  wireSlideshow();
  preloadNeighbours({ id, idx: params.idx });
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
    transition: slideTransition,
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

  // M33 / ask #8 — explicit "nothing" handle for a long-press on the tap-zones.
  // Long-pressing a side zone (an <a> in album mode, a <button> in random mode)
  // otherwise pops the context menu / link preview and feels like the side
  // grabbed the press. Swallow contextmenu on the zones so a long-press does
  // exactly nothing; a normal tap still navigates (click is unaffected).
  for (const zone of shell.querySelectorAll('.slideshow-zone')) {
    zone.addEventListener('contextmenu', (e) => e.preventDefault());
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
      saveSlideshowPrefs();
      render();
    });
  }

  // Transition button — cycle the entry animation (M31 / ask #1). Re-render so
  // the label updates and the next slide mounts with the new tr-<name> class.
  const trBtn = shell.querySelector('[data-transition-toggle]');
  if (trBtn) {
    trBtn.addEventListener('click', () => {
      slideTransition = nextTransition(slideTransition);
      saveSlideshowPrefs();
      render();
    });
  }

  // Loop button — toggle repeat-album ↔ continue-to-next-album (M32 / ask #3).
  const loopBtn = shell.querySelector('[data-loop-toggle]');
  if (loopBtn) {
    loopBtn.addEventListener('click', () => {
      slideLoopMode = nextLoopMode(slideLoopMode);
      saveSlideshowPrefs();
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

  wireShare(shell);
  wireInfoSize(shell);
  wireControls(shell);

  // (Re)schedule the auto-advance while autoplay is on. Each slide render
  // sets a fresh timer; navigating away clears it (see render()).
  stopAutoplayTimer();
  if (autoplayOn) {
    autoplayTimer = setTimeout(() => slideAdvance(shell, 1), autoplaySpeed);
  }
}

// Photo file-size lookup for the info panel "גודל" row (M43 / #6). The manifest
// has no size field, so we HEAD the original via the same-origin proxy and read
// Content-Length, lazily when the info panel first opens, cached per photo id.
const photoSizeCache = new Map(); // id → display string e.g. "5215KB"
function wireInfoSize(shell) {
  const details = shell.querySelector('.slideshow-info');
  const sizeEl = shell.querySelector('.info-size');
  if (!details || !sizeEl) return;
  const id = sizeEl.dataset.sizeId;
  if (!id) return;
  const fill = async () => {
    if (photoSizeCache.has(id)) { sizeEl.textContent = photoSizeCache.get(id); return; }
    try {
      const res = await fetch(`/img/${id}/orig`, { method: 'HEAD' });
      const len = res.headers.get('Content-Length');
      const txt = len ? `${Math.round(Number(len) / 1024).toLocaleString('he-IL')}KB` : '—';
      photoSizeCache.set(id, txt);
      sizeEl.textContent = txt;
    } catch {
      sizeEl.textContent = '—';
    }
  };
  details.addEventListener('toggle', () => { if (details.open) fill(); });
  if (details.open) fill();
}

// Brief transient confirmation toast (used by share/copy, M42).
let shareToastTimer = null;
function showToast(shell, msg) {
  let el = shell.querySelector('.slideshow-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'slideshow-toast';
    shell.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-visible');
  if (shareToastTimer) clearTimeout(shareToastTimer);
  shareToastTimer = setTimeout(() => el.classList.remove('is-visible'), 1800);
}

// Draw a same-origin <img> to a canvas → PNG blob (clipboard image write needs
// PNG). Same-origin /img/ proxy means the canvas isn't tainted.
function imageToPngBlob(img) {
  return new Promise((resolve, reject) => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

// Share menu (#4): copy link / copy picture / share link / share picture.
// Unsupported actions are hidden (no navigator.share / clipboard).
function wireShare(shell) {
  const share = shell.querySelector('.slideshow-share');
  if (!share) return;
  const photo = shell.querySelector('.slideshow-photo');
  const canShare = typeof navigator.share === 'function';
  const canCopy = !!(navigator.clipboard && navigator.clipboard.writeText);
  for (const btn of share.querySelectorAll('[data-share]')) {
    if (btn.dataset.shareKind === 'share' && !canShare) btn.hidden = true;
    if (btn.dataset.shareKind === 'copy' && !canCopy) btn.hidden = true;
  }
  if (![...share.querySelectorAll('[data-share]')].some((b) => !b.hidden)) {
    share.hidden = true; // nothing this browser can do
    return;
  }
  share.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    e.preventDefault();
    const url = location.href;
    try {
      if (btn.dataset.share === 'copy-link') {
        await navigator.clipboard.writeText(url);
        showToast(shell, 'הקישור הועתק');
      } else if (btn.dataset.share === 'share-link') {
        await navigator.share({ url });
      } else if (btn.dataset.share === 'copy-picture') {
        const png = await imageToPngBlob(photo);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
        showToast(shell, 'התמונה הועתקה');
      } else if (btn.dataset.share === 'share-picture') {
        const blob = await (await fetch(photo.src)).blob();
        const file = new File([blob], 'hermantrip.jpg', { type: blob.type || 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
        } else {
          await navigator.share({ url }); // fallback when file-share unsupported
        }
      }
    } catch { /* user cancelled / clipboard blocked — non-fatal */ }
    share.open = false;
  });
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
  e.preventDefault(); // Space would otherwise scroll the page
  if (action === 'exit') go(shell.dataset.exit);
  else if (action === 'playpause') {
    // M33 / ask #7 — Space toggles autoplay, like clicking the play button.
    autoplayOn = !autoplayOn;
    render();
  } else slideAdvance(shell, action === 'next' ? 1 : -1);
});

// ── Map + Globe (M18 / M21) ──────────────────────────────────────
// Country colors for map pins — match the design token palette.
const MAP_COUNTRY_COLORS = {
  np: '#5d7593', in: '#c8943d', vn: '#6b8459', cn: '#5d7593',
  au: '#b56439', nz: '#6b8459', th: '#c8943d',
};

let mapMode = 'map'; // 'map' | 'globe'
let leafletMapInstance = null; // reuse across mode-switches
let globeResizeHandler = null; // window resize listener while globe mounted (M28)

// Lazy-load Leaflet CSS+JS once.
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
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

// Lazy-load Globe.gl via dynamic import() — R5 compliant.
// The ESM module build exports the Globe factory as default.
let globePromise = null;
function loadGlobe() {
  if (globePromise) return globePromise;
  // esm.sh resolves Globe.gl's bare dependency specifiers (three, three-globe)
  // and serves browser-ready ESM — the unpkg .module.js build does NOT, so it
  // throws "Failed to resolve module specifier 'three'" with no import-map.
  // Still a dynamic import() on user toggle → R5-compliant.
  globePromise = import(/* @vite-ignore */ globeModuleUrl())
    .then((mod) => mod.default || mod)
    .catch((err) => {
      console.error('Globe.gl failed to load:', err);
      throw new Error('Globe.gl failed to load');
    });
  return globePromise;
}

// Load THREE for the globe "buildings" custom layer (M49). Same esm.sh spec +
// target as globe.gl's own three import → the browser shares ONE three module
// (a second instance would break globe.gl's WebGL renderer).
let threePromise = null;
function loadThree() {
  if (threePromise) return threePromise;
  threePromise = import(/* @vite-ignore */ threeModuleUrl())
    .then((mod) => mod)
    .catch((err) => { console.error('three.js failed to load:', err); throw err; });
  return threePromise;
}

const GLOBE_RADIUS = 100; // globe.gl's world-unit globe radius

// One reusable wall texture: a gray facade with a 2-window row per tile, lit
// glass. Cloned per building with a per-height vertical repeat (floors).
function buildingWallTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9aa1a8'; ctx.fillRect(0, 0, 64, 32);           // wall
  // WINDOWS_PER_FLOOR evenly-spaced windows per tile (M50: one per floor).
  for (const { x, w } of windowColumns(WINDOWS_PER_FLOOR, 64, 22)) {
    ctx.fillStyle = '#2f3946'; ctx.fillRect(x - 1, 6, w + 2, 20);  // frame
    ctx.fillStyle = '#86b0d6'; ctx.fillRect(x, 7, w, 18);          // glass
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, 7, w, 5); // sky glint
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 30, 64, 2); // floor line
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// A single box building: gray windowed body + a red pyramid roof. Built so its
// base sits at local y=0 and it extends +Y; main.js orients +Y radially.
function makeBuilding(THREE, heightUnits, wallTexBase) {
  const W = BUILDING_WIDTH;                    // slim footprint (a third of M49, #M50)
  const H = Math.max(1.8, heightUnits);       // floor so the windowed body always shows
  const group = new THREE.Group();

  const tex = wallTexBase.clone();
  tex.needsUpdate = true;
  tex.repeat.set(1, Math.max(1, Math.round(H / 1.6))); // one window row ≈ every 1.6 units
  const bodyGeo = new THREE.BoxGeometry(W, H, W);
  bodyGeo.translate(0, H / 2, 0);
  group.add(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xc2c8cd, map: tex })));

  // A small red pyramid CAP — modest so the gray windowed body dominates.
  const roofH = 0.7;
  const roofGeo = new THREE.ConeGeometry(W * 0.78, roofH, 4); // 4-sided = pyramid
  roofGeo.rotateY(Math.PI / 4);                                // square-align to box
  roofGeo.translate(0, H + roofH / 2, 0);
  group.add(new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xc0392b }))); // red roof
  return group;
}

// Plain-text label(s) for a pin's hover tooltip (#3) — city name(s).
function stopTooltipText(stops) {
  return [...new Set(stops.map((s) => s.label))].join(' · ');
}

// Wire SPA navigation for all popup links (called on popupopen).
function wirePopupLinks(marker) {
  const el = marker.getPopup().getElement();
  if (!el) return;
  for (const link of el.querySelectorAll('[data-href]')) {
    link.addEventListener('click', (e) => { e.preventDefault(); go(link.dataset.href); });
  }
}

// Init / update Leaflet map with clustered location markers.
// Is this segment the גבעת שמואל↔Bangkok long-haul leg (either direction)?
// Those two legs (outbound at the start, return at the end) overlap, so we arc
// them to opposite sides (#12).
function isIsraelBangkokLeg(seg) {
  const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-3 && Math.abs(p[1] - q[1]) < 1e-3;
  const a = seg.from, b = seg.to;
  return (near(a, ISRAEL) && near(b, BANGKOK)) || (near(a, BANGKOK) && near(b, ISRAEL));
}

// Draw the gradient trip trail + direction arrowheads onto a Leaflet map.
function drawTrail(L, map) {
  const points = tripTrailPoints(manifest);
  const segs = trailSegments(points);
  if (segs.length === 0) return;

  // One gradient polyline per segment (each carries its own colour), under the
  // markers (non-interactive). The two גבעת שמואל↔Bangkok legs are drawn as
  // bowed arcs (#12) so the green outbound and the red return don't overlap;
  // every other leg is a straight line. Each segment also gets its OWN
  // arrowhead at its midpoint (#9: at least one arrow between every pair of
  // nodes), rotated to the travel bearing and colour-matched.
  for (const seg of segs) {
    const arced = isIsraelBangkokLeg(seg);
    const path = arced ? arcPoints(seg.from, seg.to) : [seg.from, seg.to];
    L.polyline(path, {
      color: seg.color,
      weight: 2.5,
      opacity: 0.85,
      interactive: false,
    }).addTo(map);

    // Arrow sits at the path's midpoint (the arc's apex for arced legs).
    const mid = arced ? path[Math.floor(path.length / 2)] : [
      (seg.from[0] + seg.to[0]) / 2,
      (seg.from[1] + seg.to[1]) / 2,
    ];
    // 0° glyph points east(→); map bearing 90°=east, so rotate by (bearing-90).
    const rot = seg.bearing - 90;
    const icon = L.divIcon({
      className: 'trail-arrow-wrapper',
      html: `<div class="trail-arrow" style="color:${seg.color};transform:rotate(${rot}deg)">➤</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker(mid, { icon, interactive: false, keyboard: false }).addTo(map);
  }
}

async function initLeafletMap() {
  let L;
  try { L = await loadLeaflet(); } catch {
    const c = document.getElementById('map-container');
    if (c) c.innerHTML = '<p class="muted" style="padding:1rem">לא הצלחנו לטעון את המפה.</p>';
    return;
  }
  const container = document.getElementById('map-container');
  if (!container) return;

  if (leafletMapInstance) {
    // Re-use existing map instance when switching back from globe.
    leafletMapInstance.invalidateSize();
    return;
  }

  const map = L.map(container, { zoomControl: false });
  window._hermanMap = map;
  leafletMapInstance = map;
  L.control.zoom({ position: 'topleft' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const bounds = [];
  const stopGroups = tripStopGroups(manifest);

  // Trip trail (M24): a thin gradient polyline following the trip stop order
  // (green → red) with sparse arrowheads showing direction. Added BEFORE the
  // markers so pins sit on top.
  drawTrail(L, map);

  for (const { lat, lng, stops } of stopGroups) {
    bounds.push([lat, lng]);
    // Colour by the pin's country (per-city override for multi-city albums).
    const color = MAP_COUNTRY_COLORS[stops[0].country] || '#888';
    const hasAlbum = stops.some((s) => s.albumId);
    // Empty opening stops (no album) render as a hollow pin.
    const pinClass = hasAlbum ? 'map-pin' : 'map-pin map-pin-empty';

    const icon = L.divIcon({
      html: `<div class="${pinClass}" style="background:${color}"></div>`,
      className: 'map-pin-wrapper',
      iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10],
    });

    const marker = L.marker([lat, lng], { icon, title: stopTooltipText(stops) });
    // Hover tooltip: city name(s).
    marker.bindTooltip(stopTooltipText(stops), { direction: 'top', offset: [0, -8] });
    if (hasAlbum) {
      const hrefs = albumHrefsForStops(stops);
      if (hrefs.length === 1) {
        // Single-album pin → navigate DIRECTLY on click, no "pick 1 of 1"
        // popup (M52 / #3). The hover tooltip still names the city.
        marker.on('click', () => go(hrefs[0]));
      } else {
        // Multi-visited coordinate (2+ albums) → popup lists them.
        marker.bindPopup(stopPopupHTML(stops), { maxWidth: 240 });
        marker.on('popupopen', () => wirePopupLinks(marker));
      }
    }
    marker.addTo(map);
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });
}

// Init Globe.gl with album location points (loaded via dynamic import — R5).
// Mount the "choose which album" overlay for a multi-album globe point (#10).
// Appended INTO the globe container so it's auto-removed when the map view
// re-renders; the backdrop is fixed so it still covers the viewport. Closes on
// backdrop click, the ✕, or Escape; a link navigates (SPA) and closes.
function showGlobePicker(point, container) {
  const host = container || document.body;
  host.querySelectorAll('[data-globe-picker-backdrop]').forEach((e) => e.remove());
  const tmp = document.createElement('div');
  tmp.innerHTML = globePickerHTML(point.albums);
  const backdrop = tmp.firstElementChild;
  host.appendChild(backdrop);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    backdrop.remove();
    window.removeEventListener('keydown', onKey);
  }
  window.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-globe-picker-close]')) close();
  });
  for (const link of backdrop.querySelectorAll('[data-href]')) {
    link.addEventListener('click', (e) => { e.preventDefault(); close(); go(link.dataset.href); });
  }
}

async function initGlobeView() {
  let GlobeFn;
  try { GlobeFn = await loadGlobe(); } catch {
    const c = document.getElementById('globe-container');
    if (c) c.innerHTML = '<p class="muted" style="padding:1rem;color:#ccc">לא הצלחנו לטעון את הגלובוס.</p>';
    return;
  }
  const container = document.getElementById('globe-container');
  if (!container || container.dataset.globeReady) return;
  container.dataset.globeReady = '1';

  // THREE for the box-building layer (M49). If it fails, fall back to the
  // visible day-height markers so the globe still shows something.
  let THREE = null;
  try { THREE = await loadThree(); } catch { THREE = null; }

  // Buildings (#10b): one per visit, height ∝ days spent. Multi-visit cities
  // get several side-by-side buildings; a multi-place album splits its days.
  const buildings = buildingsForGlobe(manifest);
  const maxDays = Math.max(1, ...buildings.map((b) => b.days));
  const points = buildings.map((b) => ({
    lat: b.lat, lng: b.lng, days: b.days,
    country: b.country, // per-visit country → link to THIS country's shared album (#8)
    color: MAP_COUNTRY_COLORS[b.country] || '#888',
    label: b.album.title || b.album.name,
    albums: [b.album], // single album per building → onPointClick opens it directly
  }));

  const globe = GlobeFn({ animateIn: false })(container);
  window._hermanGlobe = globe; // test/debug handle (parallels window._hermanMap)
  // The points layer stays as the hover + click target (reusing onPointClick /
  // the picker). When THREE is available it's made INVISIBLE (transparent, flat)
  // and the visible markers become the 3D box buildings below; the click ray
  // still passes through the boxes to the underlying point. Without THREE we
  // fall back to visible day-height point markers.
  globe
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .backgroundColor('rgba(0,0,0,0)')
    .pointsData(points)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor(THREE ? () => 'rgba(0,0,0,0)' : 'color')
    .pointRadius(THREE ? 0.6 : 0.28)
    .pointAltitude(THREE ? 0 : (d) => 0.02 + (d.days / maxDays) * 0.45)
    .pointLabel((d) => `<div class="map-popup" style="direction:rtl">${
      d.albums.map(a => `<span class="map-popup-link">${escapeHTML(a.title || a.name)}</span>`).join('<br>')
    }</div>`)
    .onPointClick((d) => {
      // One album → open it directly. 2+ albums (a city visited more than
      // once, e.g. Bangkok ×3) → open a "choose which" picker (#10).
      if (d.albums.length === 1) {
        const a = d.albums[0];
        go(albumPath(d.country || a.primary, a.slug)); // THIS country's shared album (#8)
      } else {
        showGlobePicker(d, container);
      }
    });

  // Box buildings (M49 / #1): gray windowed boxes with red pyramid roofs,
  // height ∝ days (a quarter of the old cylinder height). One per visit; the
  // invisible points above carry hover + click. Custom three layer.
  if (THREE) {
    const wallTex = buildingWallTexture(THREE);
    const upAxis = new THREE.Vector3(0, 1, 0);
    globe
      .customLayerData(points)
      .customThreeObject((d) => makeBuilding(
        THREE, buildingHeightFraction(d.days, maxDays) * GLOBE_RADIUS, wallTex,
      ))
      .customThreeObjectUpdate((obj, d) => {
        const p = globe.getCoords(d.lat, d.lng, 0); // base on the surface
        obj.position.set(p.x, p.y, p.z);
        obj.quaternion.setFromUnitVectors(
          upAxis, new THREE.Vector3(p.x, p.y, p.z).normalize(), // stand up radially
        );
      });
  }

  // Trip trail on the globe (M47 / #10a): the same green→red route as the map
  // (incl. the flight-home closing leg), drawn as great-circle arcs. The
  // animated dash flow shows the travel direction — the globe's equivalent of
  // the map's per-segment arrowheads.
  globe
    .arcsData(trailArcs(tripTrailPoints(manifest)))
    .arcStartLat((d) => d.startLat)
    .arcStartLng((d) => d.startLng)
    .arcEndLat((d) => d.endLat)
    .arcEndLng((d) => d.endLng)
    .arcColor('color')
    .arcStroke(0.5)
    .arcAltitudeAutoScale(0.3)
    .arcDashLength(0.5)
    .arcDashGap(0.25)
    .arcDashAnimateTime(3000);

  // Size the globe canvas to the container so it's centred in its own area
  // (#5 — without explicit width/height globe.gl can render offset, esp. in
  // an RTL page). Re-apply on viewport resize while the globe is mounted.
  const sizeGlobe = () => {
    globe.width(container.clientWidth);
    globe.height(container.clientHeight);
  };
  sizeGlobe();
  // A second pass next frame, after layout settles (the container was just
  // un-hidden by the toggle), avoids a 0-width first measurement.
  requestAnimationFrame(sizeGlobe);
  if (globeResizeHandler) window.removeEventListener('resize', globeResizeHandler);
  globeResizeHandler = sizeGlobe;
  window.addEventListener('resize', globeResizeHandler);

  // Centre the initial point of view on מוי נה, Vietnam (#6).
  globe.pointOfView({ lat: 10.9332, lng: 108.2867, altitude: 2.2 }, 0);

  window._hermanGlobe = globe;
}

async function renderMapView() {
  app.innerHTML = renderMap({ manifest, error: manifestError, mode: mapMode });
  window.scrollTo(0, 0);
  if (!manifest) return;

  // Wire the map/globe toggle buttons.
  for (const btn of app.querySelectorAll('[data-map-mode]')) {
    btn.addEventListener('click', async () => {
      const newMode = btn.dataset.mapMode;
      if (newMode === mapMode) return;
      mapMode = newMode;
      // Re-render the header without destroying the containers.
      const mapEl = app.querySelector('#map-container');
      const globeEl = app.querySelector('#globe-container');
      if (mapEl)   mapEl.style.display   = mapMode === 'map'   ? '' : 'none';
      if (globeEl) globeEl.style.display = mapMode === 'globe' ? '' : 'none';
      for (const b of app.querySelectorAll('[data-map-mode]')) {
        const active = b.dataset.mapMode === mapMode;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      }
      if (mapMode === 'globe') await initGlobeView();
      else leafletMapInstance?.invalidateSize?.();
    });
  }

  // Always init Leaflet (it's the default view).
  await initLeafletMap();
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

// ── Timeline (M20; lazy-hydrated M26) ────────────────────────────
let timelineData = null;          // built once from manifest
let timelineObserver = null;      // IntersectionObserver over the day shells
let timelineScrollHandler = null; // window scroll listener (removed on leave)
let timelineResizeHandler = null; // window resize listener (removed on leave)

// Disconnect the timeline observer + scroll/resize listeners (called from
// render() when leaving the route so re-entry doesn't stack them).
function teardownTimeline() {
  if (timelineObserver) { timelineObserver.disconnect(); timelineObserver = null; }
  if (timelineScrollHandler) {
    window.removeEventListener('scroll', timelineScrollHandler);
    timelineScrollHandler = null;
  }
  if (timelineResizeHandler) {
    window.removeEventListener('resize', timelineResizeHandler);
    timelineResizeHandler = null;
  }
}

function renderTimelineView() {
  if (manifest && !timelineData) timelineData = buildTimeline(manifest);
  teardownTimeline(); // fresh wiring for this render
  app.innerHTML = renderTimeline({
    manifest, error: manifestError, timeline: timelineData, dpr: dpr(),
  });
  window.scrollTo(0, 0);

  if (!timelineData || timelineData.length === 0) return;
  const totalBuckets = timelineData.length;

  // Cached day-top offsets so the scroll handler does ZERO layout reads in its
  // hot path (#1b — it used to read offsetTop on all ~325 .tl-day every scroll
  // frame, forcing hundreds of reflows → jank). Recomputed only when heights
  // actually change: after first layout, after a strip hydrates, and on resize.
  let dayOffsets = [];
  let recomputeRaf = null;
  const recomputeOffsets = () => {
    dayOffsets = [...app.querySelectorAll('.tl-day')].map((el) => ({
      index: Number(el.dataset.bucketIndex),
      top: el.offsetTop,
    }));
  };
  const scheduleRecompute = () => {
    if (recomputeRaf) return;
    recomputeRaf = requestAnimationFrame(() => { recomputeRaf = null; recomputeOffsets(); });
  };

  // Fill one day shell's photo strip with its thumbnails (idempotent).
  const hydrate = (strip) => {
    const idx = Number(strip.dataset.bucketIndex);
    if (strip.dataset.hydrated || Number.isNaN(idx)) return;
    strip.dataset.hydrated = '1';
    strip.innerHTML = dayStripHTML(timelineData[idx], dpr());
    scheduleRecompute(); // hydrating changes heights → offsets below shift
  };

  // Lazy hydration: a day must stay on screen ~0.5s before its photos load
  // (empty date+blank strip first, photos after the dwell). Cancel the timer
  // if it scrolls away before firing. rootMargin pre-loads just-off-screen
  // days so slow scrolling stays ahead of the viewport.
  const pending = new Map(); // strip → timeout id
  timelineObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const strip = entry.target;
      if (entry.isIntersecting) {
        if (!pending.has(strip) && !strip.dataset.hydrated) {
          pending.set(strip, setTimeout(() => {
            pending.delete(strip);
            hydrate(strip);
            timelineObserver.unobserve(strip);
          }, 500));
        }
      } else {
        const id = pending.get(strip);
        if (id) { clearTimeout(id); pending.delete(strip); }
      }
    }
  }, { rootMargin: '300px 0px' });

  for (const strip of app.querySelectorAll('.tl-photo-strip')) {
    timelineObserver.observe(strip);
  }
  // Initial offset cache once layout has settled.
  requestAnimationFrame(recomputeOffsets);
  // Recompute on resize (debounced to a frame) — widths change strip wrapping.
  timelineResizeHandler = scheduleRecompute;
  window.addEventListener('resize', timelineResizeHandler, { passive: true });

  // Slider → jump to a day. All shells exist up front, so any index is
  // addressable; hydrate the target immediately so it isn't blank on arrival.
  const slider = app.querySelector('#tl-slider');
  const sliderLabel = app.querySelector('#tl-slider-label');
  if (!slider) return;

  slider.addEventListener('input', () => {
    const idx = sliderValueToBucketIndex(slider.value, totalBuckets);
    const label = timelineData[idx]?.label || '';
    if (sliderLabel) { sliderLabel.textContent = label; sliderLabel.value = label; }
    slider.setAttribute('aria-valuetext', label);
    const day = app.querySelector(`.tl-day[data-bucket-index="${idx}"]`);
    const strip = app.querySelector(`.tl-photo-strip[data-bucket-index="${idx}"]`);
    if (strip) hydrate(strip);
    if (day) day.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Scroll → update the slider position to the day nearest the top. Uses the
  // CACHED dayOffsets (no offsetTop reads here), so scrolling stays smooth.
  let scrollRaf = null;
  timelineScrollHandler = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      if (dayOffsets.length === 0) return;
      const idx = scrollYToBucketIndex(window.scrollY, dayOffsets);
      slider.value = idx;
      const label = timelineData[idx]?.label || '';
      if (sliderLabel) { sliderLabel.textContent = label; sliderLabel.value = label; }
    });
  };
  window.addEventListener('scroll', timelineScrollHandler, { passive: true });
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
  // Remember where we came from for this render, then advance prevPath for the
  // next one. Captured before any early return so it always tracks (#7).
  const fromPath = prevPath;
  prevPath = path;
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
  // Leaving the map: destroy Leaflet so the container can be re-created cleanly
  // on next visit (avoids "map is already initialized" errors).
  const leavingMap = match && match.name !== 'map';
  if (leavingMap && leafletMapInstance) {
    try { leafletMapInstance.remove(); } catch { /* ignore */ }
    leafletMapInstance = null;
    mapMode = 'map';
  }
  // Leaving the map also tears down the globe resize listener (M28).
  if (leavingMap && globeResizeHandler) {
    window.removeEventListener('resize', globeResizeHandler);
    globeResizeHandler = null;
  }
  // Leaving the timeline: disconnect its observer + scroll listener (M26).
  if (match && match.name !== 'timeline') teardownTimeline();
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
      renderAlbum(match.params, fromPath);
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
    case 'timeline':
      renderTimelineView();
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
// M34 / ask #6 — the per-album "play" button on the country page jumps to the
// album's first photo, starts autoplay, and goes fullscreen. requestFullscreen
// must run inside this user-gesture click; we fullscreen the persistent <html>
// (not #app) so the slide re-renders survive — same trick as the bar's
// fullscreen toggle. Delegated so it works across re-renders without wiring.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const playBtn = e.target.closest('[data-album-play]');
  if (!playBtn) return;
  e.preventDefault();
  autoplayOn = true;
  document.documentElement.requestFullscreen?.().catch(() => { /* not fatal */ });
  go(playBtn.dataset.slideHref);
});

// M41 / ask #3 — random-slideshow entry points (country-card play buttons +
// the "מצגת אקראית" links) start the random show autoplaying + fullscreen,
// like the album play button. Runs before the <a> handler below; preventDefault
// makes that handler bail (it checks defaultPrevented).
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const el = e.target.closest('[data-random-play]');
  if (!el) return;
  e.preventDefault();
  autoplayOn = true;
  document.documentElement.requestFullscreen?.().catch(() => { /* not fatal */ });
  go(el.dataset.href || el.getAttribute('href'));
});

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

(async function boot() {
  render(); // shows loading state
  await loadManifest();
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
