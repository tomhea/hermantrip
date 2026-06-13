# UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the brainstormed visual refresh of hermantrip.tomhe.app — warm light + dark themes, photo-forward layouts, a consistent slim header, distinct per-country colours, a new icon set, map/globe upgrades, and a chronological textured timeline — across all screens.

**Architecture:** Vanilla JS, native ES modules, no bundler. Pure logic in `src/lib/` (unit-tested with `node:test`), HTML-string view builders in `src/views/` (tested by asserting on the returned string), DOM/router/state wiring in `src/main.js`, styling in `src/styles/main.css` (tested by asserting on rule blocks). Hebrew RTL. Each milestone ships as its own cr-tdd-ladder branch/PR/tag.

**Tech Stack:** ES modules, `node --test`, ESLint flat config (`no-undef`), Leaflet + Globe.gl (lazy), Caddy reverse-proxy (VPS), service worker shell cache.

**Spec:** [docs/superpowers/specs/2026-06-13-ui-refresh-design.md](../specs/2026-06-13-ui-refresh-design.md)

---

## Before you start (executor prerequisites — read this first)

You are a fresh session with no prior context. Before touching code:

- **Read** `docs/HANDOFF.md` (architecture, the exact **deploy** command + how to assemble `dist/`, the SW `SHELL_CACHE`/`SHELL_FILES` rule) and `docs/cr-rules.md` (the CR-ist review rules; the R2 anti-AI checklist lives in `docs/design.md`).
- **Branch base:** this plan + the spec live on the **`ui-refresh-spec`** branch. Each milestone below branches off **`main`**. Either merge `ui-refresh-spec` into `main` first (it's docs-only), or read the plan via `git show ui-refresh-spec:docs/superpowers/plans/2026-06-13-ui-refresh.md` while working off `main`.
- **Run + verify locally:** `node scripts/serve.mjs` serves the site and the `/img/` proxy (HANDOFF). Use the preview tooling to eyeball screens. Tests: `npm test`; lint: `npx eslint@9 --max-warnings=0 .` (must be 0 / 0).
- **Per milestone:** build `dist/`, bump `sw.js` `SHELL_CACHE` + add any new module to `SHELL_FILES`, then PR → spawn the CR-ist (`Agent`, `subagent_type: crist`) → merge only on **APPROVED** → tag `v0.MN` → archive → deploy → verify live.
- **Secrets (Milestone 6 only):** the MapTiler **key** and the **light/dark Hebrew style IDs** are intentionally NOT in the repo. Ask the owner for them and fill `src/config.js` at M6. (The key is a domain-restricted frontend key — safe to commit once provided.)
- **Existing tests:** M2 replaces the home DOM — update any `country-list.test.mjs` assertions that reference the old `.country-card` / `.home-globe` / `.home-actions` structure. More generally, **read the current file before editing it** and match its established style; the view/CSS tasks give real snippets + the project's test patterns, not always a full file rewrite.

---

## Conventions for every milestone

- **Branch:** `git checkout -b mN-<slug>` off `main`.
- **Test runner:** `npm test` (= `node scripts/test.mjs` → `node --test` over all `*.test.mjs`). Run a single file with `node --test src/path/file.test.mjs`.
- **Lint:** `npx eslint@9 --max-warnings=0 .` (also runs inside the suite via `eslintnoundef.test.mjs`). Any new `src/**/*.js` must pass `no-undef`.
- **Service worker:** when a milestone adds a new `src/lib/*.js` or `src/views/*.js`, add it to `SHELL_FILES` in `sw.js` **and bump `SHELL_CACHE`** (`hermantrip-shell-v65` → next integer). One bump per milestone is enough.
- **PR body:** include FAIL-before / PASS-after test output. Spawn the CR-ist (`Agent`, `subagent_type: crist`); merge only on APPROVED; tag `v0.MN`; archive `dist/`; deploy; verify live.
- **Anti-AI checklist (`docs/design.md`):** no decorative gradients beyond functional photo scrims, **no `backdrop-filter`/glassmorphism**, no emoji in labels, Rubik only.

---

## File structure (created / modified across the plan)

**New `src/lib/`:**
- `country-colors.js` — the 7 distinct country colours + per-country texture id. (M1)
- `theme.js` — resolve/persist light·dark theme from storage + system. (M1)
- `view-header.js` — shared slim-header HTML builder (title/subtitle/back/actions). (M1)
- `nav-icons.js` — the SVG icon set (slideshow/map/game/timeline/sun/moon). (M1)
- `home-layout.js` — split the 7 countries into the desktop (2/2/3) and phone (2/2/2/1) layer groups. (M2)
- `scrubber.js` — build the chronological timeline scrubber segments. (M8)
- `country-motifs.js` — per-country SVG `<pattern>` defs for the timeline textures. (M8)
- `map-tiles.js` — build the MapTiler raster tile URL for a (Hebrew) style; map attribution. (M6)
- `config.js` — public, domain-restricted MapTiler frontend key + light/dark Hebrew style IDs. (M6)

**New `src/styles/`:** `*-css.test.mjs` guards per milestone (theme, home-fit, justified, slideshow, timeline-rail).

**Modified:** `src/styles/main.css` (every milestone), `src/main.js` (theme toggle, slideshow controls, map/globe, scrubber wiring), `src/views/country-list.js`, `album-list.js`, `album-grid.js`, `slideshow.js`, `game.js`, `timeline.js`, `map.js`, `index.html` (theme boot), `sw.js` (cache bump + new files).

---

# Milestone 1 — Foundations (tokens, themes, header, icons)

**Branch:** `m1-foundations`. Goal: the design system everything else builds on. No visible screen redesign yet beyond the theme toggle appearing and dark mode working on the existing home.

### Task 1.1 — Country colours

**Files:**
- Create: `src/lib/country-colors.js`
- Test: `src/lib/country-colors.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/country-colors.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { countryColor, COUNTRY_COLORS, countryMotifId } from './country-colors.js';
import { COUNTRY_ORDER } from './countries.js';

test('every country code has a distinct colour', () => {
  const colours = COUNTRY_ORDER.map((c) => countryColor(c));
  assert.equal(colours.length, 7);
  assert.equal(new Set(colours).size, 7, 'all 7 colours must be distinct');
  for (const col of colours) assert.match(col, /^#[0-9a-f]{6}$/i);
});

test('countryColor falls back to accent for unknown codes', () => {
  assert.equal(countryColor('xx'), '#b56439');
});

test('motif id is namespaced per country', () => {
  assert.equal(countryMotifId('np'), 'motif-np');
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Cannot find module './country-colors.js'`)

Run: `node --test src/lib/country-colors.test.mjs`

- [ ] **Step 3: Implement**

