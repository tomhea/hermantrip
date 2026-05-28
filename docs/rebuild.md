# Rebuild guide

How to re-run `scripts/build-manifest.mjs` when the family adds (or removes)
photos from the Drive folder.

## Placeholder

Filled in during M1 once `scripts/build-manifest.mjs` exists. Will cover:

1. One-time `rclone config` for the Drive remote (and the optional OAuth
   client_id to avoid Google's shared throttle).
2. The re-run command: `node scripts/build-manifest.mjs`.
3. Review the `git diff data/manifest.json` (should be small — append-only
   for new photos, removal for deleted ones, untouched for existing).
4. Commit on a `fix/manifest-refresh-YYYYMMDD` branch.
5. CR-ist re-runs (R1 passes vacuously for pure data; R2 needs a 10-photo
   smoke).
6. Tag `v0.M13.<n>` and `bash scripts/deploy.sh`.
