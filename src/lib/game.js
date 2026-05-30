// Guessing-game logic (M19).
//
// 10-round game: each round shows one photo, player guesses the country
// (1 pt) then the album from 4 choices (1 pt). Max score: 20.
//
// Cross-country albums (where countries.length > 1) are excluded because
// there is no single correct country answer.
//
// Pure logic — no DOM, no fetch.

// Return all albums eligible for the game (single-country only).
export function eligibleAlbums(manifest) {
  if (!manifest || !Array.isArray(manifest.albums)) return [];
  return manifest.albums.filter((a) => a.countries.length === 1 && a.photos.length > 0);
}

// Pick a random photo from a random eligible album.
// rng: () => number in [0,1) — injectable for tests.
export function pickRoundPhoto(eligible, rng = Math.random) {
  if (!eligible || eligible.length === 0) return null;
  const album = eligible[Math.floor(rng() * eligible.length)];
  const photo = album.photos[Math.floor(rng() * album.photos.length)];
  return { photo, album };
}

// Build 4 answer choices for the album step: the correct album + 3 random
// distractors from the same country. If fewer than 4 albums exist in the
// country, fill up with albums from other countries (edge-case safety).
// Returns a shuffled array of 4 {id, title} objects.
export function albumChoices(eligible, correctAlbum, rng = Math.random) {
  const same = eligible.filter(
    (a) => a.primary === correctAlbum.primary && a.id !== correctAlbum.id,
  );
  // Fisher-Yates shuffle of the pool (non-mutating).
  const shuffled = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  let distractors = shuffled(same).slice(0, 3);
  if (distractors.length < 3) {
    // Pad with albums from other countries.
    const others = shuffled(eligible.filter((a) => a.id !== correctAlbum.id && !distractors.some((d) => d.id === a.id)));
    distractors = [...distractors, ...others.slice(0, 3 - distractors.length)];
  }

  const choices = shuffled([correctAlbum, ...distractors]);
  return choices.map((a) => ({ id: a.id, title: a.title || a.name }));
}

// Score a country guess.
// country: the selected country code
// correctCountry: the album's primary country code
export function scoreCountry(country, correctCountry) {
  return country === correctCountry ? 1 : 0;
}

// Score an album guess.
export function scoreAlbum(albumId, correctAlbumId) {
  return Number(albumId) === Number(correctAlbumId) ? 1 : 0;
}

export const TOTAL_ROUNDS = 10;
export const MAX_SCORE = TOTAL_ROUNDS * 2; // 1 country + 1 album per round

// Generate all 10 rounds upfront (deterministic given rng).
// Each round: { photo, album }.
export function generateRounds(manifest, rng = Math.random) {
  const eligible = eligibleAlbums(manifest);
  return Array.from({ length: TOTAL_ROUNDS }, () => pickRoundPhoto(eligible, rng));
}
