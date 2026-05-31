# Batch 2 — 10 improvements (requested 2026-05-31, after M38)

Grouped, autonomous, full cr-tdd-ladder. #6 file size via runtime HEAD fetch
to /img/{id}/orig (Content-Length verified present + CORS-exposed).

- [ ] **M39** — Timeline: (#1b) kill scroll-jank by caching .tl-day offsets
      (was reading offsetTop ×325 every scroll frame); (#1a) slider stays in a
      constant position — render slider ABOVE the (scroll-away) header so it's
      pinned at top:0 from scroll 0.
- [ ] **M40** — Album page (album-grid): play button labelled "הצג את האלבום"
      under the album name → first photo, autoplay, fullscreen (#2).
- [ ] **M41** — "מצגת אקראית" goes fullscreen + autostarts; add it as a play
      button on each home country card (same UI as album play buttons) (#3).
- [ ] **M42** — Slideshow share button: copy link / copy picture / share link /
      share picture (Clipboard + Web Share API) (#4).
- [ ] **M43** — Info panel: (#5) right-align the "35/74" counter value;
      (#6) drop the "אלבום" row, add a bottom "גודל" row showing original file
      size in KB via runtime HEAD on /img/{id}/orig.
- [ ] **M44** — Loop toggle: hover titles "חוזר על האלבום" / "ממשיך לאלבום הבא";
      vertically mirror the "next album" icon (#7).
- [ ] **M45** — Guessing game: add a "חזרה" back button (#8).
- [ ] **M46** — Map Bangkok pins: popups show album NAME (not "בנגקוק"); drop
      the linkless closing-stop label (null labels only when the pin has no
      album links) (#9).
- [ ] **M47** — Globe: gradient trail + per-segment arrows, like the map (#10a).
- [ ] **M48** — Globe: replace point markers with "buildings" whose height =
      days visited (album day-span); multiple visits → multiple buildings;
      album spanning X places → 1/X of its days each (#10b).
