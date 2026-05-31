// Flat ESLint config — the REAL guard against the class of outage that took
// hermantrip down (M28: `globeResizeHandler` used in 6 places, declared in
// none → `render()` threw ReferenceError at boot → whole SPA stuck on the
// "loading…" shell). `node --check` only checks syntax, unit tests never
// import main.js (the DOM layer), and module-eval succeeds because the throw
// is at boot-call time — so nothing caught it. ESLint `no-undef` does.
//
// Scope is deliberately narrow: this is a correctness gate, not a style pass.
// We enable the rules that catch "this name resolves to nothing at runtime"
// and leave everything else off so it never bikesheds a PR.
//
// Run via `npm run lint`; enforced in the test suite by
// src/lib/eslint-noundef.test.mjs so it can't be forgotten.

// Globals are enumerated inline rather than imported from the `globals`
// package: when ESLint runs via `npx eslint`, that package lives in npx's
// nested cache and is NOT resolvable from this project root (we have no
// node_modules). Hard-coding keeps the guard self-contained — the whole point
// of this file is that it runs reliably, offline, with zero project deps.
const READONLY = 'readonly';

// Browser runtime surface used by the app (src/main.js is the DOM layer).
const BROWSER = {
  window: READONLY, document: READONLY, console: READONLY, navigator: READONLY,
  location: READONLY, history: READONLY, localStorage: READONLY, sessionStorage: READONLY,
  fetch: READONLY, Request: READONLY, Response: READONLY, Headers: READONLY,
  setTimeout: READONLY, clearTimeout: READONLY, setInterval: READONLY, clearInterval: READONLY,
  requestAnimationFrame: READONLY, cancelAnimationFrame: READONLY, queueMicrotask: READONLY,
  IntersectionObserver: READONLY, MutationObserver: READONLY, ResizeObserver: READONLY,
  AbortController: READONLY, AbortSignal: READONLY, URL: READONLY, URLSearchParams: READONLY,
  Image: READONLY, Audio: READONLY, Event: READONLY, CustomEvent: READONLY,
  HTMLElement: READONLY, Element: READONLY, Node: READONLY, DOMParser: READONLY,
  getComputedStyle: READONLY, matchMedia: READONLY, screen: READONLY,
  performance: READONLY, crypto: READONLY, structuredClone: READONLY, scrollTo: READONLY,
  // Service-worker globals (sw.js).
  self: READONLY, caches: READONLY, clients: READONLY, skipWaiting: READONLY,
  ServiceWorkerGlobalScope: READONLY,
};

// Node runtime surface for test + script files.
const NODE = {
  process: READONLY, Buffer: READONLY, global: READONLY, globalThis: READONLY,
  __dirname: READONLY, __filename: READONLY, console: READONLY,
  setTimeout: READONLY, clearTimeout: READONLY, setInterval: READONLY, clearInterval: READONLY,
  setImmediate: READONLY, queueMicrotask: READONLY, URL: READONLY, URLSearchParams: READONLY,
  TextEncoder: READONLY, TextDecoder: READONLY, AbortController: READONLY, fetch: READONLY,
};

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'versions/**', 'data/**'],
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...BROWSER },
    },
    rules: {
      // The rule that would have caught the outage.
      'no-undef': 'error',
      // A name used before it is ever assigned is the same failure mode.
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
      // Cheap, high-signal correctness rules — all real bugs, no style.
      'no-undef-init': 'off',
      'no-unsafe-negation': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-func-assign': 'error',
      'no-unreachable': 'error',
      'no-cond-assign': ['error', 'except-parens'],
    },
  },
  {
    // Test + script files additionally run under Node — give them Node globals
    // (process, Buffer, __dirname-via-import.meta, etc.) so no-undef doesn't
    // false-positive on `process.exit`, `console`, timers, etc.
    files: ['**/*.test.{js,mjs}', 'scripts/**/*.{js,mjs}', 'eslint.config.mjs'],
    languageOptions: {
      globals: { ...NODE },
    },
  },
];
