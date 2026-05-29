// The ONE place app URLs (paths) are constructed (M12) — the routing
// counterpart of image-url.js. Views build links through these so the
// URL scheme lives in a single, testable module. Country args are internal
// CODES ('np'); the builders map to the English slug ('nepal').
//
//   /                      home
//   /nepal                 country
//   /nepal/random          country random slideshow
//   /nepal/1               album (1 = global album id)
//   /nepal/1/0             slide (photo index 0)
//   /random                all-countries random
//   /map  /game  /timeline feature pages
//   /day  /day/2011-07-23  random-day / a specific day

import { slugFromCode } from './countries.js';

export function homePath() { return '/'; }
export function countryPath(code) { return `/${slugFromCode(code)}`; }
export function countryRandomPath(code) { return `/${slugFromCode(code)}/random`; }
export function albumPath(code, id) { return `/${slugFromCode(code)}/${id}`; }
export function slidePath(code, id, idx) { return `/${slugFromCode(code)}/${id}/${idx}`; }
export function randomPath() { return '/random'; }
export function mapPath() { return '/map'; }
export function gamePath() { return '/game'; }
export function timelinePath() { return '/timeline'; }
export function dayPath(date) { return date ? `/day/${date}` : '/day'; }
