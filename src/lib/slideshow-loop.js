// Slideshow loop-mode pick (M32 / ask #3). Pure — no DOM.
//
// Two modes, cycled by the bar button:
//   repeat   — (default) autoplay/next wraps within the current album.
//   continue — at the album's last photo, autoplay/next jumps to the FIRST
//              photo of the NEXT album in the same country (wrapping round
//              the country). Lets a whole country play end-to-end.
//
// The button shows a monochrome glyph for the *current* mode (toggle style,
// like play/pause); the aria-label carries the Hebrew meaning.

export const LOOP_MODES = ['repeat', 'continue'];
export const DEFAULT_LOOP = 'repeat';

const GLYPHS = { repeat: '↺', continue: '↳' };
const ARIA = {
  repeat: 'חזרה על האלבום',
  continue: 'המשך לאלבום הבא במדינה',
};

export function normalizeLoop(m) {
  return LOOP_MODES.includes(m) ? m : DEFAULT_LOOP;
}

export function nextLoopMode(m) {
  const i = LOOP_MODES.indexOf(m);
  if (i === -1) return LOOP_MODES[0];
  return LOOP_MODES[(i + 1) % LOOP_MODES.length];
}

export function loopGlyph(m) {
  return GLYPHS[normalizeLoop(m)];
}

export function loopAriaLabel(m) {
  return ARIA[normalizeLoop(m)];
}
