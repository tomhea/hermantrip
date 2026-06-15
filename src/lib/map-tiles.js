// MapTiler vector style URLs for the map (M6). The custom Hebrew styles are
// vector GL styles served as a style JSON (raster .png tiles aren't available on
// this plan), so the map renders them with MapLibre GL (via maplibre-gl-leaflet)
// rather than Leaflet raster tiles. The key is a domain-restricted frontend key
// (see src/config.js) — the origin allowlist + free-tier quota are the
// protection, so it's safe in client code.
export const MAP_ATTRIBUTION =
  '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> · © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

// The MapLibre GL style JSON URL for a (Hebrew-labelled) custom style + key.
export function styleUrl({ style, key }) {
  return `https://api.maptiler.com/maps/${style}/style.json?key=${key}`;
}
