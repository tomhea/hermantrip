// Slideshow preference (de)serialization (M32 / ask #4). Pure — no DOM, no
// storage. main.js owns the localStorage read/write (the web-API wiring lives
// in the wiring layer, not here, per R6); this module just validates and
// normalises the persisted blob so a corrupt / partial / stale value can
// never break the slideshow.
//
// Persisted "picks": speed, transition, loop-mode. (Autoplay is a transient
// play/pause control, not a saved setting — it keeps its reset-on-exit
// behaviour.)

import { SPEEDS } from './slideshow-speed.js';
import { normalizeTransition, DEFAULT_TRANSITION } from './slideshow-transition.js';
import { normalizeLoop, DEFAULT_LOOP } from './slideshow-loop.js';

export const DEFAULT_SPEED = 4000;

export const DEFAULT_PREFS = Object.freeze({
  speed: DEFAULT_SPEED,
  transition: DEFAULT_TRANSITION,
  loopMode: DEFAULT_LOOP,
});

function normalizeSpeed(v) {
  return SPEEDS.includes(v) ? v : DEFAULT_SPEED;
}

// Validate/normalise a plain object of (possibly partial / untrusted) prefs.
export function normalizePrefs(obj) {
  const o = obj && typeof obj === 'object' ? obj : {};
  return {
    speed: normalizeSpeed(o.speed),
    transition: normalizeTransition(o.transition),
    loopMode: normalizeLoop(o.loopMode),
  };
}

// Parse the raw localStorage string → validated prefs. Any parse error or
// non-object yields the defaults (never throws).
export function parsePrefs(raw) {
  if (typeof raw !== 'string' || raw === '') return { ...DEFAULT_PREFS };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PREFS };
  }
  return normalizePrefs(parsed);
}

// Serialize prefs for storage (normalised first, so we never persist garbage).
export function serializePrefs(obj) {
  return JSON.stringify(normalizePrefs(obj));
}
