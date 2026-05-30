// Map view — renders the shell for the Leaflet map page.
//
// Pure HTML-string builder: main.js mounts the Leaflet map into
// #map-container after this HTML is injected into #app.
// Loading Leaflet JS lazily (only when the /map route is visited) keeps the
// initial bundle clean.

import { errorHTML, loadingHTML } from '../lib/loading.js';

export function renderMap({ manifest, error }) {
  if (error) return errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
  if (!manifest) return loadingHTML();

  return `
    <div class="map-page">
      <header class="map-header">
        <a class="map-back" href="/">← חזרה</a>
        <h1 class="map-title">מפה</h1>
      </header>
      <div id="map-container" class="map-container" role="application" aria-label="מפה גאוגרפית של האלבומים"></div>
    </div>
  `;
}
