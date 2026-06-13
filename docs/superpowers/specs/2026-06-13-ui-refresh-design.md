# UI refresh — design spec

_Date: 2026-06-13. Status: awaiting user review (v2 — full). Owner: site owner (tomhe)._

A site-wide visual refresh of **hermantrip.tomhe.app**, arrived at through visual
brainstorming. It keeps the warm, light, family-friendly character — **evolution,
not reinvention** — and adds an opt-in **dark mode**. The locked design language
in [`docs/design.md`](../../design.md) still governs (Rubik, editorial restraint,
"the photos are the design", anti-AI checklist); this spec layers new layouts,
components, a dark palette, a distinct country-colour set, an icon set, and a
reworked timeline on top.

Architecture is unchanged: vanilla JS, native ES modules, no bundler; pure logic
in `src/lib/`, HTML-string view builders in `src/views/`, DOM/router/state wiring
in `src/main.js`. Hebrew **RTL** throughout. Images via the `/img/{id}/{width}`
proxy. Delivered as **cr-tdd-ladder** milestones (branch → PR → CR-ist → merge →
tag → archive → deploy), with FAIL→PASS test evidence per PR.

## Goals
1. Photos are the hero on every screen — place names sit **on** the imagery, not in white boxes.
2. A calm, lightweight "presentation" feel; chrome recedes (and on the slideshow, auto-hides).
3. A consistent **slim header** across screens (title right, actions left; back top-right on sub-screens).
4. Keep the warm beige / Rubik / terra-cotta identity, and add a **warm dark mode**.

## Non-goals
- No blog/story/CMS system (the netlify reference was inspiration, not a target).
- No change to data, routing, or the image proxy.
- Map/globe **features** (trail, pins, popups, behaviour) are preserved as-is; only their visuals and a few additions change.

## Global patterns

### Themes — light + dark
Two themes, toggled by a **☾ / ☀** control in the header (desktop: in the left
action cluster; phone: in the header row, both orientations). Persisted to
`localStorage`; **default follows the device `prefers-color-scheme`** (open: or
always-start-light — confirm in review). The slideshow stage stays charcoal in
both themes. The map swaps to dark tiles in dark mode.

**Light tokens** (from `design.md`): `--bg #f6f1ea`, `--surface #ffffff`,
`--text #1a1815`, `--text-muted #5a534c`, `--accent #b56439`, `--divider #e3dccf`.

**Dark tokens** (new, warm): `--bg #1b1815`, `--surface #262220`,
`--text #f3ece1`, `--text-muted #b3a899`, `--accent #cf7a4e` (terra-cotta lifted
for dark), `--divider #3a3531`. Slideshow stage `--stage #211e1b`.

### Country colours (7 distinct — new)
Replaces the old reused map palette (which doubled up hues). Used consistently on
**map pins, globe markers, and the timeline scrubber/rail**:

| Country | Hebrew | Colour |
|---|---|---|
| Nepal | נפאל | `#4f7a8c` (teal-blue) |
| India | הודו | `#d6a13f` (saffron) |
| Vietnam | ויאטנם | `#5f8f5a` (leaf green) |
| China | סין | `#a8423d` (red) |
| Australia | אוסטרליה | `#c97b3c` (ochre) |
| New Zealand | ניו זילנד | `#3f7d6e` (deep teal) |
| Thailand | תאילנד | `#8a5fa3` (orchid purple) |

Thailand uses **one colour everywhere** it recurs.

### Slim header
Short, single-line-feel bar on every non-slideshow screen. **Right (RTL start):**
title (+ inline or small subtitle). **Left:** action buttons grouped at natural
width (not stretched), space between them and the title. **Back** link top-right
on sub-screens (`→ דף הבית`, `→ נפאל`, …); home is the root (no back). Theme
toggle lives in the action group.

### Photo tile with overlaid label
Core card for home / country / album-list grids: full-bleed cover photo,
~6px radius, a bottom gradient scrim, white label bottom-right (name + optional
count/dates). **Metadata reveal:** on desktop the count (and album dates) fade in
on **hover**; resting state shows just the name. On phone (no hover) the name
shows always; count/dates appear small (open: always-on vs only on the
destination screen — confirm in review).

