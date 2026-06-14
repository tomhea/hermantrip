// Country list view — the photo-forward home page (M2 redesign; M63.1 polish).
//
// Pure HTML-string builder: takes { manifest, error, dpr } and returns the HTML
// for #app. The 7 countries fill one no-scroll screen as photo tiles with the
// country name overlaid; a slim header carries the icon nav + theme toggle. The
// 7 countries are grouped into the trip's 4 parts (np·in / vn·cn / au·nz / th).
// Two sets are emitted (desktop + phone) and CSS shows one: a 2x2 parts grid on
// desktop/landscape and a 2/2/2/1 stack on phone. Tiles use a CSS background-
// image (not <img>), preferring the curated per-country hero photo
// (country-hero.js); desktop uses the larger 'hero' image intent.
//
// R3: no-data + fetch-failed render paths tested in country-list.test.mjs.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { pickCountryThumb } from '../lib/country-thumb.js';
import { countryPath, randomPath } from '../lib/paths.js';
import { countryColor } from '../lib/country-colors.js';
import { icon } from '../lib/nav-icons.js';
import { homeLayers } from '../lib/home-layout.js';
import { heroPhotoId } from '../lib/country-hero.js';
import { COUNTRY_ORDER } from '../lib/countries.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function navHTML() {
  return `
    <a class="slim-nav" href="${randomPath()}" data-random-play data-href="${randomPath()}">${icon('slideshow')} מצגת<span class="nav-long"> אקראית</span></a>
    <a class="slim-nav" href="/map">${icon('map')} מפה</a>
    <a class="slim-nav" href="/game">${icon('game')} משחק<span class="nav-long"> ניחושים</span></a>
    <a class="slim-nav" href="/timeline">${icon('timeline')} ציר זמן</a>
    <button type="button" class="slim-nav slim-toggle" data-theme-toggle aria-label="מצב בהיר/כהה">${icon('moon')}${icon('sun')}</button>
  `;
}

function tile(country, manifest, dpr, intent) {
  // Prefer the hand-picked hero photo (M63.1); fall back to the auto-pick.
  const heroId = heroPhotoId(country.code);
  const thumb = heroId ? { id: heroId } : pickCountryThumb(manifest, country.code);
  const bg = thumb
    ? `style="background-image:url('${imageUrl(thumb.id, intent, { dpr })}')"`
    : `style="background:${countryColor(country.code)}"`;
  const total = manifest.albums
    .filter((a) => a.countries.includes(country.code))
    .reduce((s, a) => s + a.photos.length, 0);
  return `
    <a class="country-tile" href="${countryPath(country.code)}" data-code="${country.code}" ${bg}>
      <span class="country-tile-scrim" aria-hidden="true"></span>
      <span class="country-tile-name">${escapeHTML(country.he)}</span>
      <span class="country-tile-count">${total.toLocaleString('he-IL')} תמונות</span>
    </a>`;
}

// Both layouts share one structure: the trip's 4 parts (np·in / vn·cn / au·nz /
// th), each a row of its country tiles, in trip order. CSS arranges the parts as
// a 2x2 grid on desktop/landscape (each part a quadrant, clear RTL order) and as
// a vertical 2/2/2/1 stack on phone-portrait. Desktop tiles use the larger
// 'hero' image intent (crisp big tiles); phone uses 'card'. Only the visible set
// loads its images (the hidden one is display:none).
function partsHTML(manifest, dpr, mode) {
  const intent = mode === 'desktop' ? 'hero' : 'card';
  const byCode = new Map(manifest.countries.map((c) => [c.code, c]));
  const ordered = COUNTRY_ORDER.filter((code) => byCode.has(code));
  const parts = homeLayers(ordered, 'phone'); // [[np,in],[vn,cn],[au,nz],[th]]
  return `<div class="home-parts" data-layers="${mode}">${
    parts.map((part) => {
      const tiles = part
        .filter((code) => byCode.has(code))
        .map((code) => tile(byCode.get(code), manifest, dpr, intent))
        .join('');
      return tiles ? `<div class="home-part">${tiles}</div>` : '';
    }).join('')
  }</div>`;
}

function homeHeader() {
  return `
    <header class="slim-header home-header">
      <div class="slim-title-wrap">
        <h1 class="slim-title">הרמן בדרכים <span class="slim-sub">שנה אחת · שבע מדינות</span></h1>
      </div>
      <nav class="slim-actions">${navHTML()}</nav>
    </header>`;
}

export function renderCountryList({ manifest, error, dpr = 1 }) {
  const header = homeHeader();
  if (error) return `${header}${errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.')}`;
  if (!manifest) return `${header}${loadingHTML()}`;
  if (!Array.isArray(manifest.countries) || manifest.countries.length === 0) {
    return `${header}<p class="muted">אין מדינות להצגה.</p>`;
  }
  return `${header}
    <main class="home-fit">
      ${partsHTML(manifest, dpr, 'desktop')}
      ${partsHTML(manifest, dpr, 'phone')}
    </main>`;
}
