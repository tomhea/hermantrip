# 12-improvement batch (requested 2026-05-31)

Run autonomously under cr-tdd-ladder; ~8 grouped milestones; stop only on
trouble (blocked CR verdict, ambiguity, failure). Each milestone:
branch → tests (FAIL→PASS) → `node --test` 0-fail + `npm run lint` clean →
build dist + bump SW cache → PR → CR-ist APPROVED → merge → tag → archive →
deploy → verify live (DOM probe).

## Milestone plan & status

Reordered: #2 (mobile bar) first so later button additions land on an
overflow-safe layout.

- [ ] **M30** — Slideshow mobile/vertical: all buttons visible (wrap), info panel on-screen (#2)
- [ ] **M31** — Slideshow: 5 transitions (#1)
- [ ] **M32** — Slideshow: repeat-album↔continue-to-next toggle (#3) + persist all picks, localStorage (#4)
- [ ] **M33** — Slideshow input: space=play/pause (#7) + long-press side-zone = explicit no-op (#8)
- [ ] **M34** — Album-card "play" button → first photo, autoplay, fullscreen (#6)
- [ ] **M35** — Guessing game: maximize photo size (#5)
- [ ] **M36** — Timeline: sticky "← חזרה ציר זמן" bar overlapping content on scroll (#11)
- [ ] **M37** — Map: ≥1 arrow per segment (#9) + closing Thailand→Israel leg with bidirectional Israel↔Bangkok coloring (#12)
- [ ] **M38** — Globe: city visited 2+ times → "choose which" picker (#10)

## Notes / decisions
- Transitions set (#1) proposed: none/cut, fade, crossfade, slide, zoom (Ken Burns). Confirm or adjust during M30.
- #4 persists: speed, autoplay, transition, loop-mode (and any other picks).
- #12 "nice way": render Israel↔Bangkok as a two-tone segment (green outbound, red return) — decide exact rendering in M37.
