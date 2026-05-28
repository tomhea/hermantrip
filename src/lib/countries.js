// Country range definitions from docs/spec.md.
//
// Each entry: { code, he, en, albums: number[] }.
// `albums` is every album number belonging to that country — flattened from
// the contiguous ranges plus the cross-country special cases (Thailand's 1,
// 19, 37, and the Australia/China overlap on 37).
//
// `assignAlbumToCountries(id)` returns { countries: string[], primary: string }
// for a given album number. `primary` is the country code earliest in
// COUNTRY_ORDER, which mirrors docs/spec.md and the trip's chronological route.

function range(start, end) {
  const r = [];
  for (let i = start; i <= end; i += 1) r.push(i);
  return r;
}

export const COUNTRY_ORDER = ['np', 'in', 'vn', 'cn', 'au', 'nz', 'th'];

export const COUNTRIES = [
  { code: 'np', he: 'נפאל',     en: 'Nepal',       albums: range(1, 7) },
  { code: 'in', he: 'הודו',     en: 'India',       albums: range(8, 18) },
  { code: 'vn', he: 'ויאטנם',   en: 'Vietnam',     albums: range(20, 29) },
  { code: 'cn', he: 'סין',      en: 'China',       albums: range(30, 37) },
  { code: 'au', he: 'אוסטרליה', en: 'Australia',   albums: range(37, 53) },
  { code: 'nz', he: 'ניו זילנד', en: 'New Zealand', albums: range(54, 76) },
  { code: 'th', he: 'תאילנד',   en: 'Thailand',    albums: [1, 19, 37, ...range(77, 88)] },
];

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function assignAlbumToCountries(albumId) {
  if (typeof albumId !== 'number' || !Number.isInteger(albumId) || albumId < 1) {
    throw new Error(`Invalid album id: ${albumId}`);
  }
  const matched = [];
  for (const code of COUNTRY_ORDER) {
    if (COUNTRY_BY_CODE.get(code).albums.includes(albumId)) {
      matched.push(code);
    }
  }
  if (matched.length === 0) {
    throw new Error(`Album ${albumId} not in any country range — update docs/spec.md`);
  }
  return { countries: matched, primary: matched[0] };
}
