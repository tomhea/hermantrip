// Globe.gl module URL (fix/globe-load). Pure — no DOM, no fetch.
//
// Globe.gl must be loaded via a CDN that resolves its bare dependency
// specifiers (three, three-globe, …) into browser-loadable URLs. The raw
// unpkg `dist/globe.gl.module.js` build keeps the bare specifiers, so a
// plain `import()` of it throws "Failed to resolve module specifier 'three'"
// in any browser without an import-map — which is what produced the
// "לא הצלחנו לטעון את הגלובוס" error. esm.sh rewrites the whole dependency
// graph to absolute esm.sh URLs, so its entry module is import-map-free.
//
// Keeping the URL here (a) documents the contract and (b) lets a unit test
// guard against regressing to a bare-specifier build.

export const GLOBE_VERSION = '2.31.2';

export function globeModuleUrl() {
  return `https://esm.sh/globe.gl@${GLOBE_VERSION}`;
}