### Icon set (chosen; final vectors to refine)
SVG line icons in the accent colour: **slideshow = photo-stack**, **map =
folded map**, **game = two dice**, **timeline = mirrored vertical-list** (line on
the right, entries leftward), plus **☾ / ☀** theme toggle. "Curated handful" per
`design.md`; no emoji.

### Responsive rule
- **Portrait phone:** phone layouts (stacked; home 4 layers; timeline vertical rail).
- **Landscape phone:** wide & short → **desktop-style** layouts (home 2/2/3; timeline horizontal scrubber on top; game options beside the photo; slideshow fullscreen).
- **Desktop:** as specified per screen.

## Screen 1 — Home
All 7 countries on **one screen, no scroll**, on every form factor. The 7 tiles
are the hero (no separate hero photo). Always in trip order. The trip's **4 parts**
drive grouping: (1) נפאל·הודו (2) ויאטנם·סין (3) אוסטרליה·ניו זילנד (4) תאילנד.

- **Desktop / landscape phone:** slim header (title `הרמן בדרכים` / `שנה אחת · שבע מדינות`; 4 nav pills + ☾ left). Below: **3 layers, right→left, 2 / 2 / 3**, final layer ~1.5× taller. Fills the viewport, no scroll.
- **Portrait phone:** title + ☾, a row of **4 icon+short-label buttons** (fit on one line, no horizontal scroll), then **4 layers (2 / 2 / 2 / 1)** top→bottom. No scroll.
- Tiles = photo-tile-with-overlaid-label (country name; count on hover).

## Screen 2 — Country page (album list)
Scrolls. Slim header: title = country, subtitle = `N אלבומים · M תמונות`; left =
`▷ מצגת אקראית` (country-scoped) + back `→ דף הבית`. The **first album in the
current order** is a wide hero overlay tile; the rest follow **in current order**
as overlay tiles (3 cols desktop / 2 phone). Each tile overlays name + count·dates.

## Screen 3 — Album grid (photos by day)
Slim header: album name + count·dates; left = terra-cotta **`▷ הצג את האלבום`**
play + back `→ {country}`. Photos grouped under **day headers** (terra-cotta date
+ hairline), laid out as **justified rows** (true aspect, edge-to-edge, no
square-crop). Tapping a photo opens the slideshow at that photo. Day headers may
**stick** while scrolling (open detail).

## Screen 4 — Slideshow (viewer)
Keeps all current powers: autoplay, speed, transition (5), loop, fullscreen,
share menu, info panel, swipe, keyboard, next-album-at-end, scroll-restore.

- **Stage:** soft warm-charcoal (`--stage`), in both themes. Photo **centred &
  large, filling the stage**; chrome **floats over** it (reserves no space, never
  shifts the photo off-centre).
- **Top:** close `→` top-left (back to album); counter `3 / 317` + `album · date` top-right.
- **One lightweight floating control row** (bottom-centre): `‹ ▶ ›` · speed ·
  transition · loop · share · info · fullscreen · `▦` filmstrip-toggle. Light
  icons on a faint scrim — **no glassmorphism / blur** (plain scrim, per
  `design.md`).
- **Filmstrip:** on-demand only (`▦` toggles a thumbnail strip, current ringed).
- **Side arrows** `‹ ›`, faint, on the edges.
- **Auto-hide:** all chrome fades after idle, reappears on mouse-move / tap /
  keypress (reuse `controls-timer.js`; extend auto-hide to the windowed viewer).
- **Landscape phone:** fullscreen (keep M59 `fullscreen-policy.js`).

## Screen 5 — Map / Globe
Slim header + back. Map fills the area; floating **מפה / גלובוס** segmented toggle
(terra-cotta active) top-centre. Pins use the 7 distinct country colours.

- **Map:** **real Hebrew city/POI names** via a keyed Hebrew tile provider (e.g.
  MapTiler `language=he`) — replaces the label-free `light_nolabels` base. ⚠️
  Requires an **API key** (free tier exists); the key lives in **config, not
  code** (setup task — user provides). Keeps the green→terracotta trail + direction
  arrows, hover tooltips, popups. Dark mode → dark tiles.
- **Globe:** keeps the 3D globe + trail. Upgrades: **comet trail** (a glowing dot
  travels each leg in order — easier to follow); **map-style pins** (teardrop
  markers in country colours, size ∝ days) replacing the windowed boxes;
  **starfield loader painted immediately** on entering the globe view (fix: today
  it's set *after* awaiting the heavy globe.gl download, so the user sees black
  first — move it before the await).

