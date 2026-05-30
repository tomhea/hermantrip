# CR rules

The eight hard requirements every PR into `main` must satisfy. Each has a
one-letter ID so review comments quote it (`R1 fail: ...`).

## R1 — Tests first, evidence in PR body

The PR description MUST contain a `## TDD evidence (R1)` section with two
fenced code blocks:

1. `npm test` output showing the new test(s) **FAIL**ing (run before the
   change).
2. Same command's output showing those tests **PASS**ing (run after).

Without the FAIL log we cannot tell whether the test would have caught the
regression.

## R2 — Integration evidence for behavior changes

Any change that touches user-visible behavior (UI, image-loading, routing)
MUST include a `## Integration evidence (R2)` section with:

- Browser screenshots at **three** viewports: `390x844` (phone), `820x1180`
  (tablet), `1440x900` (desktop).
- A DevTools console snippet showing no errors.
- The view's **loading state**, **empty/no-data state**, and **fetch-failed
  state** must each appear at least once across the PR's screenshots (not
  required on every viewport — just each state once).
- Image-loading PRs also include `node scripts/smoke.mjs` output (10-photo
  lh3 fetch smoke).

**Screenshot tool limitation (all views, M2+):** The test-harness
screenshot tool (`mcp__Claude_in_Chrome__computer` action=screenshot)
blocks on Chrome's `document_idle` and times out on every page in this
project (the Chrome extension's executeScript check waits for all network
activity to cease, including Google Fonts, service-worker registration,
and image preloads). This is a persistent infrastructure constraint, not
a per-view issue. Browser DOM-state probes (via `javascript_tool`) at
three viewport widths are accepted as equivalent evidence for all views,
provided:
- Each probe confirms the key elements rendered (containers, data counts,
  interactive elements).
- Console errors are confirmed absent (`window.onerror`, `consoleErrors`).
- Loading and error HTML states are verified by unit tests (role="status"
  / role="alert") or live navigation to those states.
- The PR body explicitly lists the viewport sizes probed and the values
  observed.

The CR-ist additionally runs the **anti-AI checklist** from
`docs/design.md` — any screenshot showing purple/indigo gradients,
glassmorphism (`backdrop-filter: blur`), emoji-laden headings, generic
AI-mockup typography, "Welcome to {site}" auto-text, or stiff
machine-translated Hebrew is grounds for CHANGES_REQUESTED.

## R3 — Test coverage on touched logic

Every new or modified file under `src/lib/` MUST have a corresponding
`*.test.mjs` exercising the new branch. Every view in `src/views/` MUST
have explicit tests for its **no-data** and **fetch-failed** render paths.
Pure render / glue code without branches is exempt (R2 covers it).

## R4 — Image discipline

All Drive image URLs MUST be constructed via `src/lib/image-url.js`. Raw
`drive.google.com` / `lh3.googleusercontent.com` strings are forbidden
elsewhere — the CR-ist greps the diff. Every `<img>` element MUST have an
`onerror` fallback that swaps the `src` to the manifest's stored
`thumbnailLink`.

## R5 — Performance budget

- First paint of any view loads ≤ 12 images. The rest are
  IntersectionObserver- or `loading="lazy"`-lazy.
- The PR body MUST state the JS payload delta (minified+gzipped) added by
  this PR. Target ≤ 20 KB per PR; PRs exceeding it need explicit
  justification in the body.
- Any third-party library > 50 KB (Globe.gl, three.js, etc.) MUST be loaded
  only via dynamic `import()` on user action — never in the initial bundle.

## R6 — Module placement

- Pure logic lives in `src/lib/` and MUST NOT import or reference
  `document`, `fetch`, `window`, `navigator`, or DOM types. The CR-ist
  greps `src/lib/` for these.
- Views live in `src/views/`.
- Build scripts live in `scripts/`.
- Generated data lives in `data/`.

## R7 — Branch & PR naming

- Branch: `mN-feature-slug` (lowercase, kebab) for milestones,
  `sN-topic` for spikes, `fix/<slug>` for hotfixes.
- PR title: exact format `M<N>: <feature>` / `Spike: <topic>` /
  `Fix: <short>`.
- PR body MUST contain a `## TDD evidence (R1)` section and (where
  applicable) a `## Integration evidence (R2)` section, plus the R-by-R
  self-check table.

## R8 — Zero new warnings

- `node --check` on every touched `.js`/`.mjs` file passes.
- ESLint runs clean with `--max-warnings=0` (config added in M2 when
  source files first appear).
- New baseline warnings appended to `docs/known-warnings.md` ONLY with
  explicit justification in the PR body.

---

## Verdict format the CR-ist uses

When approving: review body `APPROVED\nAll R1-R8 pass.`

When requesting changes: review body
```
CHANGES REQUESTED
R<id> fail: <one-line reason>
R<id> fail: ...
```

Inline comments quote the offending lines with `R<id>:` prefix.
