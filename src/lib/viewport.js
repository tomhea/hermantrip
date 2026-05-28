// matchMedia-based viewport class helpers.
//
// Three breakpoints from docs/design.md: phone (default → 768px), tablet
// (769–1199px), desktop (≥1200px). Functions take a `matchMedia` function
// so they're trivially mockable in tests (R6 forbids touching `window`
// from src/lib/).

export const PHONE_QUERY = '(max-width: 768px)';
export const TABLET_QUERY = '(min-width: 769px) and (max-width: 1199px)';
export const DESKTOP_QUERY = '(min-width: 1200px)';

export function isPhone(matchMedia) {
  return matchMedia(PHONE_QUERY).matches;
}

export function isTablet(matchMedia) {
  return matchMedia(TABLET_QUERY).matches;
}

export function isDesktop(matchMedia) {
  return matchMedia(DESKTOP_QUERY).matches;
}
