# Batch 3 — fixes (M51–M60)

User-reported fix list (2026-06-01). Each ships as its own milestone through the
cr-tdd-ladder (branch → tests FAIL→PASS → PR → CR-ist → merge → tag → archive →
deploy → verify). Two decisions confirmed by the user up front:

- **Execution:** autonomous through all 10, one summary at the end.
- **#8 multi-country URLs:** *canonical per country* — a multi-country album is a
  first-class page under EACH of its countries (no cross-country redirect); city
  aliases redirect to the canonical within the **same** country.

| M   | Item | Summary |
|-----|------|---------|
| M51 | #8 | **Regression.** `albumBySlug` matched `a.primary === code`, so multi-country albums (1 = בנגקוק+קטמנדו, 37 = קונמינג+בנגקוק+פרת') 404'd under every non-primary country. Fix: match `a.countries.includes(code)`. Map popup + globe links use the per-stop `country` (not `primary`) so map entries point to *their* country's shared album. |
| M52 | #3 | Clicking a single-album map pin opens directly (no 1-of-1 popup). Multi-album pins keep the popup; globe already direct for single. |
| M53 | #1 | Timeline thumbnail links to the **exact slide** (`slidePath` with the photo's index in its album), not the album top. |
| M54 | #7 | Closing the slideshow returns to the album page at the **same scroll position** (album→slide remembers scrollY; slide→album restores it). |
| M55 | #6 | "האלבום הבא: שם" button at the bottom of each album → next album in that country. Last album shows no button (no wrap). |
| M56 | #0 | Globe buildings: **two windows per floor** + darker window frame; **enlarge the click/hover hit area** so pressing anywhere on a building (base→roof) selects it. |
| M57 | #4 | Globe loading: black **starfield + "טוען את כדור הארץ…"** instead of an empty black screen while globe.gl/three load. |
| M58 | #2 | Map labels (countries + cities) in **Hebrew only**. |
| M59 | #5 | Phone **landscape → fullscreen** (hide the browser URL bar). |
| M60 | #9 | Add favicon / app icons (files in `~/Downloads`: favicon.ico, favicon.png 32², favicon-32.png 128², apple-touch-icon.png 180², favicon.svg). |

Order rationale: #8 first (live regression), then the logic fixes (#3/#1/#7/#6),
then the globe/visual set (#0/#4), then #2/#5/#9. Each milestone bumps `sw.js`
`SHELL_CACHE` + `SHELL_FILES` when it adds a module, and redeploys.
