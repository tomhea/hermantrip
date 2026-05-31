// Slideshow transition options (M31 / ask #1). Pure — no DOM.
//
// The slideshow re-renders the whole shell on every navigation (a fresh <img>
// each time), so a "transition" here is a CSS *entry* animation that replays
// when the new slide mounts. The pick is just a name; the view stamps a
// `tr-<name>` class on the shell and `data-transition`, and main.js cycles it
// with the bar button. CSS in main.css maps each class to a @keyframes.
//
// Five choices, cycled by the bar button:
//   none     — instant cut (no animation)
//   fade     — opacity 0 → 1
//   zoom     — scale 1.06 → 1 with a fade
//   slide    — slides in from the side with a fade
//   kenburns — slow continuous pan/zoom across the dwell (great for autoplay)

export const TRANSITIONS = ['none', 'fade', 'zoom', 'slide', 'kenburns'];

export const DEFAULT_TRANSITION = 'fade';

const LABELS = {
  none: 'ללא',
  fade: 'עמעום',
  zoom: 'זום',
  slide: 'החלקה',
  kenburns: 'תנועה',
};

// Normalise an arbitrary value to a known transition (defaults to fade) so a
// stale/garbage persisted value can never break rendering.
export function normalizeTransition(t) {
  return TRANSITIONS.includes(t) ? t : DEFAULT_TRANSITION;
}

export function nextTransition(t) {
  const i = TRANSITIONS.indexOf(t);
  if (i === -1) return TRANSITIONS[0];
  return TRANSITIONS[(i + 1) % TRANSITIONS.length];
}

export function transitionLabel(t) {
  return LABELS[normalizeTransition(t)];
}

// CSS class the view stamps on the slideshow shell.
export function transitionClass(t) {
  return `tr-${normalizeTransition(t)}`;
}
