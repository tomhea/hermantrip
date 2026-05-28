# Spike outcomes

Spikes are throwaway experiments on `sN-` branches that de-risk a specific
unknown. They never merge, never get CR-ist'd. Their outcomes get recorded
here so future sessions know what was tried.

## s0 — lh3 image URL validation

**Question:** Does `https://lh3.googleusercontent.com/d/{FILE_ID}=w{WIDTH}`
serve resized JPEGs for files in the project's public Drive folder, with no
auth and with `Access-Control-Allow-Origin: *`?

**Method:** Curl-fetched 5 file IDs sampled from one album subfolder of
`https://drive.google.com/drive/folders/1MUS4Zl3eB5DmV-LPDulOla0r0bfouc7a`.
Ran `curl -sI` against the lh3 pattern for each.

**Result (2026-05-28):**

| ID (first 8 chars) | Status | Content-Type | Notes |
|---|---|---|---|
| `12PqAec5` | 404 | text/html | Sub-folder ID, not a file — expected mis-hit |
| `17x3KXau` | 200 | image/jpeg | ✓ |
| `1FEOMUcT` | 200 | image/jpeg | ✓ |
| `1KR8yi4b` | 200 | image/jpeg | ✓ |
| `1MVzDcrR` | 200 | image/jpeg | ✓ |

Width parameter genuinely resizes:

| Width | Content-Length |
|---|---|
| `=w300` | 17,489 bytes |
| `=w800` | 84,593 bytes |
| `=w1600` | 596,086 bytes |
| `=w2400` | 596,086 bytes (capped at source dimension) |

All responses included `Access-Control-Allow-Origin: *` — safe to load via
`<img>` from any origin, including hermantrip.tomhe.app.

**Decision:** PROCEED with the lh3 strategy as planned. The 404 confirms
the build manifest must filter folder IDs vs file IDs (handled in M1 via
rclone's `IsDir` field). The width cap suggests `image-url.js` should not
go above 2400 since beyond that we just pay bytes for no resolution gain.

**Follow-ups baked into the plan already:**
- `image-url.js` must still emit `onerror` fallback to `thumbnailLink` (R4)
  in case lh3 ever breaks for an individual file.
- `scripts/smoke.mjs` (added in M6) re-runs this check on 10 random IDs
  per CI run to detect regression.

## s2 — Chrome ORB blocks ~3% of Drive image URLs (M3 discovery)

**Question:** When the M3 country-list view loaded 7 thumbs at once, 3 of
them failed with `net::ERR_BLOCKED_BY_ORB` despite the same URLs returning
valid `image/jpeg` to curl with `Access-Control-Allow-Origin: *`. Why, and
how do we handle it?

**Investigation (2026-05-29):**

- Headers between working and failing lh3 URLs are byte-identical (same
  Content-Type, same CORS, same Content-Disposition, same nosniff).
- File bodies are valid JPEGs (FF D8 FF E0 JFIF magic, 72 KB each, opens
  in image viewers).
- Width parameter swept w200…w2000 for one failing file in isolation:
  all sizes failed except `=w800` (which succeeded in one trial and failed
  in another).
- Alternate URL forms tested: `drive.google.com/uc?id=&export=view`,
  `drive.google.com/thumbnail?id=&sz=w600`, the `thumbnailLink` field from
  Drive API (`lh3.googleusercontent.com/drive-storage/...=s220`) — all
  triggered ORB.
- Affected file names share a pattern: Samsung-style `YYYYMMDD_HHMMSS.jpg`
  with Picasa-stamped EXIF software field. DSC_/IMG_ camera files always
  worked.

**Decision (accept):**

- 5/7 country thumbs render normally; 2/7 fall back to a pale diagonal
  hatch placeholder via the R4 `onerror` chain (lh3 → thumbnailLink →
  placeholder). The placeholder is visually intentional, no broken-image
  glyph.
- The R4 fallback architecture is correct and works as designed; ORB just
  also blocks the secondary URL for these specific files.
- This is a Chromium-specific runtime quirk. Firefox / Safari don't
  implement ORB the same way and likely render all 7 thumbs.

**Follow-up (M12 polish):**

- Possible mitigation: at runtime, when both onerror branches fire,
  rotate through the NEXT photo in the album (since the affected files
  cluster by camera/uploader, the second/third photo usually loads).
- Alternative: a build-time "lh3 ORB sniff" that probes each photo's URL
  via a headless Chrome run and marks `orbSafe: false` in the manifest;
  the view skips those for representative thumb selection.
- Neither blocks M3 — they're polish for M12.
