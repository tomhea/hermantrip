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
import { codeFromSlug, COUNTRIES } from './lib/countries.js';
import { albumPath, slidePath, countryPath } from './lib/paths.js';
import { transformManifest } from './lib/album-transform.js';
import { shuffle } from './lib/random.js';
import { shouldReloadForController } from './lib/sw-update.js';
import { rememberScroll, recallScroll, isSlideOf } from './lib/scroll-store.js';
import { globeLoadingHTML } from './lib/loading.js';
import { landscapeFullscreenAction, LANDSCAPE_PHONE_MEDIA, shouldExitFullscreenOnNav } from './lib/fullscreen-policy.js';
import { progressiveChain } from './lib/progressive-img.js';
import { fitFontPx } from './lib/fit-text.js';
import { allPhotos, countryPhotos } from './lib/photo-pool.js';
import { renderCountryList } from './views/country-list.js';
import { renderAlbumList } from './views/album-list.js';
import { renderAlbumGrid } from './views/album-grid.js';
import { renderSlideshow } from './views/slideshow.js';
import { renderRandomShow } from './views/random-slideshow.js';
import { renderMap } from './views/map.js';
import { coordsForAlbum } from './lib/album-coords.js';
import { globeScene, buildingHeightFraction, BUILDING_WIDTH, WINDOWS_PER_FLOOR, windowColumns } from './lib/globe-pins.js';
import { greatCircleMidpoint, arcApexAltitude, arrowVisible } from './lib/globe-arrows.js';
import { trailSegments, arcPoints, trailArcs } from './lib/trail.js';
import { tripStopGroups, tripTrailPoints, ISRAEL, BANGKOK } from './lib/map-stops.js';
import { globeModuleUrl, threeModuleUrl } from './lib/globe-loader.js';
import { styleUrl, MAP_ATTRIBUTION } from './lib/map-tiles.js';
import { MAPTILER_KEY, MAP_STYLE_LIGHT, MAP_STYLE_DARK } from './config.js';
import { COUNTRY_COLORS as MAP_COUNTRY_COLORS } from './lib/country-colors.js';
import { globePickerHTML } from './lib/globe-picker.js';
import { stopPopupHTML, albumHrefsForStops } from './lib/map-popup.js';
import { renderGame, renderGameCountry, renderGameAlbum, renderGameResult, renderGameDone } from './views/game.js';
import { renderTimeline, dayStripHTML } from './views/timeline.js';
import { buildTimeline, sliderValueToBucketIndex, scrollYToBucketIndex } from './lib/timeline.js';
import { buildScrubberSegments, scrubToBucketIndex } from './lib/scrubber.js';
import { eligibleAlbums, albumChoices, countryChoices, scoreCountry, scoreAlbum, generateRounds, shouldCelebrate, nextRoundPhoto, TOTAL_ROUNDS, MAX_SCORE } from './lib/game.js';
import { resolveTheme, nextTheme } from './lib/theme.js';

const THEME_KEY = 'hermantrip:theme';
function currentTheme() {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch { /* blocked */ }
  return resolveTheme(stored, window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  if (theme !== 'dark') document.documentElement.removeAttribute('data-theme');
}
function toggleTheme() {
  const next = nextTheme(currentTheme());
  try { localStorage.setItem(THEME_KEY, next); } catch { /* blocked */ }
  applyTheme(next);
  render(); // re-render so the ☾/☀ glyph flips
}
window.addEventListener('click', (e) => {
  const t = e.target.closest('[data-theme-toggle]');
  if (t) { e.preventDefault(); toggleTheme(); }
});

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
  upgradeTileImages();
}

// Progressive home tiles (M63.3): each tile paints a tiny thumb immediately,
// then we preload the card and (on non-phones) the full-res hero and swap the
// background in as each finishes. Only the visible layout's tiles upgrade, and
// phones stop at the card to save data.
function upgradeTileImages() {
  const includeHero = !window.matchMedia('(max-width: 768px), (max-height: 500px)').matches;
  app.querySelectorAll('.country-tile[data-img-id]').forEach((tileEl) => {
    if (tileEl.offsetParent === null) return; // hidden set (display:none) — don't fetch
    const steps = progressiveChain(tileEl.getAttribute('data-img-id'), { dpr: dpr(), includeHero });
    let i = 1; // step 0 (thumb) is already the inline background
    const next = () => {
      if (i >= steps.length) return;
      const url = steps[i++];
      const pre = new Image();
      pre.onload = () => { tileEl.style.backgroundImage = `url('${url}')`; next(); };
      pre.onerror = next; // a broken step shouldn't stall the chain
      pre.src = url;
    };
    next();
  });
}

function renderCountry(params) {
  // params.country is the URL slug ('nepal'); views work in codes ('np').
  const code = codeFromSlug(params.country);
  app.innerHTML = renderAlbumList({ manifest, error: manifestError, code, dpr: dpr() });
  window.scrollTo(0, 0);
  fitTileSubs();
}

// Shrink any country-tile sub (count·dates) that would overflow its one line so
// the full text fits by reducing the font, instead of ellipsis-truncating it
// (M65.5). The proportional target is computed by the pure fitFontPx; we measure
// and apply here. Re-run on resize/orientation and once the web font loads (text
// width depends on the loaded font). No-op off the country page.
function fitTileSubs() {
  document.querySelectorAll('.album-tile-sub').forEach((el) => {
    el.style.fontSize = ''; // reset to the CSS default before measuring
    const cur = parseFloat(getComputedStyle(el).fontSize) || 14;
    const px = fitFontPx(el.scrollWidth, el.clientWidth, cur);
    if (px < cur) el.style.fontSize = `${px}px`;
  });
}
window.addEventListener('resize', fitTileSubs, { passive: true });
window.addEventListener('orientationchange', fitTileSubs);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTileSubs);

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

