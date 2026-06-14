# Handoff — UI refresh (continuing at M5)

_For a fresh session picking up the hermantrip UI-refresh. Read this, then the
plan + spec + cr-rules (links below). Last updated after **M4 + polish shipped**;
**next up is M5 (Slideshow)**._

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
| Tests | **735 passing / 0 fail** (`npm test`) |
| Lint | clean (`npx eslint@9 --max-warnings=0 .`) |
| SW cache | `hermantrip-shell-v78` (in `sw.js`) |
| Latest milestone tag | `v0.M65` (M4). Next milestone = **M5 → `v0.M66`** |
| Next SW bump | **v79** |

**Shipped milestones:** M1 Foundations (`v0.M62`, themes+toggle+slim header+icons+country colours) · M2 Home (`v0.M63`, photo-forward 4-parts bento-ish home) · M3 Country page (`v0.M64`, featured-first overlay grid) · M4 Album grid (`v0.M65`, justified rows + sticky day headers).
**Polish hotfixes (all live):** `v0.M63.1/.2/.3` (home: hero photos, bento→even-order, names-right, progressive image load, landscape fullscreen) · `v0.M64.1` (country even-grid) · `v0.M65.1–.5` (album/country: justified→uniform tiles, sticky-on-phone, header overflow, one-line subtitle, count-drop-on-portrait, shrink-to-fit long dates).

Tags continue the ladder — **before tagging, run `git tag --list 'v0.*'`** to confirm the next number. Sub-fixes use `v0.M65.N`; they do NOT consume the next milestone number (M5 is still `v0.M66`).

## 2. Per-milestone command sequence (this repo)

```bash
git checkout main && git pull --ff-only origin main
git checkout -b m5-slideshow                      # mN-slug / fix/slug
# … TDD task-by-task: write failing *.test.mjs, run (FAIL), implement, run (PASS) …
npm test                                          # 0 fail; node --test over all *.test.mjs
npx eslint@9 --max-warnings=0 .                   # exit 0
# bump sw.js SHELL_CACHE (v78→v79) + add any NEW src/lib|views file to SHELL_FILES
git commit … ; git push -u origin m5-slideshow
gh pr create --base main --title "M5: Slideshow" --body-file <body>   # R1+R2 sections + R-by-R table
#   → spawn crist (Agent subagent_type: crist) → APPROVED only
# build dist/ + archive, on the SAME branch:
#   dist = index.html sw.js icon.svg manifest.webmanifest favicon.ico favicon.png favicon-32.png
#          apple-touch-icon.png + data/manifest.json + src/ (minus *.test.mjs)
mkdir -p versions/v0.M66 && tar czf versions/v0.M66/dist-M66.tar.gz -C dist .
git add versions/v0.M66/dist-M66.tar.gz && git commit -m "Archive v0.M66 dist artifact to versions/" && git push
#   → re-spawn crist (artifact-only re-review; dismiss_stale_reviews invalidated the approval)
gh pr merge <N> --merge                           # LITERAL merge, never squash/rebase
git checkout main && git pull --ff-only
git tag -a v0.M66 -m "M5: Slideshow — …" <merge-sha> && git push origin v0.M66
# deploy:
tar czf - -C dist . | ssh -o BatchMode=yes root@tomhe.app \
  'rm -rf /var/www/hermantrip/* && tar xzf - -C /var/www/hermantrip && echo DEPLOY_OK'
# verify live (curl sw.js cache version, new files 200, served view contains new markers)
git branch -d m5-slideshow && git push origin --delete m5-slideshow
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

## 7. Starting M5 (Slideshow) — the plan's RISKIEST milestone

**Branch `m5-slideshow`, tag `v0.M66`, SW v79.** Re-skin the live slideshow WITHOUT regressing behaviour (autoplay, speed, 5 transitions, loop, fullscreen, share menu, info panel, swipe, keyboard, next-album-at-end, scroll-restore, M59 landscape-phone fullscreen).

**Non-negotiable:** keep the existing `src/views/slideshow.test.mjs` and `src/lib/controls-timer.test.mjs` **green** — add new cases, don't rewrite the existing ones. Do not regress fullscreen / share / info.

Tasks (full detail in the plan, M5 section):
- **5.1 — CSS** (`main.css` + new `src/styles/slideshow-css.test.mjs`): `.slideshow-shell` always-charcoal `--stage: #211e1b` (both themes); `.slideshow-stage` centres the photo (`display:flex; align-items/justify-content:center`); `.slideshow-photo` `max-width/height:100%` contained; one floating `.slideshow-bar` on a **plain gradient scrim — NO `backdrop-filter`** (the test asserts no `backdrop-filter` in any `.slideshow-*` rule).
- **5.2 — View** (`src/views/slideshow.js` + extend `slideshow.test.mjs`): reorder the existing controls into ONE `.slideshow-bar` (prev/play/next · speed/transition/loop · share/info/fullscreen · `▦` filmstrip-toggle); add a hidden `.slideshow-filmstrip[hidden]` + a `[data-filmstrip-toggle]`.
- **5.3 — Wiring** (`src/main.js` `wireSlideshow`): wire the filmstrip toggle (populate neighbour thumbnails via `imageUrl`); extend auto-hide to the **windowed** (non-fullscreen) viewer. **`controls-timer.js`: add a `windowedAutoHide` flag defaulting to `false`** (keeps every existing `controls-timer.test.mjs` case green); the slideshow passes `windowedAutoHide:true`. Add new tests for the `true` path only; fullscreen behaviour unchanged.

**Key files:** `src/views/slideshow.js`, `src/lib/controls-timer.js` (+ its test), `src/main.js` (the slideshow render/`wireSlideshow`/autoplay block — grep `slideshow`, `controlsVisible`, `applyControls`, `data-fullscreen-toggle`), `src/styles/main.css` (`/* ---- M5: slideshow ---- */` section). Verify live with the preview at 3 viewports: charcoal stage, centred photo, one control row that **auto-hides after idle and returns on move/tap/key** (now in the windowed viewer too), filmstrip toggles, and share/info/fullscreen still work.

## 8. After M5

M6 Map/Globe (`v0.M67`) **needs the MapTiler key + light/dark Hebrew style IDs from the owner** — pause and ask before M6; paste into `src/config.js` (see the plan's Risks list for the gotchas). Then M7 Game (`v0.M68`), M8 Timeline (`v0.M69`, data-dependent scrubber — visually sanity-check against real data).
