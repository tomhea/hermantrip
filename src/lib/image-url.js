// The ONE place Drive image URLs are constructed. R4 forbids raw
// `drive.google.com` / `lh3.googleusercontent.com` strings anywhere else.

const LH3_BASE = 'https://lh3.googleusercontent.com/d/';

// Drive file IDs are alphanumeric + `_` + `-`. Reject anything else so a
// caller can't accidentally inject URL-breaking characters.
const FILE_ID_RE = /^[A-Za-z0-9_-]+$/;

// (baseWidth, dprCap) per intent. Widths are right-sized to the actual
// display size (M6) — measured bytes for a representative photo:
//   thumb  w280  ≈ 20 KB  (grid tile is ~116-165px CSS; old w600 was 70 KB)
//   slide  w1040 ≈ 160 KB (phone, DPR2; old w1600 fetched the 243 KB original)
// The CDN caps at source resolution regardless, so `cap` only stops us
// paying bytes for resolution we'd never display.
const INTENTS = {
  thumb:    { base: 140, cap: 280 },
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

  return `${LH3_BASE}${fileId}=w${width}`;
}
