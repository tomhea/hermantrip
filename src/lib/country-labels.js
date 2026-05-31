// Hebrew country labels for the map (M58 / #2). Pure — no DOM, no fetch.
//
// The base map uses a LABEL-FREE tile style (so no English/local place names
// appear); these add the seven trip countries' names back, in Hebrew, at a
// representative coordinate within each country's trip region. City names stay
// Hebrew via the pin tooltips. The `he` text is sourced from countries.js so it
// never drifts from the canonical country names.

import { COUNTRIES } from './countries.js';

// Representative label coordinates [lat, lng] per country, placed over the part
// of the country the trip actually visited so the label sits near its pins.
const LABEL_COORDS = {
  np: [28.4, 84.0],    // central Nepal
  in: [27.5, 78.5],    // north India
  vn: [16.0, 107.5],   // central Vietnam
  cn: [29.5, 103.0],   // Sichuan / SW China (the trip's region)
  au: [-24.0, 134.0],  // central Australia
  nz: [-43.5, 171.0],  // South Island, NZ
  th: [16.5, 100.5],   // central Thailand
};

// → [{ code, he, lat, lng }] for every country that has a label coordinate.
export function countryMapLabels() {
  const heByCode = new Map(COUNTRIES.map((c) => [c.code, c.he]));
  return Object.entries(LABEL_COORDS).map(([code, [lat, lng]]) => ({
    code, he: heByCode.get(code), lat, lng,
  }));
}
