// Transforms a Drive API v3 file resource into the manifest's photo record.
//
// Drive's EXIF time format is "YYYY:MM:DD HH:MM:SS" in the camera's local
// timezone (Drive does not normalize to UTC). We parse it as a *naive*
// timestamp and emit ISO-8601 without a Z suffix — the Timeline view treats
// it as the camera's wall-clock, matching user intuition ("this photo was
// taken at 14:32 wherever I was that day").

const EXIF_TIME_RE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

function parseExifTime(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(EXIF_TIME_RE);
  if (!m) return null;
  const [, year, mon, day, hh, mm, ss] = m;
  return `${year}-${mon}-${day}T${hh}:${mm}:${ss}`;
}

export function extractPhotoMeta(driveFile) {
  return {
    id: driveFile.id,
    name: driveFile.name,
    mimeType: driveFile.mimeType,
    thumbnailLink: driveFile.thumbnailLink ?? null,
    mtime: driveFile.modifiedTime ?? null,
    capturedAt: parseExifTime(driveFile.imageMediaMetadata?.time),
  };
}
