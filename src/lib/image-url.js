// The ONE place image URLs are constructed (R4).
//
// Images are served SAME-ORIGIN through the site's own `/img/` path, NOT
// hotlinked from Google. The browser fetching lh3 directly gets
// ERR_BLOCKED_BY_ORB once a client has made many cross-origin requests
// (Google's anti-hotlink throttle); a server fetching the identical URL
// always succeeds. So `/img/{id}/{width}` is proxied to
// `lh3.googleusercontent.com/d/{id}=w{width}` by Caddy in production (and
// by scripts/serve.mjs in dev), fetched once and cached (Cloudflare edge +
// immutable headers). Same-origin ⇒ no ORB, no per-visitor throttle.
//
// Width → path mapping is stable per (id, width), so the proxy response is
// immutable and infinitely cacheable.

// Drive file IDs are alphanumeric + `_` + `-`. Reject anything else so a
// caller can't inject path-breaking characters.
const FILE_ID_RE = /^[A-Za-z0-9_-]+$/;

// (base width, DPR cap) per intent. Widths are right-sized to the actual
// display size (M6):
//   thumb w280  ≈ 20 KB   (dense grid tile, ~116-165px CSS)
//   card  w720  ≈ 95 KB   (country/album preview hero, ~full-width on phone)
//   slide w1040 ≈ 160 KB  (phone slideshow, DPR2)
// `cap` stops us paying for resolution we'd never display (the source is
// capped at its native resolution regardless).
const INTENTS = {
  thumb:    { base: 140, cap: 280 },
  card:     { base: 360, cap: 720 },
  pin:      { base: 120, cap: 240 },
  slidePhone:   { base: 520, cap: 1080 },
  slideTablet:  { base: 760, cap: 1520 },
  slideDesktop: { base: 920, cap: 2000 },
  original: { base: 2400, cap: 2400, ignoreDpr: true },
};

export function imageUrl(fileId, intent, opts = {}) {
  if (typeof fileId !== 'string' || fileId.length === 0) {
    throw new Error('imageUrl: fileId required');
  }
  if (!FILE_ID_RE.test(fileId)) {
    throw new Error(`imageUrl: invalid fileId "${fileId}" — must match ${FILE_ID_RE}`);
  }

  // 'download' → the full original, with a server-set attachment header.
  if (intent === 'download') {
    return `/img/${fileId}/orig`;
  }

  const { dpr = 1, viewport = 'phone' } = opts;
  let key = intent;
  if (intent === 'slide') {
    key = viewport === 'phone' ? 'slidePhone'
        : viewport === 'tablet' ? 'slideTablet'
        : 'slideDesktop';
  }
  const spec = INTENTS[key];
  if (!spec) {
    throw new Error(`imageUrl: unknown intent "${intent}"`);
  }

  const width = spec.ignoreDpr
    ? spec.base
    : Math.min(spec.base * dpr, spec.cap);

  return `/img/${fileId}/${width}`;
}
