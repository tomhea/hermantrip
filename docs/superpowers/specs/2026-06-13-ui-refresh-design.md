# UI refresh — design spec

_Date: 2026-06-13. Status: awaiting user review. Owner: site owner (tomhe)._

A polish-pass redesign of the visual layer of **hermantrip.tomhe.app**, arrived
at through visual brainstorming. It keeps the existing warm, light,
family-friendly character — this is **evolution, not reinvention**, and not a
dark-mode/futuristic turn. The locked design language in
[`docs/design.md`](../../design.md) (palette, Rubik type, anti-AI rules,
"the photos are the design") still governs; this spec layers new **layouts and
components** on top of it.

The underlying architecture is unchanged: vanilla JS, native ES modules, no
bundler; pure logic in `src/lib/`, HTML-string view builders in `src/views/`,
DOM/router/state wiring in `src/main.js`. Hebrew RTL throughout. Images still go
through the `/img/{id}/{width}` proxy. Delivery follows the project's
**cr-tdd-ladder** (branch → PR → CR-ist → merge → tag → archive → deploy),
broken into milestones by the implementation plan.

## Goals

1. Make the **photos the hero** on every screen — names/labels sit *on* the
   imagery, not in separate white boxes.
2. A **lightweight, calm "presentation" feel** — chrome recedes; on the
   slideshow it floats and auto-hides.
3. A **consistent slim header** across all screens (info on the right, actions
   on the left).
4. Keep the **warm beige / Rubik / terra-cotta** identity; light theme only.

## Non-goals

- No dark mode for the site. (The slideshow *stage* is a soft charcoal — see
  below — but it is a viewer surface, not a site theme.)
- No new content/blog/story system (the netlify reference's magazine style was
  a source of ideas, not a target).
- No change to data, routing, the image proxy, or the map/globe/game/timeline
  *features* (they inherit the new header + palette but are not restructured in
  this pass — see Scope).

## Global design patterns

These are shared building blocks; each screen below composes them.

### Palette & type
Unchanged from `docs/design.md`: `--bg #f6f1ea`, `--surface #fff`,
`--text #1a1815`, `--text-muted #5a534c`, `--accent #b56439`
(terra-cotta), `--divider #e3dccf`. Rubik 300/500/700. **New token:**
`--stage #211e1b` — the warm-charcoal slideshow stage (a viewer surface only).

### Slim header
A short, single-line-feel bar at the top of every non-slideshow screen:

- **Right side (RTL start):** a stacked title block — bold title on one line,
  a muted subtitle on the line below; both non-wrapping.
- **Left side:** action buttons grouped together (natural width — **not**
  stretched full-width), with open space between them and the title.
- Desktop buttons: small **pill** style (icon + label), e.g.
  `▷ מצגת אקראית · ◉ מפה · ? משחק ניחושים · ▤ ציר זמן`.
- Background `--bg`/`#efe7da`, 1px `--divider` bottom border. Kept deliberately
  thin.

### Photo tile with overlaid label
The core card used on home, country, and album-list grids:

- Full-bleed cover photo, `border-radius` ~6px.
- A bottom gradient scrim (`linear-gradient(0deg, rgba(20,18,15,.6), transparent ~58%)`).
- Label text in white on the scrim, bottom-right (RTL): **name** bold + optional
  small secondary line (count, dates).
- No separate white caption box (except where noted as an explicit alternative).

### Icons
The `▷ ◉ ? ▤ ↗ ⓘ ⛶ ↻ ⇄ ✕` glyphs used in mockups are **placeholders**. Final
icon set is a deferred detail (kept to the "curated handful" rule in
`design.md`). Whatever is chosen is used consistently across header + slideshow.

## Screen 1 — Home

The whole point: **all 7 countries on one screen, no scrolling, on desktop and
phone.** The 7 tiles *are* the hero (no separate hero photo). Countries always
appear in trip order: נפאל · הודו · ויאטנם · סין · אוסטרליה · ניו זילנד · תאילנד.

The trip's **4 parts** drive the grouping: (1) נפאל·הודו (2) ויאטנם·סין
(3) אוסטרליה·ניו זילנד (4) תאילנד.

### Desktop
- Slim header (title `הרמן בדרכים` / subtitle `שנה אחת · שבע מדינות` on the
  right; the 4 nav pills grouped on the left).
- Below, fills the remaining viewport with **3 layers, progression right→left,
  top→bottom**, in a **2 / 2 / 3** split:
  - Layer 1: נפאל · הודו
  - Layer 2: ויאטנם · סין
  - Layer 3 (**taller**, ~1.5×): אוסטרליה · ניו זילנד · תאילנד
- Each tile = photo-tile-with-overlaid-label (country name + photo count).
- No page scroll; the 3 layers + header consume exactly `100vh`.

### Phone
- Title line + a full-width row of **4 equal action buttons** (icon + short
  label: מצגת · מפה · משחק · ציר זמן — full names live on desktop). Confirmed to
  fit; an icons-only variant is a deferred option if more photo height is wanted.
- **4 layers (2 / 2 / 2 / 1)**, top→bottom, each part one row; תאילנד is a
  full-width finale band. No scroll.

## Screen 2 — Country page (album list)

