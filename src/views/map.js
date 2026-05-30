// Map view — renders the shell for the Leaflet map + Globe toggle (M21).
//
// Pure HTML-string builder: main.js mounts the Leaflet map and/or Globe.gl
// into the respective containers after this HTML is injected into #app.
// Leaflet and Globe.gl are both loaded lazily.

import { errorHTML, loadingHTML } from '../lib/loading.js';

export function renderMap({ manifest, error, mode }) {
  if (error) return errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
  if (!manifest) return loadingHTML();

  const isGlobe = mode === 'globe';
  return `
    <div class="map-page">
      <header class="map-header">
        <a class="map-back" href="/">← חזרה</a>
        <h1 class="map-title">מפה</h1>
        <div class="map-toggle" role="group" aria-label="בחר תצוגה">
          <button class="map-toggle-btn${!isGlobe ? ' active' : ''}" data-map-mode="map" aria-pressed="${!isGlobe}">מפה</button>
          <button class="map-toggle-btn${isGlobe  ? ' active' : ''}" data-map-mode="globe" aria-pressed="${isGlobe}">גלובוס</button>
        </div>
      </header>
      <div id="map-container"   class="map-container"   style="${isGlobe  ? 'display:none' : ''}" role="application" aria-label="מפה גאוגרפית של האלבומים"></div>
      <div id="globe-container" class="globe-container" style="${!isGlobe ? 'display:none' : ''}" role="application" aria-label="גלובוס אינטראקטיבי של האלבומים"></div>
    </div>
  `;
}