let mapMode = 'map'; // 'map' | 'globe'

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
    if (isSlideOf(clean, from)) rememberScroll(from, window.scrollY);
    // Encode the globe mode in the /map history entry before navigating away
    // so the browser back button restores the globe, not the default map.
    if (from === '/map' && mapMode === 'globe') {
      history.replaceState({ mapMode: 'globe' }, '', '/map');
    }
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
// M5: true while the previous render was a slideshow. Lets render() reveal the
// floating bar on FRESH entry (reset the idle clock) without resetting it on
// every slide-to-slide advance (which would re-pin the bar during autoplay).
let lastRenderInSlideshow = false;

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

// slideshow-ux #5: module refs keep the warmed neighbour Images alive (preventing
// GC) until the next render replaces them. nextSlideImg is the forward slide the
// autoplay load-gate waits on. autoplayGen invalidates a stale load/timeout
// callback from a previous slide so it can't advance the wrong one.
let nextSlideImg = null;
let prevSlideImg = null;
let autoplayGen = 0;

// Control-visibility state at module scope so it persists across the in-place
// updates / re-renders that slide advances perform. lastPointerActivityAt is the
// last REAL pointer activity (NOT reset by an advance), so autoplay auto-hides
// after the window; render() reveals it once on fresh slideshow entry.
let lastPointerActivityAt = 0;
let hoveringBar = false;
let controlsPollTimer = null;

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
  const html = renderSlideshow({
    manifest, error: manifestError, code, id, idx: params.idx,
    dpr: dpr(), viewport: viewportClass(), autoplay: autoplayOn, speed: autoplaySpeed,
    transition: slideTransition, loopMode: slideLoopMode,
  });
  mountSlideshow(html, 'album');
  preloadNeighbours({ id, idx: params.idx });
}

// Mount a slideshow's HTML. Advancing within the SAME slideshow (album↔album or
// random→random) updates IN PLACE — only the photo + control bar are swapped, so
// the dock + filmstrip stay standing (no "down & up" control flicker, no
// filmstrip teardown/re-scroll; slideshow-ux-2 #2/#7). Entry/exit (or switching
// flavour) does a full re-render.
let lastSlideshowKind = null; // 'album' | 'random' | null

function mountSlideshow(html, kind) {
  const existing = app.querySelector('[data-slideshow]');
  if (existing && lastSlideshowKind === kind && updateSlideInPlace(existing, html)) {
    wireSlideParts(existing); // re-wire only the swapped stage + bar
  } else {
    app.innerHTML = html;
    window.scrollTo(0, 0);
    wireSlideshow(); // full mount
  }
  lastSlideshowKind = kind;
}

// Swap only the <stage> (fresh <img> so the entry transition replays) and the
// control <bar> (reflects the new slide); copy the shell's data-*/style/class.
// The .slideshow-dock and .slideshow-filmstrip elements are left untouched so
// their visibility, scroll position and listeners survive the advance.
function updateSlideInPlace(shell, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  const fresh = tpl.content.querySelector('[data-slideshow]');
  const newStage = fresh && fresh.querySelector('.slideshow-stage');
  const newBar = fresh && fresh.querySelector('.slideshow-bar');
  const oldStage = shell.querySelector('.slideshow-stage');
  const oldBar = shell.querySelector('.slideshow-bar');
  if (!fresh || !newStage || !newBar || !oldStage || !oldBar) return false;
  // Keep the runtime classes main.js manages; take the rest (incl. tr-*) from fresh.
  const managed = ['is-fullscreen', 'controls-visible'].filter((c) => shell.classList.contains(c));
  shell.className = fresh.className;
  managed.forEach((c) => shell.classList.add(c));
  for (const a of Array.from(fresh.attributes)) {
    if (a.name !== 'class') shell.setAttribute(a.name, a.value);
  }
  oldStage.replaceWith(newStage);
  oldBar.replaceWith(newBar);
  return true;
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
  const vp = viewportClass();
  // Random has no per-photo URL, so compute the neighbour image URLs from the
  // in-memory playlist and pass them to the view (it emits data-next-img /
  // data-prev-img like the album view) — that drives preload + the autoplay
  // load-gate uniformly (slideshow-ux #5/#6).
  let nextImg = '';
  let prevImg = '';
  if (randomPlaylist && randomPlaylist.length > 1) {
    const nxt = randomPlaylist[(randomPos + 1) % randomPlaylist.length];
    const prv = randomPlaylist[(randomPos - 1 + randomPlaylist.length) % randomPlaylist.length];
    nextImg = imageUrl(nxt.photo.id, 'slide', { dpr: dpr(), viewport: vp });
    prevImg = imageUrl(prv.photo.id, 'slide', { dpr: dpr(), viewport: vp });
  }
  const html = renderRandomShow({
    manifest, error: manifestError, item, scope, exitHref,
    autoplay: autoplayOn, speed: autoplaySpeed, dpr: dpr(), viewport: vp,
    transition: slideTransition, nextImg, prevImg,
  });
  mountSlideshow(html, 'random');
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

// Full mount of a freshly-rendered slideshow. Split so an in-place advance can
// re-wire ONLY the swapped parts (wireSlideParts) without re-adding listeners on
// the persistent shell/dock/filmstrip (wireShellLevel).
function wireSlideshow() {
  const shell = app.querySelector('[data-slideshow]');
  if (!shell) return;
  wireShellLevel(shell);
  wireSlideParts(shell);
}

// Listeners on elements that SURVIVE an in-place slide advance — wired once per
// full mount: pointer-activity on the shell, dock hover, and filmstrip drag.
//
// slideshow-ux-3 #7: gate the "activity" + "hover" handlers to REAL MOUSE
// pointers. On a touchscreen the browser emulates mouse events (mouseenter /
// mousemove) when you tap, and an emulated mouseenter on the persistent dock had
// no matching mouseleave — leaving hoveringBar stuck true so the controls never
// auto-hid on phones. With pointer events gated to pointerType 'mouse', touch
// drives the auto-hide only through `touchstart` (one tap = one reveal, then it
// hides after the idle window); fullscreen/PC mouse behaviour is unchanged.
function wireShellLevel(shell) {
  shell.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') noteActivity(); });
  shell.addEventListener('touchstart', noteActivity, { passive: true });
  // Hover anywhere on the dock (bar OR filmstrip) keeps the controls alive — mouse only.
  const dock = shell.querySelector('.slideshow-dock');
  if (dock) {
    dock.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hoveringBar = true; noteActivity(); } });
    dock.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hoveringBar = false; noteActivity(); } });
  }
  const strip = shell.querySelector('[data-filmstrip]');
  if (strip) wireFilmstripDrag(strip);
}