Scrolls (a country can hold many albums; the no-scroll rule is home-only).

- Slim header: title = country name, subtitle = `N אלבומים · M תמונות`;
  left actions = `▷ מצגת אקראית` (country-scoped) and `→ דף הבית`.
- **Featured first album** — the *first album in the current order* (no
  re-sorting) — rendered as a **wide hero overlay tile** at the top
  (name + count · date range overlaid).
- **Remaining albums**, in their current order, as a grid of overlay tiles
  (3 columns desktop / 2 columns phone; the hero tile is full-width on phone).
- Each album tile overlays: album name (bold) + count · date range.

## Screen 3 — Album grid (photos by day)

- Slim header: title = album name, subtitle = `N תמונות · date range`; left
  actions = a terra-cotta **`▷ הצג את האלבום`** play button (starts the album
  slideshow) and `→ {country}` back link.
- Photos grouped under **day headers** (`10 במרץ 2011` in terra-cotta + a
  hairline rule, optional small per-day count).
- Photos laid out in **justified rows** (gallery style): each photo keeps its
  true aspect ratio, rows are justified edge-to-edge at a consistent height — no
  square-cropping. This is the most photo-respecting layout.
- **Tapping any photo** opens the slideshow at that photo.
- **Deferred detail:** day headers may **stick** to the top while scrolling a
  long album (the codebase already has sticky-header handling to build on).

## Screen 4 — Slideshow (the viewer)

The most-used screen. Keeps **all** current functionality: autoplay, speed,
transition, loop, fullscreen, share menu, info panel, swipe, keyboard nav,
prev/next, next-album-at-end, scroll restore on exit.

- **Stage:** soft warm-charcoal (`--stage`), so photos pop. Viewer surface only;
  the rest of the site stays bright.
- **Photo:** absolutely **centered and large**, filling the stage. All chrome
  **floats over** the photo (reserves no layout space, so the photo never shifts
  off-center).
- **Top bar (minimal, floats on a faint top scrim):**
  - top-left: close `→` (back to album).
  - top-right: counter `3 / 317` + a muted line `album · date`.
- **Single lightweight floating control row**, bottom-center, over the photo:
  `‹ ▶ ›` (prev / play-pause / next) · `×1` (speed) · `⇄` (transition) ·
  `↻` (loop) · `↗` (share) · `ⓘ` (info) · `⛶` (fullscreen) · `▦` (filmstrip
  toggle). Light icons with text-shadow, no heavy panel box.
- **Filmstrip:** **on-demand only** — hidden by default; the `▦` toggle reveals
  a thumbnail strip (neighbouring photos, current ringed in terra-cotta) for
  jump navigation. Keeps the default view lightweight.
- **Side arrows** `‹ ›`: faint, on the left/right edges, for prev/next.
- **Auto-hide:** all chrome (top bar, control row, arrows) fades after a few
  idle seconds and reappears on any mouse move, tap, or keypress — reusing the
  existing `controls-timer.js` logic (constant when not fullscreen today; this
  extends the auto-hide to the windowed viewer too). Result: most of the time
  it's just the centered photo on the dark stage.

### Random slideshow
`/random` and `/{country}/random` use the same viewer chrome; the filmstrip is
omitted or shows the shuffled neighbours (deferred detail).

## Scope & sequencing

In scope for detailed redesign: **home, country page, album grid, slideshow**
(incl. random slideshow chrome).

Inherit the global header + palette but are **not structurally redesigned** in
this pass (confirm during review): **map/globe**, **guessing game**,
**timeline**. They should not look out of place — they pick up the slim header
and tokens — but their internal layouts stay as-is for now.

Implementation is delivered as **cr-tdd-ladder milestones** (the plan will
sequence them, likely: global header/tokens → home → country → album grid →
slideshow → secondary screens), each a branch + PR + CR-ist review + tag +
archived dist + deploy, with FAIL→PASS test evidence.

## Deferred / open details (settle in plan or implementation)

- Final **icon set** (replacing placeholder glyphs).
- Exact **slide-transition** styles (the 5 existing transitions carry over).
- **Sticky day headers** on the album grid (on/off + offset).
- Phone home: **icons-only** nav vs icon+short-label.
- Side `‹ ›` arrows on the slideshow: keep (current decision) vs rely on
  filmstrip/swipe only.
- Exact `--stage` charcoal value and scrim opacities (tune against real photos).
- Confirmation that map/globe/game/timeline are out of scope for now.

## Constraints preserved

- Hebrew **RTL** everywhere; the home's right→left progression is a deliberate
  (slightly unconventional) choice the owner approved.
- `docs/design.md` **anti-AI checklist** still enforced by the CR-ist (no
  gradients-as-decoration beyond the functional photo scrims, no glassmorphism
  abuse, no emoji in labels, Rubik only, etc.). _Note for the plan:_ the
  slideshow uses a subtle `backdrop-blur`/translucency in some explorations —
  reconcile with the "no glassmorphism" rule (prefer plain scrims; the locked
  slideshow option A uses plain icon scrims, not glass).
- Vanilla JS / no bundler / pure `src/lib` + view builders + `main.js` wiring.
- Service-worker shell caching + auto-update; bump `SHELL_CACHE` and
  `SHELL_FILES` for any new modules.
