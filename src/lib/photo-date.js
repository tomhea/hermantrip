// Hebrew date + weekday formatting for a photo's EXIF capture time.
//
// capturedAt is a naive ISO string "YYYY-MM-DDTHH:MM:SS" (the camera's
// local wall-clock; see photo-meta.js). We format it for the slideshow
// info panel. Parsed via explicit Y/M/D so there's no timezone shift.
//
// Pure — names are hand-listed (deterministic, idiomatic Hebrew, not
// machine-translated).

const MONTHS_HE = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
];

const WEEKDAYS_HE = [
  'יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי',
  'יום חמישי', 'יום שישי', 'יום שבת',
];

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

function parse(iso) {
  if (typeof iso !== 'string') return null;
  const m = iso.match(ISO_RE);
  if (!m) return null;
  return {
    y: +m[1], mo: +m[2], d: +m[3], hh: +m[4], mm: +m[5], ss: +m[6],
  };
}

export function formatHebrewDate(iso) {
  const p = parse(iso);
  if (!p || p.mo < 1 || p.mo > 12) return '';
  return `${p.d} ${MONTHS_HE[p.mo - 1]} ${p.y}`;
}

export function hebrewWeekday(iso) {
  const p = parse(iso);
  if (!p) return '';
  // Use UTC to derive the weekday without any local-timezone shift.
  const dow = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay(); // 0=Sun
  return WEEKDAYS_HE[dow] ?? '';
}

export function formatClock(iso) {
  const p = parse(iso);
  if (!p) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(p.hh)}:${pad(p.mm)}`;
}
