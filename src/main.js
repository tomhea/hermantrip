// Boot: load manifest, mount the hash router, render views.
//
// Per R6 this file is the DOM-side wiring layer. It uses window/document/fetch
// freely. Pure logic stays in src/lib/.

import { parseHash, createRouter } from './lib/router.js';
import { keyToAction, swipeToAction, preloadIndices } from './lib/slideshow-nav.js';
import { nextSpeed } from './lib/slideshow-speed.js';
import { controlsVisible, CONTROLS_HIDE_MS } from './lib/controls-timer.js';
import { albumById } from './lib/album-query.js';
import { sortPhotosByFilename } from './lib/ordering.js';
import { imageUrl } from './lib/image-url.js';
import { renderCountryList } from './views/country-list.js';
import { renderAlbumList } from './views/album-list.js';
import { renderAlbumGrid } from './views/album-grid.js';
import { renderSlideshow } from './views/slideshow.js';

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

function viewportClass() {
  if (window.matchMedia('(min-width: 1200px)').matches) return 'desktop';
  if (window.matchMedia('(min-width: 769px)').matches) return 'tablet';
  return 'phone';
}

function go(href) {
  if (href) window.location.hash = href.replace(/^#/, '');
}

// Autoplay state persists across the re-render that each slide navigation
// triggers; the timer is rescheduled on every slide render while on.
let autoplayOn = false;
let autoplayTimer = null;
let autoplaySpeed = 4000; // ms between auto-advances; cycled by the speed button
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
  app.innerHTML = renderSlideshow({
    manifest, error: manifestError, id: params.id, idx: params.idx,
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
  const photos = sortPhotosByFilename(album.photos);
  const cur = Math.max(0, Math.min(photos.length - 1, Number.parseInt(params.idx, 10) || 0));
  const vp = viewportClass();
  for (const pi of preloadIndices(cur, photos.length)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = imageUrl(photos[pi].id, 'slide', { dpr: dpr(), viewport: vp });
    preloadRefs.push(img);
  }
}

// Attach swipe + autoplay-toggle handlers to the freshly-rendered slideshow.
// Click-zone + close navigation is plain <a href>; keyboard is global below.
function wireSlideshow() {
  const shell = app.querySelector('[data-slideshow]');
  if (!shell) return;
  const hrefs = {
    next: shell.dataset.next,
    prev: shell.dataset.prev,
    exit: shell.dataset.exit,
  };

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
      if (action) go(hrefs[action]);
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
    autoplayTimer = setTimeout(() => go(shell.dataset.next), autoplaySpeed);
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
  go(action === 'next' ? shell.dataset.next
    : action === 'prev' ? shell.dataset.prev
    : shell.dataset.exit);
});

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
  // Any navigation cancels a pending auto-advance; renderSlide reschedules
  // if we're landing on another slide and autoplay is still on. Leaving the
  // slideshow entirely turns autoplay back off so it doesn't silently resume.
  stopAutoplayTimer();
  if (!match || match.name !== 'slide') {
    autoplayOn = false;
    // Leaving the slideshow: drop out of fullscreen so the album/home view
    // isn't stuck filling the screen.
    if (document.fullscreenElement) document.exitFullscreen?.();
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
    // Module worker so sw.js can import the shared routing policy from
    // src/lib/sw-strategy.js (universally supported in modern browsers).
    navigator.serviceWorker.register('/sw.js', { type: 'module' }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }
})();
