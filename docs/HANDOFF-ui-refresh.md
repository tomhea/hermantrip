# Handoff — UI refresh (continuing at M8, the LAST milestone)

_For a fresh session picking up the hermantrip UI-refresh. Read this top-to-bottom,
then the plan + spec + cr-rules (links below), then start at **§9 (Starting M8)**.
Last updated after **M7 (Game) shipped & live** (`v0.M68`, SW v88);
**next up — and LAST — is M8 (Timeline) → `v0.M69`, SW v89.**_

**M1–M7 are DONE and live.** The globe/map (M6) went through four owner-feedback
rounds and is signed off ("It looks great") — do NOT reopen it. M7 (Game) added a
progress strip + a landscape options-beside-photo layout, view+CSS only. Everything
below §7 is historical reference; the actionable starting point is **§9**.

## 0. The one-paragraph orientation

hermantrip.tomhe.app is a static Hebrew-RTL photo-album site (vanilla JS, native
ES modules, **no bundler**). It's being given a visual refresh as **cr-tdd-ladder
milestones M0–M8** — each milestone is its own branch → PR → strict CR-ist review
→ literal merge → `v0.MN` tag → archived `dist` tarball → deploy → verify-live.
Pure logic in `src/lib/` (unit-tested, no DOM/fetch), HTML-string view builders in
`src/views/`, all DOM/router/state wiring in `src/main.js`, styling in
`src/styles/main.css` (tested by asserting on rule blocks).

- **Live:** https://hermantrip.tomhe.app  (VPS `root@tomhe.app`, Caddy + Cloudflare)
- **Plan:** [docs/superpowers/plans/2026-06-13-ui-refresh.md](superpowers/plans/2026-06-13-ui-refresh.md)
- **Spec:** [docs/superpowers/specs/2026-06-13-ui-refresh-design.md](superpowers/specs/2026-06-13-ui-refresh-design.md)
- **CR rules (R1–R8):** [docs/cr-rules.md](cr-rules.md) · design/anti-AI: [docs/design.md](design.md)
- **Original project handoff (pre-refresh):** [docs/HANDOFF.md](HANDOFF.md)

## 1. Where we are (state to trust)

| | |
|---|---|
| Branch | `main` (clean) |
| Tests | **782 passing / 0 fail** (`npm test`) |
| Lint | clean (`npx eslint@9 --max-warnings=0 .`) |
| SW cache | `hermantrip-shell-v88` (in `sw.js`) |
| Latest tag | `v0.M68` (M7 Game). Next milestone = **M8 → `v0.M69`** (the LAST one) |
| Next SW bump | **v89** |