// Handlers for the per-slide parts (stage + control bar) that get swapped on
// every advance. Re-run on full mount AND after each in-place update.
function wireSlideParts(shell) {
  // Random-mode prev/next zone buttons.
  for (const btn of shell.querySelectorAll('[data-nav]')) {
    btn.addEventListener('click', () => slideAdvance(shell, btn.dataset.nav === 'next' ? 1 : -1));
  }

  // M33 / ask #8 — explicit "nothing" handle for a long-press on the tap-zones.
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

  // Speed button — cycle the auto-advance interval.
  const speedBtn = shell.querySelector('[data-speed-toggle]');
  if (speedBtn) {
    speedBtn.addEventListener('click', () => {
      autoplaySpeed = nextSpeed(autoplaySpeed);
      saveSlideshowPrefs();
      render();
    });
  }

  // Transition button — cycle the entry animation (M31 / ask #1).
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

  // Fullscreen toggle. We fullscreen the PERSISTENT documentElement, not the
  // shell — navigation/autoplay re-render inside it and fullscreen survives.
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
  wireFilmstripToggle(shell);
  updateFilmstrip(shell);
  // Refresh control visibility on the persistent dock (no new listeners) — does
  // NOT reset the idle clock, so autoplay still auto-hides after the window.
  applyControls();

  // Warm the immediate next/prev slide images even when paused (slideshow-ux
  // #5b) and hold a ref to the next one for the autoplay load-gate below.
  warmNeighbourImages(shell);

  // (Re)schedule the auto-advance while autoplay is on. slideshow-ux #5a/#5c:
  // the dwell timer starts only AFTER the current photo has loaded, and we
  // advance only once the NEXT photo is fully downloaded — so a slow connection
  // never flips to a half-loaded image. A new render invalidates a pending
  // waiter via the generation token.
  stopAutoplayTimer();
  const gen = (autoplayGen += 1);
  if (autoplayOn) scheduleAutoAdvance(shell, gen);
}

function imgComplete(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

function warmNeighbourImages(shell) {
  const warm = (url) => {
    if (!url) return null;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    return img;
  };
  nextSlideImg = warm(shell.dataset.nextImg);
  prevSlideImg = warm(shell.dataset.prevImg);
}

function scheduleAutoAdvance(shell, gen) {
  const photo = shell.querySelector('.slideshow-photo');
  const startDwell = () => {
    if (gen !== autoplayGen || !autoplayOn) return;
    stopAutoplayTimer();
    autoplayTimer = setTimeout(() => advanceWhenNextReady(shell, gen), autoplaySpeed);
  };
  if (imgComplete(photo)) startDwell();
  else if (photo) {
    // Start the dwell only once the CURRENT photo has finished loading (#5a).
    // 'error' starts it too so a broken image never freezes the show.
    photo.addEventListener('load', startDwell, { once: true });
    photo.addEventListener('error', startDwell, { once: true });
  }
}

function advanceWhenNextReady(shell, gen) {
  if (gen !== autoplayGen || !autoplayOn) return;
  const img = nextSlideImg;
  if (imgComplete(img) || !img) { slideAdvance(shell, 1); return; }
  // Next photo not ready yet — keep showing the current one until it loads
  // (#5c), with a safety cap so a stalled fetch never freezes the show.
  let done = false;
  let cap = null;
  const go = () => {
    if (done) return;
    done = true;
    clearTimeout(cap);
    img.removeEventListener('load', go);
    img.removeEventListener('error', go);
    if (gen === autoplayGen && autoplayOn) slideAdvance(shell, 1);
  };
  cap = setTimeout(go, 15000);
  img.addEventListener('load', go);
  img.addEventListener('error', go);
}

// Photo file-size for the info panel "גודל" row (M43 / #6, reworked
// slideshow-ux-3 #2). The displayed photo is ALREADY downloaded, so instead of a
// second HEAD request we read the byte size of that very response from the
// Performance Resource Timing API (encodedBodySize). Same-origin /img/ proxy →
// timing is fully exposed. Falls back to '—' if timing isn't available yet.
function imageBytesFromTiming(url) {
  if (!url) return null;
  try {
    const entries = performance.getEntriesByName(url);
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const b = entries[i].encodedBodySize || entries[i].transferSize || 0;
      if (b > 0) return b;
    }
  } catch { /* Resource Timing unavailable — fall through */ }
  return null;
}
function wireInfoSize(shell) {
  const details = shell.querySelector('.slideshow-info');
  const sizeEl = shell.querySelector('.info-size');
  const photo = shell.querySelector('.slideshow-photo');
  if (!details || !sizeEl || !photo) return;
  const fill = () => {
    const bytes = imageBytesFromTiming(photo.currentSrc || photo.src);
    sizeEl.textContent = bytes != null
      ? `${Math.round(bytes / 1024).toLocaleString('he-IL')}KB`
      : '—';
  };
  details.addEventListener('toggle', () => { if (details.open) fill(); });
  // The timing entry exists once the photo has loaded; refill on load if the
  // panel was opened first.
  if (!(photo.complete && photo.naturalWidth > 0)) {
    photo.addEventListener('load', () => { if (details.open) fill(); }, { once: true });
  }
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

// On-demand filmstrip (M5 + slideshow-ux #2). The view ships an empty hidden
// `.slideshow-filmstrip` inside the persistent dock; the ▦ toggle reveals it and
// we build the album's thumbnail rail lazily. The open/closed state PERSISTS
// across slide advances (module scope) — once opened it stays open until the user
// re-presses ▦. Because the dock + strip survive an in-place advance, the strip
// is NOT torn down: on a same-album advance we only move the active "yellow
// frame" (no rebuild, no re-scroll — slideshow-ux-2 #2a); we rebuild only on
// first open or when the album changes. Each thumb is a plain <a href> — the
// global link handler does the SPA nav. Album slideshow only.
let filmstripOpen = false;

function wireFilmstripToggle(shell) {
  const toggle = shell.querySelector('[data-filmstrip-toggle]');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    filmstripOpen = !filmstripOpen;
    updateFilmstrip(shell);
    noteActivity(); // user action keeps the dock alive
  });
}

