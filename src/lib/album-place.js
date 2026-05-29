// Extracts a human "place" (city/area) from a Hebrew album name for the
// slideshow info panel.
//
// Album names look like "01. נפאל - קטמנדו" (NN. {country} - {place}) or
// occasionally have no separator ("19. בנגקוק1", "37. קונמינג בנגקוק ופרת'").
// We strip the leading "NN. "/"NNa. " number prefix, then take the text
// after the last " - " (the place); if there's no " - ", return the whole
// cleaned remainder. Pure.

export function albumPlace(albumName) {
  if (typeof albumName !== 'string') return '';
  // Strip a leading album-number prefix: digits + optional letter, then an
  // optional "." and/or whitespace. "01. ", "14a. ", "42." → removed.
  let s = albumName.replace(/^\s*\d{1,3}[a-z]?\.?\s*/i, '');
  // Take the segment after the last " - " (country - place); else keep all.
  const idx = s.lastIndexOf(' - ');
  if (idx !== -1) s = s.slice(idx + 3);
  return s.trim();
}
