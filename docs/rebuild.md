# Rebuild guide

The Drive folder is frozen — `scripts/build-manifest.mjs` runs **once at
M1** and the resulting `data/manifest.json` is committed forever. No CI
re-run, no cron, no recurring secrets to rotate.

This file exists in case the assumption ever breaks: if a photo gets
deleted, renamed, or added years from now and someone needs to refresh
the manifest, here's the recipe.

## One-time setup

1. Open [console.cloud.google.com](https://console.cloud.google.com/).
2. Top bar → "Select a project" → "New project" → name `hermantrip` →
   Create. Switch to it.
3. Left nav → APIs & Services → Library → search **Google Drive API** →
   Enable.
4. Left nav → APIs & Services → Credentials → "+ Create credentials" →
   "API key". Copy the key.
5. (Recommended) "Edit API key" → "API restrictions" → "Restrict key" →
   tick **only** Google Drive API → Save.

The key is read-only against public files. Revoke it after the build
finishes — nothing on the site uses it at runtime.

## Run

```sh
DRIVE_API_KEY=AIza... node scripts/build-manifest.mjs
```

Stderr prints per-album progress. Stdout is silent. Output written to
`data/manifest.json`.

## Verify

- `git diff data/manifest.json` — expect a small diff if photos were
  added/removed since last build.
- `npm test` — pure-logic tests stay green (range assignment + ordering
  + EXIF parsing).
- Eyeball: photo counts per album look right.

## Commit

```sh
git checkout -b fix/manifest-refresh-$(date +%Y%m%d)
git add data/manifest.json
git commit -m "Refresh manifest (Drive folder updated)"
git push -u origin HEAD
gh pr create --base main --title "Fix: refresh manifest" --body "..."
```

Then CR-ist re-review + literal merge + new tag `v0.M13.<n>`.
