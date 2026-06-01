// Phone-landscape fullscreen policy (M59 / #5). Pure — no DOM, no fetch.
//
// On a phone held in landscape we want the page to go fullscreen so the browser
// URL bar disappears and the photos use the whole screen. The Fullscreen API
// needs a user gesture, so main.js arms a one-shot tap handler when this policy
// says "enter", and exits (no gesture needed) when it says "exit".
//
// "Phone landscape" = a landscape viewport that is SHORT (max-height ~500px) —
// phones in landscape are ≤~430px tall, while tablets/desktops are taller. This
// avoids UA sniffing.

// Decide the fullscreen action from the current state:
//   { landscapePhone, isFullscreen, ownedByLandscape }
// → 'enter' | 'exit' | null
//   - enter: it's a phone in landscape and we're not fullscreen yet.
//   - exit:  we're fullscreen because WE entered for landscape, and we're no
//            longer a phone in landscape (rotated to portrait / grew). We never
//            exit a fullscreen we didn't own (e.g. the slideshow's).
export function landscapeFullscreenAction({ landscapePhone, isFullscreen, ownedByLandscape }) {
  if (landscapePhone && !isFullscreen) return 'enter';
  if (!landscapePhone && isFullscreen && ownedByLandscape) return 'exit';
  return null;
}

// The media query that defines "phone in landscape". Exported so main.js and
// the test share one definition.
export const LANDSCAPE_PHONE_MEDIA = '(orientation: landscape) and (max-height: 500px)';
