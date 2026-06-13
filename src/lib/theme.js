// src/lib/theme.js
// Pure theme resolution. Storage + matchMedia access stays in main.js (R6).
export const THEMES = ['light', 'dark'];

// stored: 'light' | 'dark' | null (no/invalid preference). systemPrefersDark: bool.
export function resolveTheme(stored, systemPrefersDark) {
  if (stored === 'light' || stored === 'dark') return stored;
  return systemPrefersDark ? 'dark' : 'light';
}

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}