**Shipped milestones:** M1 Foundations (`v0.M62`, themes+toggle+slim header+icons+country colours) · M2 Home (`v0.M63`, photo-forward 4-parts bento-ish home) · M3 Country page (`v0.M64`, featured-first overlay grid) · M4 Album grid (`v0.M65`, justified rows + sticky day headers) · M5 Slideshow (`v0.M66`, charcoal stage + floating auto-hide bar + on-demand filmstrip) · M6 Map/Globe (`v0.M67`, Hebrew vector map via MapLibre GL + distinct country-colour pins + globe comet + immediate starfield) · M7 Game (`v0.M68`, progress strip + landscape options-beside-photo via a new `.game-body` flex wrapper).
**M6 follow-ups (live):** `v0.M67.1` (RTL fix so Hebrew map labels aren't reversed — `setRTLTextPlugin`; globe trip-lines made SOLID/persistent; the disliked cylinder pins reverted to the 3D **houses** at short quarter height with per-country-coloured roofs) · `v0.M67.2` (globe: dice-pip clusters for co-located visits + trail threads the exact houses, thinner arcs + 3D arrowheads, bigger click target, anisotropy; map: removed "מפה" title, light/dark toggle on map/timeline/game, portrait-phone zoom+recenter on Pare-pare, landscape-phone globe sizing fix) · `v0.M67.3` (globe: **reversed the dice decision** — co-located visits now COLLAPSE into ONE tower, height ∝ Σ days, click opens the album picker of all visits [Bangkok = 1 tower/5 albums]; trail arrowheads shrunk + placed on the arc APEX [new pure `src/lib/globe-arrows.js`; arcs use per-arc `arcAltitude` not autoScale]; houses moved to globe.gl's **objects layer** so a click raycasts the actual house mesh) · `v0.M67.4` (globe trail declutter: arrowheads only on segments ≥ `MIN_ARROW_ANGLE` ~3.4° so the Nepal/India cluster isn't a swarm [arrows 102→23, route line kept]; the two גבעת שמואל↔Bangkok legs bowed to different altitudes via `israelBangkokLeg`/`ISRAEL_LEG_ALT_SCALE` so the green outbound and red return don't overlap — the globe analog of the map's opposite-side bowing).
**Polish hotfixes (all live):** `v0.M63.1/.2/.3` (home: hero photos, bento→even-order, names-right, progressive image load, landscape fullscreen) · `v0.M64.1` (country even-grid) · `v0.M65.1–.5` (album/country: justified→uniform tiles, sticky-on-phone, header overflow, one-line subtitle, count-drop-on-portrait, shrink-to-fit long dates) · `v0.M66.1` (slideshow: symmetric cross-album continue-loop, persistent draggable filmstrip above the bar, opaque thumbs, load-gated autoplay — applied to the random viewers too) · `v0.M66.2` (slideshow: in-place slide advance so the dock/filmstrip don't re-render on swap — no control flicker, filmstrip keeps scroll, phone autoplay auto-hides; drag-over-thumbnail; visible album/country pill buttons in the random viewers) · `v0.M66.3` (slideshow: tap zones 40%→25% per side with a neutral middle 50%; info size read from Performance Resource Timing instead of a 2nd HEAD request; phone controls auto-hide — touch-emulated mouse hover no longer wedges them on, hover/activity gated to `pointerType==='mouse'`).

Tags continue the ladder — **before tagging, run `git tag --list 'v0.*'`** to confirm the next number. Sub-fixes use `v0.MN.x`; they do NOT consume the next milestone number (M7 is `v0.M68`).

## 2. Per-milestone command sequence (this repo)

```bash
git checkout main && git pull --ff-only origin main
git checkout -b m7-game                            # mN-slug / fix/slug
# … TDD task-by-task: write failing *.test.mjs, run (FAIL), implement, run (PASS) …
npm test                                          # 0 fail; node --test over all *.test.mjs
npx eslint@9 --max-warnings=0 .                   # exit 0
# bump sw.js SHELL_CACHE (v85→v86) + add any NEW src/lib|views file to SHELL_FILES
git commit … ; git push -u origin m7-game
gh pr create --base main --title "M7: Game" --body-file <body>   # R1+R2 sections + R-by-R table
#   → spawn crist (Agent subagent_type: crist) → APPROVED only
#   R2 body MUST include: 3 viewports (desktop+TABLET 820+phone) + a console-clean
#   probe (preview_console_logs level=error → none) + the gzipped JS payload delta (R5)
# build dist/ + archive, on the SAME branch:
#   dist = index.html sw.js icon.svg manifest.webmanifest favicon.ico favicon.png favicon-32.png
#          apple-touch-icon.png + data/manifest.json + src/ (minus *.test.mjs)
mkdir -p versions/v0.M68 && tar czf versions/v0.M68/dist-M68.tar.gz -C dist .
git add versions/v0.M68/dist-M68.tar.gz && git commit -m "Archive v0.M68 dist artifact to versions/" && git push
#   → re-spawn crist (artifact-only re-review; dismiss_stale_reviews invalidated the approval)
gh pr merge <N> --merge                           # LITERAL merge, never squash/rebase
git checkout main && git pull --ff-only
git tag -a v0.M68 -m "M7: Game — …" <merge-sha> && git push origin v0.M68
# deploy:
tar czf - -C dist . | ssh -o BatchMode=yes root@tomhe.app \
  'rm -rf /var/www/hermantrip/* && tar xzf - -C /var/www/hermantrip && echo DEPLOY_OK'
# verify live (curl sw.js cache version, new files 200, served view contains new markers)
git branch -d m7-game && git push origin --delete m7-game
```

**Methodology skills:** `superpowers:subagent-driven-development` (dispatch a fresh implementer subagent per task; pure-logic tasks are mechanical — a cheaper model is fine; integration/CSS that needs live iteration is often faster done directly) + `cr-tdd-ladder`. Pause and check with the owner at each milestone boundary.

## 3. CR-ist gotchas (learned the hard way)

- **It shares your working directory and sometimes `git checkout`s.** ALWAYS `git branch --show-current` / re-assert your branch after a crist run, before building dist or merging.
- **R2 needs THREE viewports — desktop + TABLET (820×1180) + phone.** Phone-landscape (844) does NOT substitute for the tablet band. A missing tablet probe = CHANGES_REQUESTED.
- **When you touch a render branch (e.g. empty/loading paths), CITE the state tests** (`role="status"`/`role="alert"`/empty) in the R2 section, or it's a CHANGES_REQUESTED.
- **Self-approve is blocked by GitHub** → the crist posts the verdict as a review *comment body* (`APPROVED\nAll R1-R8 pass.`). The body text is the verdict, not the event type.
- **Every push dismisses the prior approval** (`dismiss_stale_reviews:true`) → the artifact-archival commit needs a second (trivial) crist pass.
- It enforces the **anti-AI checklist** (no decorative gradients beyond functional photo scrims, **no `backdrop-filter`/glassmorphism**, no emoji, Rubik only).

## 4. Verification environment quirks (preview tooling)

- Dev server: `node scripts/serve.mjs` (`:8080`) — `.claude/launch.json` runs it on `:8081` as `hermantrip-dev` for `preview_start`. Its `/img/{id}/{w}` proxy DOES reach Google locally (real photos render).
- **`preview_screenshot` times out** on every page (`document_idle` never settles — fonts/SW/preloads). Documented exemption: use **DOM-state probes via `preview_eval`** at 3 viewport widths as R2 evidence.
- The preview tab is **backgrounded**, so: CSS **transitions freeze** at their start value (neutralise with `el.style.transition='none'` before measuring), and `loading="lazy"` `<img>`s **don't fetch** (probe `src`/geometry instead; or temporarily set `loading='eager'`). Background-image and `new Image()` preloads DO load.
- The preview is sandboxed to **localhost** — it can't open `hermantrip.tomhe.app` (cross-origin nav bounces back). Verify the live site by `curl`-ing the served files, and verify rendering on localhost (same committed code).

## 5. Service-worker / cache reality (tell the owner)

SW is **network-first** for the shell (`src/lib/sw-strategy.js`) with `skipWaiting`+`clients.claim`; `sw-update.js` auto-reloads once when a new SW takes control — **but only on a full page load** (SPA navigation in a pre-deploy tab keeps stale in-memory JS/CSS). After every deploy, a returning visitor needs **one full reload** (or close+reopen the tab); hard-reload / unregister-SW / clear-site-data are the escalation. The owner has hit this repeatedly — when they "don't see a change", first confirm the deployed file via `curl`, then it's their tab/SW, not the deploy.

## 6. Accumulated CSS/UX lessons (reuse these)

- **Equal-width tiles → CSS `grid auto-fill` (`repeat(auto-fill, minmax(Npx, 1fr))`)**, NOT flex `justify`/`flex-grow` (which slims the last row). Flex-justified only "fills" full rows.
- **Media queries add no specificity** — a base rule that follows a `@media` rule in source order wins. Use a higher-specificity selector (e.g. `.country-page .album-tile-featured`) or order carefully.
- **Mobile dynamic URL bar fights `position: sticky`** on scroll-up. Sticky day headers work; if they misbehave the cause is often a horizontal overflow elsewhere — fix that first (don't just drop sticky).
- **Horizontal overflow on phone** is usually a `white-space: nowrap` on a long title/label. Give it `min-width:0` + allow wrap, or shrink.
- **Structured subtitles:** `viewHeader({ subtitleHTML })` takes caller-trusted HTML (escape your dynamic parts). Country/album subs use `<span class="sub-count">N · </span><span class="sub-dates">…</span>`; the global phone-portrait rule `.sub-count { display:none }` drops the count on portrait. The trailing `·` lives inside `.sub-count`.
- **Shrink-to-fit one line:** `src/lib/fit-text.js` `fitFontPx()` (pure, proportional) + a DOM `fitTileSubs()` in `main.js` (run on render + resize + `document.fonts.ready`). Ellipsis is only a floor below 9px.
- **Progressive home tiles:** `src/lib/progressive-img.js` `progressiveChain()` (thumb→card→hero) + `upgradeTileImages()` in `main.js` (skips the hidden layout via `offsetParent===null`; skips the hero on phones).
- **`#app` escape:** the home/country pages use `main#app:has(.home-fit|.country-page) { padding:0; max-width:none }` to run edge-to-edge.
- The home is the trip's **4 parts** (np·in / vn·cn / au·nz / th); country colours/hero photos in `src/lib/country-colors.js` + `src/lib/country-hero.js`.

## 7. M5 (Slideshow) — SHIPPED ✓ (`v0.M66`, SW v79)

Re-skinned the live slideshow without regressing behaviour. What landed (for reference if a follow-up hotfix is needed):
- **CSS** (`src/styles/main.css` `/* ---- M5: slideshow ---- */`): `.slideshow-shell` pins `--stage:#211e1b` (charcoal in BOTH themes) + `background:var(--stage)`. The ONE `.slideshow-bar` is now a floating bottom overlay on a plain gradient scrim (no `backdrop-filter`) that **auto-hides in the windowed viewer too**, gated by `.controls-visible` (was fullscreen-only). Controls cluster into `.slideshow-group`s; cursor hides while controls hidden in both modes. New rail `.slideshow-filmstrip` + `.filmstrip-thumb`. Guard: `src/styles/slideshow-css.test.mjs`.
- **View** (`src/views/slideshow.js`): one `.slideshow-bar` grouped prev/play/next · speed/transition/loop · share/info/fullscreen · `▦`; a hidden `.slideshow-filmstrip[data-filmstrip hidden]`. (random-slideshow.js was NOT changed — it shares the CSS so its bar floats + auto-hides too, just no filmstrip/groups.)
- **Wiring** (`src/main.js`): `controls-timer.js` got a `windowedAutoHide` flag (default false → existing cases green); `applyControls` passes `true` and polls while visible in both modes. `render()` reveals the bar on FRESH slideshow entry only via a new `lastRenderInSlideshow` flag — NOT slide-to-slide (preserves the M11 autoplay-doesn't-pin-bar fix). `wireFilmstrip()`/`buildFilmstrip()` build the album's thumbnail rail lazily on first toggle (whole album, `imageUrl('thumb')`, active=current scrolled into view).
- **crist lesson (new):** the first review was CHANGES_REQUESTED on **PR-body omissions only** — R2 wants an explicit **console-clean** confirmation (`preview_console_logs level=error` → none) and R5 wants the **gzipped JS payload delta** stated in the body — even when behaviour is unchanged. Add both to every view-touching PR body up front.

## 8. M6 (Map / Globe) — SHIPPED ✓ (`v0.M67`, SW v83)

Deviated from the plan: the owner's custom MapTiler Hebrew styles are **vector** GL styles (`style.json` 200; raster `.png` 403 on their plan), so the plan's Leaflet+raster approach was infeasible. Pivoted (owner-approved) to **MapLibre GL** rendering the vector style via the **`@maplibre/maplibre-gl-leaflet@0.1.3`** plugin as the Leaflet base layer — all existing Leaflet pins/trail/popups kept. `maplibre-gl@4.7.1` + the plugin are lazy-loaded via `<script>` only on `/map` (R5). What landed:
- `src/config.js` (key + light `019ec2ac…` / dark `019ec2b7…` Hebrew style IDs; domain-restricted, **localhost is allow-listed** so the tiles render in the preview) + `src/lib/map-tiles.js` (`styleUrl` → `/maps/{id}/style.json?key=`).
- `initLeafletMap` uses `L.maplibreGL({ style: currentMapStyleUrl() })`; the map themes **on entry** (leaving `/map` destroys the instance; no theme toggle on the map page, so no live swap). Manual Hebrew country-label overlay removed (`country-labels.js` deleted) — the vector style renders `name:he` labels itself.
- Map + globe pins use the **7 distinct** country colours (`country-colors.js`). Globe 3D buildings + THREE replaced by country-coloured pins sized by days: `globe-buildings.js`→`globe-pins.js`. Comet trail (dash .25 / gap 4 / 4000ms) + starfield paints immediately.
- **Gotchas for next time:** MapTiler keys 403 a bare `curl` (no Referer) but work in-browser — verify map keys via the preview/browser, not curl. `/map`+globe never go `document_idle`, so `preview_screenshot` times out → R2 via DOM + `window._hermanGlobe` accessor probes. **Owner should eyeball the live map + globe** (WebGL/tiles not screenshot-able here).

## 8b. M7 (Game) — SHIPPED ✓ (`v0.M68`, SW v88)

Progress strip + landscape options-beside-photo, **view + CSS only** (`src/lib/game.js`
logic and `src/main.js` wiring untouched). What landed (reference if a follow-up
hotfix is needed):
- **View** (`src/views/game.js`): a `gameProgress(roundNum,totalRounds,score)` helper renders a slim `.game-progress` track + a `.game-progress-bar` (`style="width: <pct>%"`, `pct = round(roundNum/totalRounds*100)`, `role="progressbar"` with an `aria-label` carrying round+score) under `gameHeader()` on the country/album/result steps. Each of those three steps was regrouped into `.game-body` → (`.game-stage` photo + `.game-answers` holding the prompt + the option grid / result info+actions). The round/score TEXT stays in `gameHeader` (don't duplicate it).
- **CSS** (`src/styles/main.css` `/* ── Game view (M19) */` block): `.game-progress` (4px track, `--divider` bg) + `.game-progress-bar` (`height:100%`, `--accent` bg, width transition). `.game-body { flex:1 1 0; min-height:0; display:flex; flex-direction:column }` and `.game-answers { display:flex; flex-direction:column; min-height:0 }`. Landscape: `@media (orientation: landscape){ .game-body{ flex-direction:row } .game-stage{ flex:1 1 0 } .game-answers{ flex:0 0 clamp(240px,38%,420px); justify-content:center; overflow-y:auto } }`.
- **Tests:** `src/views/game.test.mjs` (strip+bar render, width ∝ round, `.game-body`/`.game-answers` present, aria-label) + `src/styles/game-photo-css.test.mjs` (`.game-progress`/`-bar` blocks, `.game-body` flex, landscape `.game-body{flex-direction:row}` via rule-block text). Suite 782/782.
- **Crucial lesson:** the originally-planned bare `.game-shell{ flex-direction:row }` flip does **NOT** work — with the flat child list flex-wrap squished the photo to ~46px and pushed the option grid *below*, not beside. The fix is the `.game-body` flex wrapper (shell stays a **column** so header+progress remain a full-width top bar; only the body flips to a row). Verify landscape geometry in the preview (photo fills body height, grid sits at `x` next to the stage) — don't trust the CSS test alone.

## 9. Starting M8 (Timeline) — THE ENTRY POINT (the LAST milestone)

**Branch `m8-timeline`, tag `v0.M69`, SW v89.** Goal: restyle the timeline view as a data-driven scrubber/rail. Plan section: the M8/Timeline tasks (`scrubber.js` + `country-motifs.js` per the plan — read the plan's M8 section for the exact task split before starting).

**What the timeline already is (read the files first, match their style):**
- `src/views/timeline.js` (+ `src/views/timeline.test.mjs`) — the current timeline view. Read it and its test to learn the existing structure/contract.
- `src/main.js` — timeline is lazy-hydrated (M26): `timelineData` built once from the manifest, an IntersectionObserver over day shells, plus window scroll/resize listeners torn down on route-leave (`teardownTimeline()`). Re-use that hydration pattern; don't stack listeners.
- Theme toggle already lives on the timeline page (added M67.2) — don't re-add it.
- New pure logic goes in `src/lib/` (e.g. `scrubber.js`, `country-motifs.js`) — no `document`/`window`/`fetch` there (R6); unit-test each in a `*.test.mjs` (R3).

**Ship:** TDD task-by-task (failing `*.test.mjs` → implement → pass; capture FAIL+PASS logs) → bump `sw.js` SHELL_CACHE **v88→v89** + **add any NEW `src/lib`/`src/views` module to `SHELL_FILES`** → `npm test` (0 fail) → `npx eslint@9 --max-warnings=0 .` → PR `M8: Timeline` with the R1 + R2 (3 viewports incl. tablet 820 + console-clean probe) + R5 (gzip delta) body → crist (APPROVED only) → artifact `versions/v0.M69/dist-M69.tar.gz` → crist re-review → `gh pr merge --merge` → tag `v0.M69` → deploy → verify-live → branch cleanup (full sequence in §2). **Timeline is data-dependent: visually sanity-check the rendered scrubber against real manifest data** (does תאילנד recur at the right spots? are the segment widths ~proportional to the time spent?), not only via unit tests. It's the LAST milestone — after it ships, the ladder M1–M8 is complete.
