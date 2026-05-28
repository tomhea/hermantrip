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