## Screen 6 — Guessing game
Slim header + back. Thin **progress strip** (round N/10 · score · bar). The
**mystery photo** is the star; guesses below as pills. Step 1: country (7, trip
order). Step 2: album (4). Chosen answer flashes green/correct or red/wrong;
confirmed country shows ✓. Flow unchanged: country → album → result → next →
final score / 20 + שחקו שוב. **Landscape phone:** options beside the photo.

## Screen 7 — Timeline
A **chronological, data-driven** view of the whole year.

**Scrubber** (built from the per-day country mapping):
- Segments **proportional to days** (e.g. India ≈ 3× Nepal).
- **Thailand recurs** as several segments at the real spots (Bangkok stopover,
  album 19, album 37, the final 77–88 leg), all in the one Thailand colour.
- **Adjacent same-country segments merge.**
- **Multi-country albums** split per country; after merging, only the "other"
  country's sliver remains visible (album 37 = a Thailand sliver between China &
  Australia, in **China → Thailand → Australia** order; album 1 = a Thailand
  sliver, its Nepal part merging into the נפאל block).
- **Per-country organic textures** (dense, irregular, ~half-size tiles so they
  read even at 13px): נפאל peaks · הודו sun + market dots · ויאטנם leaves · סין
  wall battlements · אוסטרליה dunes + sun · ניו זילנד hills + fern · תאילנד chedi
  + waves. White, low-opacity, over the colour.
- **Press-and-hold** anywhere on the scrubber shows a compact tooltip with
  **country + date**; release to jump. (Desktop: on hover/drag.)

**Placement (responsive):**
- **Desktop & landscape phone:** horizontal textured scrubber **on top** (country
  labels under it on desktop; the date chip on the handle). Header is slim —
  `365 ימים · שנה אחת` inline right after `ציר זמן`. In landscape the header +
  scrubber are minimal so the **photo feed gets most of the height**.
- **Portrait phone:** vertical textured rail on the **right** edge (13px), top =
  start, bottom = end; doubles as the scroll indicator.

**Feed:** day sections with sticky date headers + **justified photo rows**
(same as the album grid), lazy-loaded on scroll/scrub. Tapping a photo opens the
slideshow.

## Navigation
Back is always reachable: top-right link on every sub-screen; the slideshow's `→`
closes to the album; home is the root.

## Deferred / open (settle in plan or review)
- Final **icon vectors** (concepts chosen; refine strokes/details).
- **Theme default:** follow system vs always-start-light.
- **Phone tile metadata:** always-small vs only on the destination screen.
- **Map tile API key** (MapTiler or similar) — user to obtain; wired via config.
- Per-country **texture strength** fine-tuning.
- **Sticky day headers** on/off (album grid + timeline).

## Constraints preserved
- Hebrew **RTL**; the home's right→left progression is a deliberate (approved) choice.
- `design.md` **anti-AI checklist** (CR-ist enforced): no decorative gradients
  beyond functional photo/scrim gradients, **no glassmorphism/backdrop-blur**
  (slideshow uses plain scrims), no emoji in labels, Rubik only.
- Vanilla JS / no bundler / pure `src/lib` + view builders + `main.js`.
- Service-worker shell caching + auto-update: bump `SHELL_CACHE` + `SHELL_FILES` for new modules.

## Implementation sequencing (cr-tdd milestones)
1. **Foundations** — light+dark design tokens, theme toggle + persistence, slim-header component, 7 country colours.
2. **Home** — 2/2/3 desktop + 4-layer phone + landscape; overlaid labels + hover/touch metadata.
3. **Country page** — featured-first + overlay grid.
4. **Album grid** — justified rows by day (+ sticky headers).
5. **Slideshow** — charcoal stage, centred photo, floating auto-hide controls, filmstrip toggle.
6. **Map/Globe** — keyed Hebrew labels (config key), dark tiles, comet trail, map-style pins, starfield-loader fix.
7. **Game** — progress strip + restyle (+ landscape side-by-side).
8. **Timeline** — scrubber data model (proportional/recurring/merge/split), per-country textures, responsive scrubber↔rail, hold tooltip, justified feed.

Each milestone: branch + PR + CR-ist review + tag + archived dist + deploy, with FAIL→PASS evidence.
