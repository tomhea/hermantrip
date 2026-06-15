// Public, domain-restricted MapTiler frontend config (M6).
//
// Safe to commit: the key is restricted to hermantrip.tomhe.app (+ dev origins)
// by an HTTP-referrer allowlist in the MapTiler dashboard, and protected by the
// free-tier quota — the origin allowlist is the real protection, not secrecy.
//
// The two styles are CUSTOM vector GL styles with Language = Hebrew (one light,
// one dark). They are served as a Mapbox/MapLibre style JSON, NOT raster tiles,
// so the map renders them with MapLibre GL (via the maplibre-gl-leaflet plugin),
// not Leaflet's raster tileLayer.
export const MAPTILER_KEY = 'OUybnuA5MexPL24HiRxa';
export const MAP_STYLE_LIGHT = '019ec2ac-c323-75f7-8412-1956975e448d';
export const MAP_STYLE_DARK = '019ec2b7-6b81-7c97-ad6a-7f6aa56bf3e7';