function updateFilmstrip(shell) {
  const strip = shell.querySelector('[data-filmstrip]');
  const toggle = shell.querySelector('[data-filmstrip-toggle]');
  if (!strip) return;
  strip.hidden = !filmstripOpen;
  if (toggle) toggle.setAttribute('aria-expanded', filmstripOpen ? 'true' : 'false');
  if (!filmstripOpen) return;
  const match = router.match(currentPath());
  if (!match || match.name !== 'slide' || !manifest) return;
  const code = codeFromSlug(match.params.country);
  const res = albumBySlug(manifest, code, match.params.album);
  if (!res) return;
  const album = res.album;
  const photos = sortPhotosByDate(album.photos);
  if (photos.length === 0) return;
  const cur = Math.max(0, Math.min(photos.length - 1, Number.parseInt(match.params.idx, 10) || 0));
  if (strip.dataset.albumId !== String(album.id) || strip.children.length === 0) {
    buildFilmstrip(strip); // first open or album changed → (re)build + centre active
  } else {
    // Same album → just move the yellow frame; DO NOT rebuild or re-scroll (#2a).
    strip.querySelectorAll('.filmstrip-thumb').forEach((el, idx) => {
      const on = idx === cur;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }
}

// Drag-to-scroll the filmstrip with a mouse (slideshow-ux #2). Touch already
// pans natively (CSS touch-action: pan-x) so we only handle mouse/pen here, and
// suppress the click that would otherwise follow a drag (so a drag never
// navigates to a slide).
function wireFilmstripDrag(strip) {
  let down = false; let startX = 0; let startScroll = 0; let moved = false;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // let native pan-x handle touch
    down = true; moved = false;
    startX = e.clientX; startScroll = strip.scrollLeft;
    strip.classList.add('is-dragging');
    try { strip.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
  });
  strip.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    strip.scrollLeft = startScroll - dx;
    noteActivity();
  });
  const end = () => { down = false; strip.classList.remove('is-dragging'); };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
  // Suppress native HTML drag-and-drop so dragging ON a thumbnail scrolls the
  // rail instead of starting an image ghost-drag (slideshow-ux-2 #2b).
  strip.addEventListener('dragstart', (e) => e.preventDefault());
  // Capture-phase: kill the click that ends a drag so it doesn't open a slide.
  strip.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
}

function buildFilmstrip(strip) {
  const match = router.match(currentPath());
  if (!match || match.name !== 'slide' || !manifest) return;
  const code = codeFromSlug(match.params.country);
  const res = albumBySlug(manifest, code, match.params.album);
  if (!res) return;
  const album = res.album;
  const photos = sortPhotosByDate(album.photos);
  if (photos.length === 0) return;
  const navCode = code || album.primary;
  const cur = Math.max(0, Math.min(photos.length - 1, Number.parseInt(match.params.idx, 10) || 0));
  strip.innerHTML = photos.map((p, idx) => {
    const u = imageUrl(p.id, 'thumb', { dpr: dpr() });
    const href = slidePath(navCode, album.slug, idx);
    const active = idx === cur ? ' is-active' : '';
    // draggable="false" so dragging a thumb scrolls the rail (drag handler)
    // instead of starting a native image ghost-drag (slideshow-ux-2 #2b).
    return `<a class="filmstrip-thumb${active}" href="${href}" draggable="false" aria-label="תמונה ${idx + 1}" aria-current="${idx === cur ? 'true' : 'false'}"><img src="${u}" alt="" draggable="false" loading="lazy" decoding="async" onerror="this.closest('.filmstrip-thumb').classList.add('photo-broken')"></a>`;
  }).join('');
  strip.dataset.albumId = String(album.id); // so updateFilmstrip can detect album changes
  const activeEl = strip.querySelector('.filmstrip-thumb.is-active');
  if (activeEl) activeEl.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// Control-bar visibility (M10 + M11 + M5).
//   - The floating bar auto-hides CONTROLS_HIDE_MS after the LAST REAL pointer
//     activity (mouse move / tap / hovering the bar) — in BOTH the windowed and
//     fullscreen viewers (M5: windowedAutoHide:true). It's crucially NOT reset
//     by slide re-renders, so autoplay no longer keeps it pinned on; render()
//     reveals it once on fresh slideshow entry.
function applyControls() {
  const shell = app.querySelector('[data-slideshow]');
  if (!shell) return;
  const fs = !!document.fullscreenElement;
  shell.classList.toggle('is-fullscreen', fs);
  const vis = controlsVisible({
    fullscreen: fs, lastActivityAt: lastPointerActivityAt,
    now: performance.now(), hoveringBar, windowedAutoHide: true,
  });
  shell.classList.toggle('controls-visible', vis);
  // While the bar is visible, keep polling so it hides once idle elapses
  // (windowed too now). When hidden, polling stops; pointer activity restarts it.
  if (controlsPollTimer !== null) { clearTimeout(controlsPollTimer); controlsPollTimer = null; }
  if (vis) controlsPollTimer = setTimeout(applyControls, 400);
}

function noteActivity() {
  lastPointerActivityAt = performance.now();
  applyControls();
}

// Entering/leaving fullscreen: reveal for the hide window on entry, and
// re-apply (constant bar) on exit.
// Phone-landscape fullscreen state (M59 / #5) — declared before the
// fullscreenchange listener that clears ownership on a manual exit.
let landscapeFsOwned = false;
let armedFsGesture = null;

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) lastPointerActivityAt = performance.now();
  // If fullscreen was dropped (incl. a manual exit), we no longer "own" it for
  // the landscape policy below.
  if (!document.fullscreenElement) landscapeFsOwned = false;
  applyControls();
});

