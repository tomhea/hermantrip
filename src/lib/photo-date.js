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

// Compact Hebrew range from two date-only strings "YYYY-MM-DD" (M15).
//   same day        → "23 ביולי 2011"
//   same month/year → "23–27 ביולי 2011"
//   same year       → "23 ביולי – 2 באוגוסט 2011"
//   spans years     → "30 בדצמבר 2011 – 3 בינואר 2012"
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function formatDateRange(startDate, endDate) {
  const ms = String(startDate).match(DATE_RE);
  const me = String(endDate).match(DATE_RE);
  if (!ms || !me) return '';
  const s = { y: +ms[1], mo: +ms[2], d: +ms[3] };
  const e = { y: +me[1], mo: +me[2], d: +me[3] };
  const mon = (mo) => MONTHS_HE[mo - 1];
  const full = (x) => `${x.d} ${mon(x.mo)} ${x.y}`;

  if (s.y === e.y && s.mo === e.mo && s.d === e.d) return full(s);
  if (s.y === e.y && s.mo === e.mo) return `${s.d}–${e.d} ${mon(s.mo)} ${s.y}`;
  if (s.y === e.y) return `${s.d} ${mon(s.mo)} – ${e.d} ${mon(e.mo)} ${s.y}`;
  return `${full(s)} – ${full(e)}`;
}