```js
// src/lib/country-colors.js
// The 7 distinct per-country colours (replaces the reused map palette).
// Used by map pins, globe markers, and the timeline scrubber/rail.
export const COUNTRY_COLORS = {
  np: '#4f7a8c', // teal-blue (mountains)
  in: '#d6a13f', // saffron
  vn: '#5f8f5a', // leaf green
  cn: '#a8423d', // red
  au: '#c97b3c', // ochre
  nz: '#3f7d6e', // deep teal
  th: '#8a5fa3', // orchid purple (recurring)
};

export function countryColor(code) {
  return COUNTRY_COLORS[code] ?? '#b56439';
}

export function countryMotifId(code) {
  return `motif-${code}`;
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `node --test src/lib/country-colors.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add src/lib/country-colors.js src/lib/country-colors.test.mjs
git commit -m "feat(m1): distinct per-country colour palette"
```

### Task 1.2 — Theme resolution + persistence

**Files:**
- Create: `src/lib/theme.js`
- Test: `src/lib/theme.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/theme.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolveTheme, nextTheme, THEMES } from './theme.js';

test('stored preference wins over system', () => {
  assert.equal(resolveTheme('dark', true), 'dark');
  assert.equal(resolveTheme('light', false), 'light');
});

test('no stored preference → follow system prefers-dark', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('invalid stored value is ignored (falls back to system)', () => {
  assert.equal(resolveTheme('purple', true), 'dark');
});

test('nextTheme toggles', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
  assert.deepEqual(THEMES, ['light', 'dark']);
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `node --test src/lib/theme.test.mjs`

- [ ] **Step 3: Implement**

```js
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
```

- [ ] **Step 4: Run it — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.js src/lib/theme.test.mjs
git commit -m "feat(m1): pure theme resolution (system default + persisted override)"
```

### Task 1.3 — Dark theme CSS tokens

**Files:**
- Modify: `src/styles/main.css` (`:root` block, lines 4-35)
- Test: `src/styles/theme-css.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// src/styles/theme-css.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');

test('dark tokens are defined under [data-theme="dark"]', () => {
  assert.match(css, /\[data-theme="dark"\]\s*\{/);
});
test('dark bg is the warm charcoal', () => {
  const m = css.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(m, 'dark block missing');
  assert.match(m[1], /--bg:\s*#1b1815/);
  assert.match(m[1], /--text:\s*#f3ece1/);
  assert.match(m[1], /--accent:\s*#cf7a4e/);
});
test('a --stage token exists for the slideshow surface', () => {
  assert.match(css, /--stage:\s*#211e1b/);
});
test('transitions on bg/color for a smooth theme switch', () => {
  assert.match(css, /body\s*\{[^}]*transition:[^}]*background/);
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `node --test src/styles/theme-css.test.mjs`

- [ ] **Step 3: Implement** — add to `src/styles/main.css` right after the `:root { … }` block (after line 35):

```css
:root { --stage: #efe7da; } /* slideshow stage — light theme */

[data-theme="dark"] {
  --bg: #1b1815;
  --surface: #262220;
  --text: #f3ece1;
  --text-muted: #b3a899;
  --accent: #cf7a4e;
  --accent-dim: #b9633a;
  --divider: #3a3531;
  --error: #c97b6b;
  --stage: #211e1b;
}

body { transition: background-color .2s ease, color .2s ease; }
```

(The slideshow stage uses `--stage`, which is charcoal in dark and warm-paper in light; the slideshow milestone overrides it to always-charcoal there.)

- [ ] **Step 4: Run it — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add src/styles/main.css src/styles/theme-css.test.mjs
git commit -m "feat(m1): dark-theme CSS tokens via [data-theme=dark]"
```

### Task 1.4 — Nav icon set

**Files:**
- Create: `src/lib/nav-icons.js`
- Test: `src/lib/nav-icons.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/nav-icons.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { icon, ICON_NAMES } from './nav-icons.js';

test('exposes the chosen icon set', () => {
  assert.deepEqual(
    [...ICON_NAMES].sort(),
    ['game', 'map', 'moon', 'slideshow', 'sun', 'timeline'].sort(),
  );
});
test('icon() returns an inline svg using currentColor (themeable)', () => {
  const svg = icon('map');
  assert.match(svg, /^<svg/);
  assert.match(svg, /currentColor/);
  assert.match(svg, /aria-hidden="true"/);
});
test('unknown icon returns empty string (never throws)', () => {
  assert.equal(icon('nope'), '');
});
```

- [ ] **Step 2: Run it — expect FAIL**
- [ ] **Step 3: Implement** — the chosen vectors (photo-stack / folded-map / two-dice / mirrored vertical-list / sun / moon). Strokes use `currentColor` so they inherit the accent and theme.

```js
// src/lib/nav-icons.js
// Curated SVG icon set (design.md: "curated handful", no emoji). currentColor
// so they theme with the surrounding text/accent colour.
const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
const ICONS = {
  // slideshow = photo stack
  slideshow: `<rect x="6" y="3" width="15" height="12" rx="2" ${P}/><circle cx="11" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="M21 12l-4-3-3 2M3 8v11a2 2 0 0 0 2 2h12" ${P}/>`,
  // map = folded map
  map: `<path d="M3 6l6-2 6 2 6-2v13l-6 2-6-2-6 2z" ${P}/><path d="M9 4v13M15 6v13" ${P}/>`,
  // game = two dice
  game: `<rect x="3" y="7" width="12" height="12" rx="2.5" ${P}/><circle cx="7" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="11" cy="15" r="1.1" fill="currentColor" stroke="none"/><rect x="11" y="3" width="10" height="10" rx="2.2" fill="var(--surface)" ${P}/><circle cx="14" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="10" r="1" fill="currentColor" stroke="none"/>`,
  // timeline = mirrored vertical list (line on the right, entries leftward)
  timeline: `<path d="M18 4v16" ${P}/><circle cx="18" cy="7" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="12.5" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="18" r="1.8" fill="currentColor" stroke="none"/><path d="M14 7H4M14 12.5H7M14 18H5" ${P}/>`,
  moon: `<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" ${P}/>`,
  sun: `<circle cx="12" cy="12" r="4.5" ${P}/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" ${P}/>`,
};
export const ICON_NAMES = Object.keys(ICONS);
export function icon(name) {
  if (!ICONS[name]) return '';
  return `<svg class="nav-icon" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">${ICONS[name]}</svg>`;
}
```

- [ ] **Step 4: Run it — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add src/lib/nav-icons.js src/lib/nav-icons.test.mjs
git commit -m "feat(m1): SVG nav icon set (themeable, currentColor)"
```

### Task 1.5 — Shared slim-header builder

**Files:**
- Create: `src/lib/view-header.js`
- Test: `src/lib/view-header.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/view-header.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { viewHeader } from './view-header.js';

test('renders title + inline subtitle on the right', () => {
  const html = viewHeader({ title: 'נפאל', subtitle: '6 אלבומים · 849' });
  assert.match(html, /class="slim-header"/);
  assert.match(html, /נפאל/);
  assert.match(html, /6 אלבומים · 849/);
});

test('renders a back link top-right when back is given', () => {
  const html = viewHeader({ title: 'נפאל', back: { href: '/', label: 'דף הבית' } });
  assert.match(html, /class="slim-back"[^>]*href="\/"/);
  assert.match(html, /→ דף הבית/);
});

test('no back link on the root (back omitted)', () => {
  const html = viewHeader({ title: 'הרמן בדרכים' });
  assert.equal(/slim-back/.test(html), false);
});

test('actions HTML is placed in the left action group', () => {
  const html = viewHeader({ title: 'x', actions: '<a class="z">y</a>' });
  assert.match(html, /class="slim-actions"[^>]*>\s*<a class="z">y<\/a>/);
});

test('escapes title/subtitle', () => {
  const html = viewHeader({ title: '<b>', subtitle: '"&"' });
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /&quot;&amp;&quot;/);
});
```

- [ ] **Step 2: Run it — expect FAIL**
- [ ] **Step 3: Implement**

```js
// src/lib/view-header.js
// Shared slim header: title (+ inline subtitle) on the RTL start (right),
// action group on the left, optional back link top-right. Pure HTML string.
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
export function viewHeader({ title, subtitle = '', back = null, actions = '' }) {
  const backHTML = back
    ? `<a class="slim-back" href="${escapeHTML(back.href)}" aria-label="${escapeHTML(back.label)}">→ ${escapeHTML(back.label)}</a>`
    : '';
  const sub = subtitle ? `<span class="slim-sub">${escapeHTML(subtitle)}</span>` : '';
  return `
    <header class="slim-header">
      <div class="slim-title-wrap">
        ${backHTML}
        <h1 class="slim-title">${escapeHTML(title)}${sub ? ` ${sub}` : ''}</h1>
      </div>
      <div class="slim-actions">${actions}</div>
    </header>
  `;
}
```

- [ ] **Step 4: Run it — expect PASS**
- [ ] **Step 5: Add the slim-header CSS** to `main.css` and a guard.

Append to `main.css`:

```css
/* Slim header — shared across screens */
.slim-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--space-3);
  background: color-mix(in srgb, var(--bg) 85%, var(--surface));
  border-bottom: 1px solid var(--divider);
  padding: var(--space-2) var(--space-3);
}
.slim-title { font-size: var(--type-h1); font-weight: 700; margin: 0; white-space: nowrap; }
.slim-sub { font-size: var(--type-small); font-weight: 300; color: var(--text-muted); margin-inline-start: var(--space-2); }
.slim-back { display: block; font-size: var(--type-small); color: var(--accent-dim); text-decoration: none; }
.slim-actions { display: flex; gap: var(--space-2); align-items: center; }
.nav-icon { vertical-align: -0.12em; }
```

Add `src/styles/slim-header-css.test.mjs` asserting `.slim-header` uses `justify-content: space-between` and `.slim-actions` is `display: flex` (same `ruleBlock` helper as `game-photo-css.test.mjs`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/view-header.js src/lib/view-header.test.mjs src/styles/main.css src/styles/slim-header-css.test.mjs
git commit -m "feat(m1): shared slim-header builder + styles"
```

### Task 1.6 — Wire the theme toggle into boot + main.js

**Files:**
- Modify: `index.html` (add a no-flash boot script in `<head>`)
- Modify: `src/main.js` (import `theme.js`, apply on boot, expose a toggle)
- Test: `src/lib/theme.test.mjs` already covers the logic; DOM wiring verified by live probe in the PR.

- [ ] **Step 1: No-flash theme boot** — add to `index.html` `<head>` (before the stylesheet) so the theme is set before first paint:

```html
<script>
  (function () {
    try {
      var s = localStorage.getItem('hermantrip:theme');
      var dark = (s === 'dark') || (!s && matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) {}
  })();
</script>
```

- [ ] **Step 2: Add toggle wiring in `src/main.js`** — near the top imports add `import { resolveTheme, nextTheme } from './lib/theme.js';` and a helper:

```js
const THEME_KEY = 'hermantrip:theme';
function currentTheme() {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch { /* blocked */ }
  return resolveTheme(stored, window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  if (theme !== 'dark') document.documentElement.removeAttribute('data-theme');
}
function toggleTheme() {
  const next = nextTheme(currentTheme());
  try { localStorage.setItem(THEME_KEY, next); } catch { /* blocked */ }
  applyTheme(next);
  render(); // re-render so the ☾/☀ glyph flips
}
window.addEventListener('click', (e) => {
  const t = e.target.closest('[data-theme-toggle]');
  if (t) { e.preventDefault(); toggleTheme(); }
});
```

- [ ] **Step 3: Verify** — `npm test` (0 fail) and `npx eslint@9 --max-warnings=0 .` (0 errors). Build `dist/`, bump `sw.js` `SHELL_CACHE` → `v66`, add `country-colors.js`, `theme.js`, `view-header.js`, `nav-icons.js` to `SHELL_FILES`. Deploy and confirm: toggling persists across reload; first paint matches system setting (no flash).

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js sw.js
git commit -m "feat(m1): boot theme (no flash) + toggle wiring + SW cache v66"
```

**M1 done →** PR, CR-ist, tag `v0.M62`, deploy.

---

# Milestone 2 — Home (2/2/3 desktop · 2/2/2/1 phone · landscape = desktop)

**Branch:** `m2-home`. Rework `country-list.js` so the home fits all 7 countries on one screen, photo-forward, names on photos, with the new slim header (icon nav + theme toggle).

### Task 2.1 — Home layer split (pure logic)

**Files:**
- Create: `src/lib/home-layout.js`
- Test: `src/lib/home-layout.test.mjs`

- [ ] **Step 1: Failing test**

```js
// src/lib/home-layout.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { homeLayers } from './home-layout.js';

const seven = ['np', 'in', 'vn', 'cn', 'au', 'nz', 'th'];

test('desktop: 3 layers 2/2/3 in trip order', () => {
  const layers = homeLayers(seven, 'desktop');
  assert.deepEqual(layers, [['np', 'in'], ['vn', 'cn'], ['au', 'nz', 'th']]);
});
test('phone: 4 layers 2/2/2/1 in trip order', () => {
  const layers = homeLayers(seven, 'phone');
  assert.deepEqual(layers, [['np', 'in'], ['vn', 'cn'], ['au', 'nz'], ['th']]);
});
test('the last desktop layer is the tall finale (3 wide)', () => {
  assert.equal(homeLayers(seven, 'desktop').at(-1).length, 3);
});
```

- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement**

```js
// src/lib/home-layout.js
// Split the ordered country codes into screen layers. Desktop/landscape = 2/2/3
// (final layer is the tall finale); phone-portrait = 2/2/2/1. Trip order in.
export function homeLayers(orderedCodes, mode) {
  const c = orderedCodes;
  if (mode === 'phone') return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6]]];
  return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5], c[6]]];
}
```

- [ ] **Step 4: Run — PASS** · **Step 5: Commit** (`feat(m2): home layer split helper`).

### Task 2.2 — Country tile with overlaid label + new home view

**Files:**
- Modify: `src/views/country-list.js`
- Test: `src/views/country-list.test.mjs` (extend)

- [ ] **Step 1: Add failing tests** to `country-list.test.mjs`:

```js
test('home tiles overlay the country name on the photo (no white meta box)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /class="country-tile"/);
  assert.match(html, /class="country-tile-name"/);
  assert.equal(/country-card-meta/.test(html), false); // old white meta box gone
});
test('home renders 3 desktop layers + 4 phone layers (both present, CSS shows one)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /data-layers="desktop"/);
  assert.match(html, /data-layers="phone"/);
});
test('nav uses the icon set + a theme toggle', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /class="nav-icon"/);
});
test('count rides as a hover-reveal sub-label (not always shown as a box)', () => {
  const html = renderCountryList({ manifest, dpr: 1 });
  assert.match(html, /class="country-tile-count"/);
});
```

(Keep the existing loading/error tests; remove/replace the old `.country-card`/`.home-globe` assertions if any fail — the header is replaced.)

- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement** — rewrite `renderCountryList` + helpers. Manifest country objects expose `code`, `he`; `pickCountryThumb`/`imageUrl` already exist. Use `countryColor`, `icon`, `homeLayers`, `countryPath`, `countryRandomPath`.

```js
import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { pickCountryThumb } from '../lib/country-thumb.js';
import { countryPath, randomPath, countryRandomPath } from '../lib/paths.js';
import { countryColor } from '../lib/country-colors.js';
import { icon } from '../lib/nav-icons.js';
import { homeLayers } from '../lib/home-layout.js';
import { COUNTRY_ORDER } from '../lib/countries.js';

function escapeHTML(s){return String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function navHTML() {
  return `
    <a class="slim-nav" href="${randomPath()}" data-random-play data-href="${randomPath()}">${icon('slideshow')} מצגת אקראית</a>
    <a class="slim-nav" href="/map">${icon('map')} מפה</a>
    <a class="slim-nav" href="/game">${icon('game')} משחק ניחושים</a>
    <a class="slim-nav" href="/timeline">${icon('timeline')} ציר זמן</a>
    <button type="button" class="slim-nav slim-toggle" data-theme-toggle aria-label="מצב בהיר/כהה">${icon('moon')}${icon('sun')}</button>
  `;
}

function tile(country, manifest, dpr) {
  const thumb = pickCountryThumb(manifest, country.code);
  const total = manifest.albums.filter((a) => a.countries.includes(country.code))
    .reduce((s, a) => s + a.photos.length, 0);
  const bg = thumb
    ? `style="background-image:url('${imageUrl(thumb.id, 'card', { dpr })}')"`
    : `style="background:${countryColor(country.code)}"`;
  return `
    <a class="country-tile" href="${countryPath(country.code)}" ${bg}>
      <span class="country-tile-scrim" aria-hidden="true"></span>
      <span class="country-tile-name">${escapeHTML(country.he)}</span>
      <span class="country-tile-count">${total.toLocaleString('he-IL')} תמונות</span>
    </a>`;
}

function layersHTML(manifest, dpr, mode) {
  const byCode = new Map(manifest.countries.map((c) => [c.code, c]));
  const ordered = COUNTRY_ORDER.filter((code) => byCode.has(code));
  const layers = homeLayers(ordered, mode);
  return `<div class="home-layers" data-layers="${mode}">${
    layers.map((row, i) => `<div class="home-layer"${i === layers.length - 1 && mode === 'desktop' ? ' data-finale' : ''}>${
      row.map((code) => tile(byCode.get(code), manifest, dpr)).join('')
    }</div>`).join('')
  }</div>`;
}

export function renderCountryList({ manifest, error, dpr = 1 }) {
  const header = `
    <header class="slim-header home-header">
      <div class="slim-title-wrap">
        <h1 class="slim-title">הרמן בדרכים <span class="slim-sub">שנה אחת · שבע מדינות</span></h1>
      </div>
      <nav class="slim-actions">${navHTML()}</nav>
    </header>`;
  if (error) return `${header}${errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.')}`;
  if (!manifest) return `${header}${loadingHTML()}`;
  if (!Array.isArray(manifest.countries) || manifest.countries.length === 0) {
    return `${header}<p class="muted">אין מדינות להצגה.</p>`;
  }
  return `${header}
    <main class="home-fit">
      ${layersHTML(manifest, dpr, 'desktop')}
      ${layersHTML(manifest, dpr, 'phone')}
    </main>`;
}
```

- [ ] **Step 4: Run — PASS** (`node --test src/views/country-list.test.mjs`)
- [ ] **Step 5: Commit** (`feat(m2): photo-forward home — overlaid tiles, icon nav, theme toggle`).

### Task 2.3 — Home fit-to-viewport CSS (no scroll) + responsive layers

**Files:** Modify `src/styles/main.css`; Test `src/styles/home-fit-css.test.mjs`.

- [ ] **Step 1: Failing CSS test**

```js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const css = readFileSync(fileURLToPath(new URL('./main.css', import.meta.url)), 'utf8');
function block(sel){const re=new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}\\s*\\{([^}]*)\\}`);const m=css.match(re);return m?m[2]:null;}

test('.home-fit fills the viewport and does not scroll', () => {
  const b = block('.home-fit');
  assert.ok(b); assert.match(b, /height:\s*(100svh|100vh|calc\()/); assert.match(b, /overflow:\s*hidden/);
});
test('desktop layers hidden on phone, phone layers hidden on desktop', () => {
  assert.match(css, /\[data-layers="phone"\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /min-width:\s*769px[^]*\[data-layers="desktop"\]\s*\{[^}]*display:\s*none/);
});
test('the finale desktop layer grows taller', () => {
  assert.match(css, /\.home-layer\[data-finale\]\s*\{[^}]*flex:\s*1\.5/);
});
test('country-tile name sits on the photo with a scrim', () => {
  assert.ok(block('.country-tile-name')); assert.ok(block('.country-tile-scrim'));
});
test('count is hidden until hover (desktop)', () => {
  assert.match(css, /\.country-tile-count\s*\{[^}]*opacity:\s*0/);
});
```

- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement** — append to `main.css`:

```css
/* Home — fit all 7 on one screen */
.home-header { /* slim; shares .slim-header */ }
.home-fit {
  height: calc(100svh - 3rem);  /* minus the slim header */
  overflow: hidden;
  display: flex; flex-direction: column;
  padding: var(--space-1); gap: var(--space-1);
}
.home-layers { flex: 1; display: flex; flex-direction: column; gap: var(--space-1); min-height: 0; }
.home-layer { flex: 1; display: flex; gap: var(--space-1); min-height: 0; }
.home-layer[data-finale] { flex: 1.5; }

.country-tile {
  flex: 1; position: relative; min-width: 0; border-radius: 6px; overflow: hidden;
  background-size: cover; background-position: center; text-decoration: none;
  display: block;
}
.country-tile-scrim { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(20,18,15,.62), rgba(20,18,15,0) 58%); }
.country-tile-name { position: absolute; bottom: var(--space-2); inset-inline-end: var(--space-2); color: #fff; font-weight: 700; font-size: var(--type-h2); text-shadow: 0 1px 4px rgba(0,0,0,.6); z-index: 2; }
.country-tile-count { position: absolute; bottom: var(--space-1); inset-inline-end: var(--space-2); color: #fff; font-size: var(--type-small); font-weight: 300; text-shadow: 0 1px 4px rgba(0,0,0,.6); z-index: 2; opacity: 0; transition: opacity .15s; }
.country-tile:hover .country-tile-count, .country-tile:focus-within .country-tile-count { opacity: .95; }

/* default (phone portrait): show phone layers, hide desktop */
[data-layers="desktop"] { display: none; }
[data-layers="phone"] { display: flex; }
/* desktop + landscape phone (wide): show desktop 2/2/3, hide phone stack */
@media (min-width: 769px), (orientation: landscape) {
  [data-layers="desktop"] { display: flex; }
  [data-layers="phone"] { display: none; }
}
/* nav: icon+label pills; phone shows a compact row */
.slim-nav { display: inline-flex; align-items: center; gap: .3em; font-size: var(--type-small); color: var(--accent-dim); text-decoration: none; background: var(--surface); border: 1px solid var(--divider); border-radius: 16px; padding: .25em .7em; white-space: nowrap; }
.slim-toggle { cursor: pointer; }
.slim-toggle .nav-icon:last-child { display: none; }       /* show moon in light */
[data-theme="dark"] .slim-toggle .nav-icon:first-child { display: none; }
[data-theme="dark"] .slim-toggle .nav-icon:last-child { display: inline; } /* sun in dark */
@media (max-width: 768px) and (orientation: portrait) {
  .home-header { flex-direction: column; align-items: stretch; gap: var(--space-1); }
  .slim-actions { justify-content: space-between; }
  .slim-nav { flex: 1; justify-content: center; padding: .35em .2em; }
}
```

- [ ] **Step 4: Run — PASS** · **Step 5: Verify live** (desktop fits no-scroll; phone portrait shows 4 layers; rotate phone → 2/2/3; dark toggle). **Commit** (`feat(m2): fit-to-viewport home CSS + responsive layers`).

### Task 2.4 — SW bump + finish

- [ ] Add `home-layout.js` to `SHELL_FILES`, bump `SHELL_CACHE` → `v67`. `npm test` + lint green. Commit. PR → CR-ist → tag `v0.M63` → deploy → verify.

---

# Milestone 3 — Country page (featured-first + overlay grid)

**Branch:** `m3-country`. Rework `album-list.js`: first album (current order) = wide hero overlay tile; rest = overlay tiles; slim header with back + country-random.

### Task 3.1 — View rework

**Files:** Modify `src/views/album-list.js`; Test `src/views/album-list.test.mjs` (extend).

- [ ] **Step 1: Failing tests**

```js
test('first album in order is a wide featured tile', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.match(html, /class="album-tile album-tile-featured"/);
});
test('albums use overlaid labels (name + count·dates on the photo)', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.match(html, /class="album-tile-name"/);
  assert.match(html, /class="album-tile-sub"/);
});
test('order is preserved (not re-sorted by size)', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  // first album in the country list appears before the second in the HTML
  assert.ok(html.indexOf('FIRST_SLUG') < html.indexOf('SECOND_SLUG'));
});
test('header has back-to-home + country random + theme toggle', () => {
  const html = renderAlbumList({ manifest, code: 'np', dpr: 1 });
  assert.match(html, /class="slim-back"/);
  assert.match(html, /data-random-play/);
  assert.match(html, /data-theme-toggle/);
});
```

(Use the real fixture slugs from the existing test for `FIRST_SLUG`/`SECOND_SLUG`.)

- [ ] **Step 2-5:** Implement with `viewHeader` (back `{href:'/', label:'דף הבית'}`, actions = country-random pill + theme toggle), a `featured` tile for `albums[0]` and an overlay grid for the rest. Reuse `imageUrl` (intent `card`), `albumPath`, `albumDateLabel`, `countryRandomPath`. Overlay label = `album.title ?? album.name`; sub = `${count} תמונות · ${dateLabel}`. Run, verify, commit (`feat(m3): featured-first country page with overlay album tiles`).

### Task 3.2 — Country CSS + SW

**Files:** `main.css`; Test `src/styles/country-css.test.mjs`.

- [ ] Add `.country-page` grid (3 cols desktop / 2 phone), `.album-tile` overlay (same scrim pattern as `.country-tile`), `.album-tile-featured { grid-column: 1 / -1; aspect-ratio: 21/9; }`. Phone: featured full-width, grid 2-col. CSS test asserts grid columns + featured spans full row + overlay name/sub present. Bump SW → `v68` (no new module unless you split helpers). Commit. PR → CR-ist → `v0.M64` → deploy.

---

# Milestone 4 — Album grid (justified rows by day)

**Branch:** `m4-album-grid`. The view already groups by day (`groupPhotosByDay`) and renders `.photo-grid`. Change the grid to **justified rows** (true aspect, edge-to-edge) and add sticky day headers; adopt the slim header.

### Task 4.1 — Justified-rows CSS + sticky day headers

**Files:** `main.css`; modify `album-grid.js` header to use `viewHeader`; Test `src/styles/justified-css.test.mjs` + extend `album-grid.test.mjs`.

- [ ] **Step 1: Failing CSS test** — assert `.photo-grid` is a flex row that wraps and `.album-photo` uses an aspect-preserving justified treatment, and `.day-header` is `position: sticky`.

```js
test('.photo-grid lays out justified rows (flex wrap, not fixed squares)', () => {
  const b = block('.photo-grid'); assert.ok(b);
  assert.match(b, /display:\s*flex/); assert.match(b, /flex-wrap:\s*wrap/);
});
test('.album-photo keeps aspect ratio (object-fit cover, fixed row height)', () => {
  const b = block('.album-photo'); assert.ok(b);
  assert.match(b, /height:/); assert.match(b, /object-fit:\s*cover/);
});
test('.day-header sticks while scrolling', () => {
  const b = block('.day-header'); assert.ok(b); assert.match(b, /position:\s*sticky/);
});
```

- [ ] **Step 2-4:** Implement justified rows. Simplest robust approach that needs no JS: fixed-height rows, each photo `flex: 1 1 auto; height: <row>; width: auto;` won't justify without intrinsic ratios. Use the standard trick: wrap each photo so the `<img>` sets the width via its aspect at a fixed row height.

```css
.day-group { margin-bottom: var(--space-4); }
.day-header {
  position: sticky; top: 0; z-index: 5;
  background: var(--bg); color: var(--accent);
  font-size: var(--type-h2); margin: 0 0 var(--space-2);
  padding: var(--space-1) 0;
}
.photo-grid { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-1); }
.photo-tile { height: 150px; flex-grow: 1; }
.photo-tile > a { display: block; height: 100%; }
.album-photo { height: 150px; width: 100%; object-fit: cover; border-radius: 4px; display: block; }
/* last row not stretched grotesquely */
.photo-grid::after { content: ''; flex-grow: 999999; }
@media (max-width: 768px) { .photo-tile, .album-photo { height: 110px; } }
```

Update `album-grid.js`'s `header()` to delegate to `viewHeader` (keep the existing tests passing — the back link + title + subtitle assertions still hold). Add a test that the day header is rendered as `.day-header` (already present). Run, verify (R2 DOM probe: rows fill width, headers stick). Commit (`feat(m4): justified photo rows + sticky day headers`).

- [ ] **Step 5:** SW bump → `v69`. PR → CR-ist → `v0.M65` → deploy.

---

# Milestone 5 — Slideshow (charcoal stage, floating auto-hide controls, filmstrip)

**Branch:** `m5-slideshow`. Keep all behaviour (`main.js` slideshow wiring, `controls-timer.js`, transitions, share, info, fullscreen). Re-skin: charcoal `--stage` (always, both themes), photo centred & large, **one floating control row** + on-demand filmstrip, auto-hide extended to the windowed viewer.

### Task 5.1 — Always-charcoal stage token override + centred photo CSS

**Files:** `main.css`; Test `src/styles/slideshow-css.test.mjs`.

- [ ] **Step 1: Failing test** — assert `.slideshow-shell` sets `--stage: #211e1b` locally (charcoal in both themes), `.slideshow-stage` centres the photo (`display:flex; align-items:center; justify-content:center`), `.slideshow-photo` is `max-height`/`max-width` contained, and **no `backdrop-filter`** appears in any `.slideshow-*` rule (anti-glassmorphism guard):

```js
test('slideshow stage is charcoal regardless of theme', () => {
  const b = block('.slideshow-shell'); assert.ok(b); assert.match(b, /--stage:\s*#211e1b/);
});
test('photo is centred & contained', () => {
  const stage = block('.slideshow-stage'); assert.match(stage, /align-items:\s*center/); assert.match(stage, /justify-content:\s*center/);
});
test('no glassmorphism in slideshow chrome (design.md)', () => {
  const slide = css.slice(css.indexOf('/* Slideshow */'));
  assert.equal(/backdrop-filter/.test(slide), false);
});
```

- [ ] **Step 2-5:** Implement: `.slideshow-shell { --stage:#211e1b; background:var(--stage); position:fixed; inset:0; }`, centred `.slideshow-stage`, contained `.slideshow-photo { max-width:100%; max-height:100%; }`. Floating control row `.slideshow-bar` positioned `position:absolute; bottom; left:0; right:0` on a plain gradient scrim (NOT blur). Run, commit (`feat(m5): charcoal centred slideshow stage, plain-scrim chrome`).

### Task 5.2 — Single control row + filmstrip toggle markup

**Files:** Modify `src/views/slideshow.js` (control bar order: prev/play/next · speed/transition/loop · share/info/fullscreen · filmstrip-toggle); add a hidden filmstrip container toggled by `▦`. Test: extend `slideshow.test.mjs` to assert the single `.slideshow-bar` contains all controls and a `[data-filmstrip-toggle]`, and a `.slideshow-filmstrip[hidden]` exists.

- [ ] **Step 1: Failing tests**, **Step 2: FAIL**, **Step 3: implement** (reorder existing buttons into one `.slideshow-bar` row; add toggle + hidden strip built from neighbour photos via existing `imageUrl`), **Step 4: PASS**, **Step 5: commit** (`feat(m5): one control row + on-demand filmstrip`).

### Task 5.3 — Filmstrip + auto-hide wiring in main.js

**Files:** Modify `src/main.js` (`wireSlideshow`): wire `[data-filmstrip-toggle]` to show/hide `.slideshow-filmstrip` and populate neighbour thumbnails; ensure `applyControls()` auto-hide runs in the windowed (non-fullscreen) viewer too (today the bar is constant when not fullscreen — change `controlsVisible` call site so the windowed viewer also hides after idle). Verify via live probe (controls fade after idle, return on move/tap/key; filmstrip toggles). Commit (`feat(m5): filmstrip toggle + windowed auto-hide`). SW bump → `v70`. PR → CR-ist → `v0.M66` → deploy.

> Note: `controls-timer.js` `controlsVisible({fullscreen,…})` currently keeps the bar constant when `!fullscreen`. Add a unit test in `controls-timer.test.mjs` for a new `windowedAutoHide` flag (default true) so the windowed viewer hides on idle, then thread it through. Keep the fullscreen behaviour identical.

---

# Milestone 6 — Map / Globe upgrades

**Branch:** `m6-map`. Real Hebrew city labels via a domain-restricted MapTiler client key + a Hebrew custom style; new country colours on pins; globe comet trail; map-style globe pins; starfield-loads-immediately fix. **Functionality preserved.**

### Task 6.1 — Map tiles config (domain-restricted client key, Hebrew style)

**Files:** Create `src/lib/map-tiles.js` + test, and `src/config.js`. No server
proxy — the key is a **domain-restricted MapTiler frontend key** (safe in client
code; protected by the origin allowlist + quota).

> **Setup (user, before this task):** in MapTiler Cloud create a **custom style
> with Language = Hebrew** — one light, one dark — and note their style IDs.
> `?language=he` on a default raster style does NOT relabel under Leaflet, so the
> Hebrew labels must be baked into the style. The frontend key is restricted to
> `hermantrip.tomhe.app`; **also allowlist dev origins** (`http://localhost`,
> `http://127.0.0.1`, and the LAN IP used to test on a phone) or the map is blank
> locally. Set a usage alert in the dashboard.

- [ ] **Step 1: Failing test**

```js
// src/lib/map-tiles.test.mjs
import { test } from 'node:test'; import { strict as assert } from 'node:assert';
import { tileUrl, MAP_ATTRIBUTION } from './map-tiles.js';
test('builds the MapTiler raster URL for the chosen style + key', () => {
  assert.equal(tileUrl({ style: 'STYLE_LIGHT', key: 'K' }),
    'https://api.maptiler.com/maps/STYLE_LIGHT/{z}/{x}/{y}.png?key=K');
});
test('attribution credits MapTiler + OpenStreetMap (licence)', () => {
  assert.match(MAP_ATTRIBUTION, /MapTiler/);
  assert.match(MAP_ATTRIBUTION, /OpenStreetMap/);
});
```

- [ ] **Step 2: Run — FAIL** · **Step 3: Implement**

```js
// src/lib/map-tiles.js
// MapTiler raster tiles for a (Hebrew-labelled) custom style. The key is a
// domain-restricted frontend key — safe in client code; the origin allowlist +
// free-tier quota are the protection. Key + style IDs live in src/config.js.
export const MAP_ATTRIBUTION =
  '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> · © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';
export function tileUrl({ style, key }) {
  return `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${key}`;
}
```

- [ ] **Step 4: Run — PASS**
- [ ] **Step 5: Config + wire.** Create `src/config.js` (committed — the key is
  domain-restricted, so this is safe):

```js
// src/config.js — public, domain-restricted MapTiler frontend key + Hebrew styles.
export const MAPTILER_KEY = 'PASTE_KEY';                 // restricted to hermantrip.tomhe.app (+ dev origins)
export const MAP_STYLE_LIGHT = 'PASTE_LIGHT_STYLE_ID';   // custom style, Language = Hebrew
export const MAP_STYLE_DARK  = 'PASTE_DARK_STYLE_ID';    // custom dark style, Language = Hebrew
```

  In `main.js` `initLeafletMap`, replace the CARTO `light_nolabels` `L.tileLayer(...)`
  (around line 816) with the MapTiler layer, choosing light/dark by theme:

```js
import { tileUrl, MAP_ATTRIBUTION } from './lib/map-tiles.js';
import { MAPTILER_KEY, MAP_STYLE_LIGHT, MAP_STYLE_DARK } from './config.js';
// …inside initLeafletMap, replacing the CARTO tileLayer:
const style = currentTheme() === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
L.tileLayer(tileUrl({ style, key: MAPTILER_KEY }),
  { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(map);
```

  The Hebrew labels now come from the style, so the manual `country-labels.js`
  overlay is optional — keep it for the big country names or drop it (decide in
  review). Commit (`feat(m6): MapTiler Hebrew tiles via domain-restricted client key`).

### Task 6.2 — Country colours on pins + globe map-style pins

**Files:** Modify `src/main.js` (`MAP_COUNTRY_COLORS` → import `COUNTRY_COLORS`); replace globe building markers with teardrop pins sized by days.

- [ ] Replace the local `MAP_COUNTRY_COLORS` object (main.js ~line 625) with `import { COUNTRY_COLORS as MAP_COUNTRY_COLORS } from './lib/country-colors.js';`. Globe: in `initGlobeView`, drop the `makeBuilding`/`customThreeObject` boxes; render `.pointType` markers as coloured pins (use globe.gl `htmlElementsData`/`pointAltitude` scaled by `b.days`, colour `countryColor(b.country)`). Keep the invisible click layer. Add/adjust `globe-buildings.js` → rename to `globe-pins.js` (pure: `pinsForGlobe(manifest)` returning `{lat,lng,days,country}`), with tests for size-by-days. Commit (`feat(m6): distinct country colours on pins + globe map-style pins`).

### Task 6.3 — Globe comet trail + starfield-immediate fix

**Files:** Modify `src/main.js`.

- [ ] **Comet:** keep `arcsData(...)`; raise `arcDashAnimateTime`, set a single travelling dash (`arcDashLength(0.25).arcDashGap(4)`) so a bright segment runs each leg in order (the "comet"). Brighten `arcColor`. (Unit-test any new pure helper if extracted; otherwise R2 DOM/accessor probe.)
- [ ] **Starfield fix:** in `initGlobeView`, move `container.innerHTML = globeLoadingHTML();` to the **first line** of the function, *before* `await loadGlobe()`, so the starfield paints during the heavy download instead of after. Verify: entering the globe shows stars immediately (no black gap). Commit (`fix(m6): paint globe starfield before the globe.gl download`). SW bump → `v71`, add `map-tiles.js` + `config.js` + `globe-pins.js`, remove `globe-buildings.js` (and `country-labels.js` if dropped). PR → CR-ist → `v0.M67` → deploy. **Eyeball the globe live** (WebGL not screenshot-able); verify the map shows Hebrew city labels and that dev-origin tiles load locally.

---

# Milestone 7 — Guessing game

**Branch:** `m7-game`. Add the progress strip; restyle photo + options; landscape = options beside the photo. Flow unchanged (`game.js` logic + `main.js` wiring stay).

### Task 7.1 — Progress strip + slim header in the view

**Files:** Modify `src/views/game.js`; extend `game.test.mjs`.

- [ ] **Step 1: Failing tests** — `.game-progress` strip shows `round/total` + score + a `.game-progress-bar`; header uses back-to-home + theme toggle; country step renders 7 country buttons in trip order; album step renders 4.
- [ ] **Step 2-5:** implement (the round/score data already flows into `renderGameCountry`/`renderGameAlbum` via `base`). Commit (`feat(m7): game progress strip + slim header`).

### Task 7.2 — Game CSS (photo-forward + landscape side-by-side)

**Files:** `main.css`; extend `game-photo-css.test.mjs`.

- [ ] Keep the existing `.game-shell`/`.game-stage`/`.game-photo` contract (already full-bleed, flex:1 1 0). Add `.game-progress` bar styling and, for `@media (orientation:landscape)`, `.game-shell { flex-direction: row; }` so options sit beside the photo. CSS test asserts the landscape row rule + progress bar. Commit (`feat(m7): game landscape side-by-side + progress styling`). SW bump → `v72`. PR → CR-ist → `v0.M68` → deploy.

---

# Milestone 8 — Timeline (chronological textured scrubber)

**Branch:** `m8-timeline`. The big one. New scrubber data model, per-country textures, responsive scrubber↔rail, hold tooltip, justified feed.

### Task 8.1 — Scrubber segment model (pure logic)

**Files:** Create `src/lib/scrubber.js` + `src/lib/scrubber.test.mjs`.

- [ ] **Step 1: Failing test**

```js
// src/lib/scrubber.test.mjs
import { test } from 'node:test'; import { strict as assert } from 'node:assert';
import { buildScrubberSegments } from './scrubber.js';

// timeline buckets: { key, label, photos:[{album:{primary,countries}}] }
function day(primary, countries, n) {
  return { key: 'k', label: 'l', photos: Array.from({ length: n }, () => ({ album: { primary, countries: countries || [primary] } })) };
}

test('one segment per contiguous country run, weight = photo count', () => {
  const segs = buildScrubberSegments([day('np', null, 3), day('np', null, 2), day('in', null, 6)]);
  assert.deepEqual(segs.map((s) => s.country), ['np', 'in']);
  assert.equal(segs[0].weight, 5);
  assert.equal(segs[1].weight, 6); // India ~ proportional to its days/photos
});

test('a recurring country produces multiple segments', () => {
  const segs = buildScrubberSegments([day('th', null, 1), day('np', null, 4), day('th', null, 5)]);
  assert.deepEqual(segs.map((s) => s.country), ['th', 'np', 'th']);
});

test('a multi-country album day splits per country, ordered by SHARED_ORDER override', () => {
  // album 37 = china+australia+thailand → display order cn, th, au
  const segs = buildScrubberSegments([day('cn', ['cn', 'au', 'th'], 3)]);
  assert.deepEqual(segs.map((s) => s.country), ['cn', 'th', 'au']);
});

test('adjacent same-country slivers merge across a shared-album boundary', () => {
  // …cn block, then album37 day (cn,th,au) → cn merges left, au merges right, th stays
  const segs = buildScrubberSegments([day('cn', null, 4), day('cn', ['cn', 'au', 'th'], 3), day('au', null, 5)]);
  assert.deepEqual(segs.map((s) => s.country), ['cn', 'th', 'au']);
});

test('every segment carries its colour', () => {
  const segs = buildScrubberSegments([day('np', null, 1)]);
  assert.equal(segs[0].color, '#4f7a8c');
});
```

- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement**

```js
// src/lib/scrubber.js
// Build the timeline scrubber: a chronological list of coloured segments.
// Input: timeline buckets (from buildTimeline), chronological. Each bucket's
// photos carry album.primary + album.countries. Output: [{country,color,weight}]
// — proportional to photo-days, recurring countries repeat, multi-country
// albums split per country (display order via SHARED_ORDER), adjacent
// same-country segments merged.
import { countryColor } from './country-colors.js';

// Display order for shared albums where it differs from COUNTRY_ORDER.
// Keyed by sorted member set. (Album 37: china+australia+thailand → cn,th,au.)
const SHARED_ORDER = {
  'au,cn,th': ['cn', 'th', 'au'],
  'np,th': ['th', 'np'],
};

function dayCountries(bucket) {
  // The album(s) on this day. Most days = one album. Use the first album's
  // countries (cross-country albums carry >1); single-country → [primary].
  const album = bucket.photos[0]?.album;
  if (!album) return [];
  const set = album.countries && album.countries.length > 1 ? album.countries : [album.primary];
  if (set.length === 1) return set;
  const key = [...set].sort().join(',');
  return SHARED_ORDER[key] || set;
}

export function buildScrubberSegments(timeline) {
  const raw = [];
  for (const bucket of timeline) {
    const countries = dayCountries(bucket);
    if (countries.length === 0) continue;
    const per = bucket.photos.length / countries.length; // split the day's weight
    for (const code of countries) raw.push({ country: code, weight: per });
  }
  // Merge adjacent same-country.
  const merged = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.country === seg.country) last.weight += seg.weight;
    else merged.push({ country: seg.country, weight: seg.weight });
  }
  return merged.map((s) => ({ ...s, color: countryColor(s.country) }));
}
```

- [ ] **Step 4: Run — PASS** · **Step 5: Commit** (`feat(m8): chronological scrubber segment model`).

### Task 8.2 — Per-country motif patterns (textures)

**Files:** Create `src/lib/country-motifs.js` + test.

- [ ] **Step 1: Failing test** — `motifDefs()` returns `<defs>` with one `<pattern id="motif-np">…` per country (7), each referencing `currentColor`/white strokes; `motifFill(code)` returns `url(#motif-np)`.

```js
import { test } from 'node:test'; import { strict as assert } from 'node:assert';
import { motifDefs, motifFill } from './country-motifs.js';
test('defs include a pattern per country', () => {
  const d = motifDefs();
  for (const c of ['np','in','vn','cn','au','nz','th']) assert.match(d, new RegExp(`<pattern id="motif-${c}"`));
});
test('motifFill references the pattern', () => { assert.equal(motifFill('np'), 'url(#motif-np)'); });
```

- [ ] **Step 2-4:** port the dense SVG `<pattern>` tiles from the brainstorm (peaks/sun/leaves/wall/dunes/fern/chedi), white at low opacity, small tiles. `motifDefs()` returns the `<defs>…</defs>` string; views inline it once and fill segment `<rect>`s with `motifFill(code)`. Commit (`feat(m8): per-country motif SVG patterns`).

### Task 8.3 — Scrubber view (horizontal desktop/landscape, vertical rail portrait) + textures + feed

**Files:** Modify `src/views/timeline.js`; the view now also receives `segments` (built in `main.js` via `buildScrubberSegments(timeline)`); extend `timeline.test.mjs`.

- [ ] **Step 1: Failing tests** — view renders a `.tl-scrubber[data-orient]` with one `.tl-seg` per segment carrying its colour + motif fill and a `flex`/`height` proportional to `weight`; the inline `motifDefs()` appears once; the slim header shows `ציר זמן` with `365 ימים · שנה אחת` **inline** (subtitle in the title, per spec); the feed uses justified rows (`.tl-photo-strip` → reuse `.photo-grid` justified treatment).
- [ ] **Step 2-5:** Implement. The scrubber markup is shared; CSS (next task) places it horizontally (desktop/landscape) or as a right rail (portrait). Keep the existing lazy-hydration (`dayShell` + `dayStripHTML` + the IntersectionObserver in `main.js`). Wire `main.js` `renderTimelineView` to compute `segments = buildScrubberSegments(timelineData)` and pass to `renderTimeline`. Commit (`feat(m8): textured chronological scrubber + justified feed`).

### Task 8.4 — Timeline CSS (responsive scrubber↔rail) + hold tooltip

**Files:** `main.css`; Test `src/styles/timeline-rail-css.test.mjs`; `main.js` hold/press wiring.

- [ ] **Step 1: Failing CSS test**

```js
test('portrait phone: scrubber becomes a 13px vertical rail on the RIGHT', () => {
  assert.match(css, /orientation:\s*portrait[^]*\.tl-scrubber\[data-orient="rail"\]\s*\{[^}]*width:\s*13px/);
  assert.match(css, /\.tl-scrubber\[data-orient="rail"\]\s*\{[^}]*order:\s*2/); // sits after feed → right edge in RTL? use right placement
});
test('desktop/landscape: scrubber is a horizontal bar on top', () => {
  assert.match(css, /\.tl-scrubber\[data-orient="bar"\]\s*\{[^}]*flex-direction:\s*row/);
});
test('hold tooltip styled compact (no big gap)', () => {
  const b = block('.tl-tip'); assert.ok(b); assert.match(b, /line-height:\s*1/);
});
```

- [ ] **Step 2-4:** Implement both orientations: `data-orient="bar"` (desktop/landscape, horizontal, on top, ~12px tall segments + country labels under) and `data-orient="rail"` (portrait, 13px vertical, right edge, textured). The view emits **both** (like the home) or `main.js` sets `data-orient` from viewport; simplest: emit both wrappers, CSS shows the right one per `@media`/orientation (mirrors the home layers pattern). Add `.tl-tip` compact tooltip. Wire press/hold + hover/drag in `main.js`: on pointerdown/move over the scrubber, compute the country+date at that position and show `.tl-tip`; on release, jump (reuse `sliderValueToBucketIndex`). Commit (`feat(m8): responsive scrubber↔rail + hold tooltip`).
- [ ] **Step 5:** SW bump → `v73`, add `scrubber.js` + `country-motifs.js`. `npm test` + lint green. PR → CR-ist → tag `v0.M69` → deploy → verify (desktop bar + textures; portrait right rail; landscape bar; hold shows country+date; feed photos bigger in landscape).

---

## Self-review (performed against the spec)

**Spec coverage:** light+dark themes (M1.3, M1.6) ✓; 7 country colours (M1.1, used M2/M6/M8) ✓; icon set (M1.4) ✓; slim header + back (M1.5, used everywhere) ✓; home 2/2/3 + 2/2/2/1 + landscape (M2) ✓; hover-reveal metadata (M2.3) + phone metadata "destination only" (no tile count on phone — enforce in M2.3 CSS: `.country-tile-count` stays `opacity:0` with no touch reveal; count lives on the country page) ✓; country featured-first (M3) ✓; album justified rows + sticky headers (M4) ✓; slideshow charcoal/centred/floating/auto-hide/filmstrip (M5) ✓; map Hebrew tiles via proxy + colours + comet + pins + starfield fix (M6) ✓; game progress + landscape (M7) ✓; timeline chronological/proportional/recurring/merge/split + textures + responsive + hold (M8) ✓; back nav (M1.5 + each view) ✓; landscape=desktop rule (M2.3 media query; M7/M8 landscape rules) ✓.

**Placeholder scan:** logic tasks carry full code + tests; view/CSS tasks carry real snippets and the project's `ruleBlock` test pattern. The only external action is the **MapTiler key** (flagged, not a code placeholder).

**Type consistency:** `countryColor`/`COUNTRY_COLORS`, `resolveTheme`/`nextTheme`, `viewHeader({title,subtitle,back,actions})`, `icon(name)`, `homeLayers(codes,mode)`, `buildScrubberSegments(timeline)→[{country,color,weight}]`, `motifDefs()`/`motifFill(code)`, `tileUrlTemplate()` — names are used consistently across tasks.

**Open items deferred to implementation (from spec):** final icon stroke polish; per-country texture strength; keep-vs-drop manual `country-labels.js` after keyed tiles (M6.1 decision); sticky-day-header offset tuning.

---

## Execution note

This plan is intentionally one document covering all 8 milestones, but each milestone is an independent cr-tdd-ladder branch/PR/tag that ships working software on its own — implement them in order (M1 foundations unblock the rest).