// ── Phone-landscape fullscreen (M59 / #5) ────────────────────────
// On a phone held in landscape, hide the browser URL bar by going fullscreen.
// The Fullscreen API needs a user gesture, so we arm a one-shot tap handler
// when the policy says "enter"; we exit (no gesture needed) on rotate-to-portrait
// — but only a fullscreen WE entered, never the slideshow's.
function disarmFsGesture() {
  if (!armedFsGesture) return;
  document.removeEventListener('click', armedFsGesture, true);
  document.removeEventListener('touchend', armedFsGesture, true);
  armedFsGesture = null;
}
function evaluateLandscapeFullscreen() {
  if (!document.fullscreenEnabled) return;
  const landscapePhone = window.matchMedia(LANDSCAPE_PHONE_MEDIA).matches;
  const action = landscapeFullscreenAction({
    landscapePhone,
    isFullscreen: !!document.fullscreenElement,
    ownedByLandscape: landscapeFsOwned,
  });
  if (action === 'enter') {
    if (armedFsGesture) return; // already waiting for the tap
    armedFsGesture = () => {
      disarmFsGesture();
      if (!window.matchMedia(LANDSCAPE_PHONE_MEDIA).matches || document.fullscreenElement) return;
      // Claim ownership BEFORE the async request: tapping a home tile both enters
      // fullscreen and navigates, and the route handler exits fullscreen on a
      // non-slideshow nav — guarding on this flag stops that race from undoing us
      // (the "every 2nd press" bug). Reset if the request is refused.
      landscapeFsOwned = true;
      document.documentElement.requestFullscreen?.()
        .catch(() => { landscapeFsOwned = false; });
    };
    document.addEventListener('click', armedFsGesture, true);
    document.addEventListener('touchend', armedFsGesture, true);
  } else if (action === 'exit') {
    disarmFsGesture();
    document.exitFullscreen?.().catch(() => { /* non-fatal */ });
    landscapeFsOwned = false;
  } else if (!landscapePhone) {
    disarmFsGesture(); // no longer relevant
  }
}
window.matchMedia(LANDSCAPE_PHONE_MEDIA).addEventListener('change', evaluateLandscapeFullscreen);
window.addEventListener('orientationchange', evaluateLandscapeFullscreen);
window.addEventListener('resize', evaluateLandscapeFullscreen, { passive: true });

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
// M6: the map pins + globe pins now use the 7 DISTINCT per-country colours from
// the design palette (country-colors.js, imported above as MAP_COUNTRY_COLORS) —
// the old local map palette reused colours across countries.

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

// Lazy-load MapLibre GL + the maplibre-gl-leaflet bridge (M6). Only needed for
// the /map base layer (the custom Hebrew styles are vector, not raster), so it
// loads on demand alongside Leaflet — R5: >50 KB lib, dynamic, on user action.
// The plugin attaches `L.maplibreGL` and uses the global `maplibregl`.
const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const MAPLIBRE_LEAFLET_JS = 'https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.3/leaflet-maplibre-gl.js';
// RTL-text shaping plugin: without it MapLibre renders Hebrew/Arabic labels
// LEFT-TO-RIGHT (reversed — "אסיה" → "היסא"). Registered once on the global
// maplibregl; lazy=true so it only downloads when RTL text is actually drawn.
const MAPLIBRE_RTL_JS = 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js';
let maplibrePromise = null;
function loadMaplibreLeaflet() {
  if (maplibrePromise) return maplibrePromise;
  maplibrePromise = (async () => {
    await loadLeaflet(); // the plugin extends Leaflet
    if (!document.getElementById('maplibre-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-css'; link.rel = 'stylesheet'; link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }
    const loadJs = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(s);
    });
    if (!window.maplibregl) await loadJs(MAPLIBRE_JS);
    // Register RTL shaping BEFORE the style's Hebrew labels are laid out.
    try {
      const mgl = window.maplibregl;
      if (mgl && mgl.getRTLTextPluginStatus && mgl.getRTLTextPluginStatus() === 'unavailable') {
        mgl.setRTLTextPlugin(MAPLIBRE_RTL_JS, null, true); // lazy
      }
    } catch { /* already set / non-fatal */ }
    if (!(window.L && window.L.maplibreGL)) await loadJs(MAPLIBRE_LEAFLET_JS);
    return window.L.maplibreGL;
  })();
  return maplibrePromise;
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

// Load THREE for the globe "house" custom layer. Same esm.sh spec + target as
// globe.gl's own three import → the browser shares ONE three module (a second
// instance would break globe.gl's WebGL renderer).
let threePromise = null;
function loadThree() {
  if (threePromise) return threePromise;
  threePromise = import(/* @vite-ignore */ threeModuleUrl())
    .then((mod) => mod)
    .catch((err) => { console.error('three.js failed to load:', err); throw err; });
  return threePromise;
}

const GLOBE_RADIUS = 100; // globe.gl's world-unit globe radius

// Reusable gray windowed wall texture (WINDOWS_PER_FLOOR windows per tile, lit
// glass + darker frame). Cloned per house with a per-height vertical repeat.
function buildingWallTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9aa1a8'; ctx.fillRect(0, 0, 64, 32);
  for (const { x, w } of windowColumns(WINDOWS_PER_FLOOR, 64, 18)) {
    ctx.fillStyle = '#141a22'; ctx.fillRect(x - 2, 6, w + 4, 20);
    ctx.fillStyle = '#86b0d6'; ctx.fillRect(x, 7, w, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, 7, w, 5);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, 30, 64, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// A single house: gray windowed body + a PER-COUNTRY-coloured pyramid roof (the
// roof colour ties each house to its country, the polish over the old red roof).
function makeBuilding(THREE, heightUnits, wallTexBase, roofColor) {
  const W = BUILDING_WIDTH;
  const H = Math.max(1.8, heightUnits);
  const building = new THREE.Group();
  const tex = wallTexBase.clone();
  tex.needsUpdate = true;
  tex.repeat.set(1, Math.max(1, Math.round(H / 1.6)));
  const bodyGeo = new THREE.BoxGeometry(W, H, W);
  bodyGeo.translate(0, H / 2, 0);
  building.add(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xc2c8cd, map: tex })));
  const roofH = 0.7;
  const roofGeo = new THREE.ConeGeometry(W * 0.82, roofH, 4); // square pyramid
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.translate(0, H + roofH / 2, 0);
  building.add(new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: roofColor })));
  // The building rises along +Y, but globe.gl's OBJECTS layer orients an
  // object's local +Z radially outward. Tilt the building +90° about X (its +Y
  // → the group's +Z) and wrap it, so the tower STANDS UP on the surface while
  // globe.gl is free to set the outer group's facing quaternion.
  building.rotation.x = Math.PI / 2;
  const outer = new THREE.Group();
  outer.add(building);
  return outer;
}

