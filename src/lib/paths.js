// The ONE place app URLs (paths) are constructed (M12) — the routing
// counterpart of image-url.js. Views build links through these so the
// URL scheme lives in a single, testable module. Country args are internal
// CODES ('np'); the builders map to the English slug ('nepal').
//
//   /                          home
//   /nepal                     country
//   /nepal/random              country random slideshow
//   /nepal/nagarkot-bhaktapur  album (album NAME slug, M23)
//   /nepal/nagarkot-bhaktapur/0  slide (photo index 0)
//   /random                    all-countries random
//   /map  /game  /timeline     feature pages
//   /day  /day/2011-07-23      random-day / a specific day

import { slugFromCode } from './countries.js';

export function homePath() { return '/'; }
export function countryPath(code) { return `/${slugFromCode(code)}`; }
export function countryRandomPath(code) { return `/${slugFromCode(code)}/random`; }
// `slug` is the album's canonical name slug (album.slug), not its numeric id (M23).
export function albumPath(code, slug) { return `/${slugFromCode(code)}/${slug}`; }
export function slidePath(code, slug, idx) { return `/${slugFromCode(code)}/${slug}/${idx}`; }
export function randomPath() { return '/random'; }
export function mapPath() { return '/map'; }
export function gamePath() { return '/game'; }
export function timelinePath() { return '/timeline'; }
export function dayPath(date) { return date ? `/day/${date}` : '/day'; }
