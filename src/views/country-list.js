// Country list view — the photo-forward home page (M2 redesign).
//
// Pure HTML-string builder: takes { manifest, error, dpr } and returns the HTML
// for #app. The 7 countries fill one no-scroll screen as photo tiles with the
// country name overlaid; a slim header carries the icon nav + theme toggle. Both
// the desktop (2/2/3) and phone (2/2/2/1) layer sets are emitted; CSS shows the
// right one per viewport/orientation (see main.css .home-layers). Tiles use a
// CSS background-image (not <img>), so there is no per-tile onerror hop.
//
// R3: no-data + fetch-failed render paths tested in country-list.test.mjs.

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { pickCountryThumb } from '../lib/country-thumb.js';
import { countryPath, randomPath } from '../lib/paths.js';
import { countryColor } from '../lib/country-colors.js';
import { icon } from '../lib/nav-icons.js';
import { homeLayers } from '../lib/home-layout.js';
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

function tile(country, manifest, dpr) {
  const thumb = pickCountryThumb(manifest, country.code);
  const total = manifest.albums
    .filter((a) => a.countries.includes(country.code))
    .reduce((s, a) => s + a.photos.length, 0);
  const bg = thumb
    ? `style="background-image:url('${imageUrl(thumb.id, 'card', { dpr })}')"`
    : `style="background:${countryColor(country.code)}"`;
  return `
    <a class="country-tile" href="${countryPath(country.code)}" ${bg}>
      <span class="country-tile-scrim" aria-hidden="true"></span>
      <span class="country-tile-name">${escapeHTML(country.he)}</span>
      <span class="country-tile-count">${total.toLocaleString('he-IL')} תמונות</span>
    </a>`;
}

function layersHTML(manifest, dpr, mode) {
  const byCode = new Map(manifest.countries.map((c) => [c.code, c]));
  const ordered = COUNTRY_ORDER.filter((code) => byCode.has(code));
  const layers = homeLayers(ordered, mode);
  return `<div class="home-layers" data-layers="${mode}">${
    layers.map((row, i) => {
      const tiles = row
        .filter((code) => byCode.has(code))
        .map((code) => tile(byCode.get(code), manifest, dpr))
        .join('');
      if (!tiles) return '';
      const finale = i === layers.length - 1 && mode === 'desktop' ? ' data-finale' : '';
      return `<div class="home-layer"${finale}>${tiles}</div>`;
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
      ${layersHTML(manifest, dpr, 'desktop')}
      ${layersHTML(manifest, dpr, 'phone')}
    </main>`;
}