// A small directional arrowhead for a trail segment: a slim cone whose tip
// points along +Y; main.js orients +Y to the travel direction so it reads like
// the 2D map's arrows. Kept SMALL (fix/globe-towers #1 — the old cone was too
// big) and placed on the arc apex so it sits on the line.
function makeArrow(THREE, color) {
  const cone = new THREE.ConeGeometry(0.45, 1.3, 12);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(cone, mat);
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

// The MapLibre GL style-JSON URL for the CURRENT theme (M6).
function currentMapStyleUrl() {
  const style = currentTheme() === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
  return styleUrl({ style, key: MAPTILER_KEY });
}

// Note (M6): the map themes on ENTRY — leaving /map destroys the Leaflet
// instance (see render()), so re-entering rebuilds it with currentMapStyleUrl()
// for the current theme. There is no theme toggle on the map page, so no live
// in-place style swap is needed (and forcing a re-render there would detach the
// reused container).

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
  // M6: vector Hebrew base map. The custom MapTiler styles bake Hebrew place
  // labels into a vector GL style, rendered into the Leaflet map by the
  // maplibre-gl-leaflet plugin (raster .png tiles aren't available for these
  // styles). Light/dark style chosen by theme; swapped live on theme toggle.
  // Falls back to label-free raster tiles if the GL plugin fails to load.
  try {
    await loadMaplibreLeaflet();
    L.maplibreGL({ style: currentMapStyleUrl(), attribution: MAP_ATTRIBUTION }).addTo(map);
  } catch {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', attribution: MAP_ATTRIBUTION, maxZoom: 19,
    }).addTo(map);
  }

  // M6: the manual Hebrew country-label overlay is GONE — the vector style now
  // renders Hebrew place + country labels (name:he) itself, so the overlay would
  // just duplicate them.

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
  // Portrait phone (#8): the fit-all view is too wide to read, so zoom in one
  // extra level (~×2) and recentre a bit east on פארה-פארה (Pare-pare, Sulawesi).
  if (window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches) {
    map.setView([-4.0135, 119.6255], map.getZoom() + 1, { animate: false });
  }
}

// Init Globe.gl with album location points (loaded via dynamic import — R5).
// Mount the "choose which album" overlay for a multi-album globe point (#10).
// Appended INTO the globe container so it's auto-removed when the map view
// re-renders; the backdrop is fixed so it still covers the viewport. Closes on
// backdrop click, the ✕, or Escape; a link navigates (SPA) and closes.
function showGlobePicker(point, container, title) {
  const host = container || document.body;
  host.querySelectorAll('[data-globe-picker-backdrop]').forEach((e) => e.remove());
  const tmp = document.createElement('div');
  tmp.innerHTML = globePickerHTML(point.albums, title);
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
  const container = document.getElementById('globe-container');
  if (!container || container.dataset.globeReady) return;
  container.dataset.globeReady = '1';

  // Starfield + "טוען את כדור הארץ…" painted IMMEDIATELY (M6 fix) — BEFORE the
  // heavy globe.gl download — so entering the globe shows stars at once instead
  // of a black gap. Removed once the globe is up. Sits above the canvas.
  container.innerHTML = globeLoadingHTML();

  let GlobeFn;
  try { GlobeFn = await loadGlobe(); } catch {
    container.innerHTML = '<p class="muted" style="padding:1rem;color:#ccc">לא הצלחנו לטעון את הגלובוס.</p>';
    return;
  }

  // One TOWER per coordinate, country-coloured roof, height ∝ days. Co-located
  // visits (Bangkok ×5) collapse into ONE tall tower (height ∝ Σ days); a click
  // opens a picker of those albums (#2). If THREE fails, fall back to visible
  // country-coloured points so the globe still shows something.
  let THREE = null;
  try { THREE = await loadThree(); } catch { THREE = null; }

  const scene = globeScene(manifest);
  // Attach the per-country colour each renderer reads.
  const houses = scene.houses.map((h) => ({ ...h, color: MAP_COUNTRY_COLORS[h.country] || '#888' }));
  const maxDays = Math.max(1, ...houses.map((b) => b.days));

  const globe = GlobeFn({ animateIn: false })(container);
  window._hermanGlobe = globe; // test/debug handle (parallels window._hermanMap)
  globe
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .backgroundColor('rgba(0,0,0,0)');

  // #4: max-anisotropy filtering sharpens the globe texture at grazing angles
  // (true close-up resolution is bounded by the source image — a bigger texture
  // asset would be the only further win).
  try {
    const mat = globe.globeMaterial && globe.globeMaterial();
    const renderer = globe.renderer && globe.renderer();
    if (mat && mat.map && renderer) {
      mat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mat.map.needsUpdate = true;
    }
  } catch { /* non-fatal */ }

  // A tower's hover tooltip + click behaviour (shared by the objects layer and
  // the no-THREE points fallback).
  const towerLabel = (d) => `<div class="map-popup" style="direction:rtl">${
    d.albums.map((a) => `<span class="map-popup-link">${escapeHTML(a.title || a.name)}</span>`).join('<br>')
  }</div>`;
  const openTower = (d) => {
    if (d.albums.length === 1) {
      const a = d.albums[0];
      go(albumPath(d.country || a.primary, a.slug)); // THIS country's shared album (#8)
    } else {
      showGlobePicker({ albums: d.albums }, container, d.label); // pick a visit (#2)
    }
  };

  if (THREE) {
    const wallTex = buildingWallTexture(THREE);
    // Houses in the OBJECTS layer so a click raycasts the actual house mesh
    // (#3) — the pressable spot IS the tower, not a wide invisible hit-point
    // spilling onto empty globe. objectFacesSurface orients the tower's +Y
    // radially outward so it stands up on the surface.
    globe
      .objectsData(houses)
      .objectLat('lat')
      .objectLng('lng')
      .objectAltitude(0)
      .objectFacesSurface(true)
      .objectLabel(towerLabel)
      .objectThreeObject((d) => makeBuilding(
        THREE, buildingHeightFraction(d.days, maxDays) * GLOBE_RADIUS, wallTex, d.color,
      ))
      .onObjectClick(openTower)
      .onObjectHover((o) => { container.style.cursor = o ? 'pointer' : ''; });

    // Directional arrowhead per trail segment, sitting ON the bowed arc:
    // placed at the segment's great-circle midpoint at the arc's apex altitude,
    // so it rides the line instead of floating beneath it. Arrows are dropped on
    // SHORT hops (arrowVisible) so dense clusters like Nepal/India don't pile up
    // an unreadable swarm — the trip-line still shows the route there.
    const upAxis = new THREE.Vector3(0, 1, 0);
    const arrows = trailSegments(scene.trailPoints)
      .filter((s) => arrowVisible(s.from, s.to))
      .map((s) => {
        const [mLat, mLng] = greatCircleMidpoint(s.from, s.to);
        return {
          lat: mLat, lng: mLng, alt: arcApexAltitude(s.from, s.to),
          toLat: s.to[0], toLng: s.to[1], color: s.color,
        };
      });
    globe
      .customLayerData(arrows)
      .customThreeObject((d) => makeArrow(THREE, d.color))
      .customThreeObjectUpdate((obj, d) => {
        const p = globe.getCoords(d.lat, d.lng, d.alt);
        const q = globe.getCoords(d.toLat, d.toLng, d.alt);
        obj.position.set(p.x, p.y, p.z);
        const fwd = new THREE.Vector3(q.x - p.x, q.y - p.y, q.z - p.z).normalize();
        obj.quaternion.setFromUnitVectors(upAxis, fwd); // tip → travel direction
      });
  } else {
    globe
      .pointsData(houses)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('color')
      .pointRadius(0.5)
      .pointAltitude((d) => buildingHeightFraction(d.days, maxDays))
      .pointLabel(towerLabel)
      .onPointClick(openTower)
      .onPointHover((p) => { container.style.cursor = p ? 'pointer' : ''; });
  }

  // Trip trail: SOLID, persistent great-circle lines threading the towers,
  // THIN so the unavoidable zoom-scaling of 3D tube width is far less
  // noticeable. Same green→red gradient as the 2D map. Each arc's apex altitude
  // matches arcApexAltitude(...) — the SAME value the arrowheads use — so the
  // arrows ride the apex of their arc (#1).
  globe
    .arcsData(trailArcs(scene.trailPoints))
    .arcStartLat((d) => d.startLat)
    .arcStartLng((d) => d.startLng)
    .arcEndLat((d) => d.endLat)
    .arcEndLng((d) => d.endLng)
    .arcColor('color')
    .arcStroke(0.28)
    .arcAltitude((d) => arcApexAltitude([d.startLat, d.startLng], [d.endLat, d.endLng]))
    .arcDashLength(1)
    .arcDashGap(0)
    .arcDashAnimateTime(0);

  // Size the globe canvas to the container. Only apply non-zero measurements so
  // a 0-size read (container momentarily hidden) never sticks. Re-apply on
  // resize AND orientationchange, each with a settle delay — fixes the
  // landscape-phone "only the top half shows" bug, where a portrait-measured
  // height stayed after rotating (#9).
  const sizeGlobe = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) { globe.width(w); globe.height(h); }
  };
  sizeGlobe();
  requestAnimationFrame(sizeGlobe);
  if (globeResizeHandler) {
    window.removeEventListener('resize', globeResizeHandler);
    window.removeEventListener('orientationchange', globeResizeHandler);
  }
  globeResizeHandler = () => { sizeGlobe(); setTimeout(sizeGlobe, 250); };
  window.addEventListener('resize', globeResizeHandler);
  window.addEventListener('orientationchange', globeResizeHandler);

  // Centre the initial point of view on מוי נה, Vietnam (#6).
  globe.pointOfView({ lat: 10.9332, lng: 108.2867, altitude: 2.2 }, 0);

  // Globe is up — drop the starfield loading overlay (#4). globe.gl appends its
  // canvas without clearing the container, so the overlay is still a child here.
  container.querySelector('.globe-loading')?.remove();

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

  // Always init Leaflet (it's the default view). If a render() landed us in globe
  // mode (e.g. a theme toggle re-render, or back-button to a globe-opened /map),
  // re-init the globe too since its container was just recreated.
  await initLeafletMap();
  if (mapMode === 'globe') await initGlobeView();
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
let gameCountryChoices = null;   // 4 country codes for the current round (M68.1)

function startGame() {
  if (!manifest) return;
  gameRounds = generateRounds(manifest);
  gameRoundIdx = 0;
  gameScore = 0;
  gameStep = 'country';
  gameCountryCorrect = false;
  gameAlbumCorrect = false;
  gameAlbumChoices = null;
  gameCountryChoices = null;
}

// M68.3: warm the next round's photo so it's already cached when the player
// advances (same trick as the slideshow's neighbour preload).
function preloadNextRoundPhoto() {
  const photo = nextRoundPhoto(gameRounds, gameRoundIdx);
  if (!photo) return;
  const img = new Image();
  img.src = imageUrl(photo.id, 'slide', { dpr: dpr(), viewport: viewportClass() });
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
    if (!gameCountryChoices) {
      gameCountryChoices = countryChoices(round.album.primary);
    }
    app.innerHTML = renderGameCountry({ ...base, choices: gameCountryChoices });
    wireGame();
    preloadNextRoundPhoto();   // warm the next question's image while this one plays (M68.3)
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
    // M68.4: confetti only on a perfect score (owner-approved the look).
    const celebrate = shouldCelebrate(gameScore, MAX_SCORE);
    app.innerHTML = renderGameDone({ score: gameScore, maxScore: MAX_SCORE, celebrate });
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
        gameCountryChoices = null;
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
  const segments = timelineData ? buildScrubberSegments(timelineData) : [];
  app.innerHTML = renderTimeline({
    manifest, error: manifestError, timeline: timelineData, segments, dpr: dpr(),
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
  // M8: the scrubber is a horizontal bar on desktop/landscape, a vertical right
  // rail on portrait phones. Set it on render + keep it fresh on resize/rotate.
  const applyScrubberOrient = () => {
    const sc = app.querySelector('.tl-scrubber');
    if (sc) {
      sc.dataset.orient = window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches ? 'rail' : 'bar';
    }
  };
  applyScrubberOrient();
  // Recompute on resize (debounced to a frame) — widths change strip wrapping.
  timelineResizeHandler = () => { applyScrubberOrient(); scheduleRecompute(); };
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

  // ── M8 scrubber: press/hold (touch) or hover/drag (mouse) shows a country+date
  // tooltip; release jumps there (reuses the slider's input→jump). Listeners live
  // on the freshly-rendered scrubber element, so they're GC'd on the next render.
  const scrubber = app.querySelector('.tl-scrubber');
  const tip = app.querySelector('.tl-tip');
  if (scrubber && tip) {
    const labelHe = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.he]));
    const bucketAt = (e) => {
      const r = scrubber.getBoundingClientRect();
      const frac = scrubber.dataset.orient === 'rail'
        ? (e.clientY - r.top) / r.height       // vertical rail: top = trip start
        : (r.right - e.clientX) / r.width;     // RTL bar: right edge = trip start
      return scrubToBucketIndex(frac, timelineData);
    };
    const showTip = (e) => {
      const idx = bucketAt(e);
      const bucket = timelineData[idx];
      if (!bucket) return idx;
      const name = labelHe[bucket.photos[0]?.album?.primary] || '';
      tip.textContent = name ? `${name} · ${bucket.label || ''}` : (bucket.label || '');
      tip.hidden = false;
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let x = e.clientX - tw / 2;
      let y = e.clientY - th - 12;
      x = Math.max(4, Math.min(window.innerWidth - tw - 4, x));
      if (y < 4) y = e.clientY + 16;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      return idx;
    };
    let scrubbing = false;
    scrubber.addEventListener('pointerdown', (e) => {
      scrubbing = true;
      try { scrubber.setPointerCapture(e.pointerId); } catch { /* not supported */ }
      showTip(e);
    });
    scrubber.addEventListener('pointermove', (e) => {
      if (scrubbing || e.pointerType === 'mouse') showTip(e);
    });
    const endScrub = (e) => {
      const idx = bucketAt(e);
      scrubbing = false;
      tip.hidden = true;
      if (Number.isInteger(idx)) {
        slider.value = idx;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    scrubber.addEventListener('pointerup', endScrub);
    scrubber.addEventListener('pointercancel', () => { scrubbing = false; tip.hidden = true; });
    scrubber.addEventListener('pointerleave', () => { if (!scrubbing) tip.hidden = true; });
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
  // M5: entering the slideshow fresh reveals the floating bar for the hide
  // window; advancing slide→slide does NOT reset the clock (keeps autoplay from
  // pinning the bar — the M11 fix).
  if (inSlideshow && !lastRenderInSlideshow) lastPointerActivityAt = performance.now();
  lastRenderInSlideshow = !!inSlideshow;
  if (!inSlideshow) {
    autoplayOn = false;
    // Leaving the slideshow: drop out of fullscreen so the album/home view
    // isn't stuck filling the screen, and forget the random playlist so the
    // next random visit reshuffles ("random each time"). But never exit a
    // fullscreen the landscape policy owns — that would undo the just-entered
    // phone-landscape fullscreen on the very tap that navigated (M63.3).
    if (shouldExitFullscreenOnNav({
      leavingToNonSlideshow: !inSlideshow,
      isFullscreen: !!document.fullscreenElement,
      landscapeOwned: landscapeFsOwned,
    })) {
      document.exitFullscreen?.();
    }
    randomPlaylist = null;
    randomScope = null;
  }
  // Leaving the map: destroy Leaflet so the container can be re-created cleanly
  // on next visit (avoids "map is already initialized" errors).
  const leavingMap = match && match.name !== 'map';
  // Destroy any existing Leaflet map at the top of EVERY render — renderMapView
  // rebuilds it fresh. This lets a theme toggle on /map re-theme the vector style
  // cleanly (M6 follow-up #6) without the reused container going stale, and still
  // cleans up when navigating away. (Mode-switch via the toggle buttons doesn't
  // call render(), so it's unaffected.)
  if (leafletMapInstance) {
    try { leafletMapInstance.remove(); } catch { /* ignore */ }
    leafletMapInstance = null;
  }
  if (leavingMap) {
    mapMode = 'map';
    // Leaving the map also tears down the globe resize listeners (M28).
    if (globeResizeHandler) {
      window.removeEventListener('resize', globeResizeHandler);
      window.removeEventListener('orientationchange', globeResizeHandler);
      globeResizeHandler = null;
    }
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

window.addEventListener('popstate', (e) => {
  // Restore globe mode when the user presses back to /map from a globe-opened
  // album (go() encodes {mapMode:'globe'} into the /map history entry).
  if (e.state?.mapMode) mapMode = e.state.mapMode;
  render();
});

// Migrate old hash URLs (pre-M12) so shared links keep working:
// '#/album/1/slide/0' → '/nepal/1/0', etc. Album→country uses the album's
// primary country (manifest must be loaded first).

(async function boot() {
  render(); // shows loading state
  evaluateLandscapeFullscreen(); // in case we load already in phone-landscape (#5)
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
