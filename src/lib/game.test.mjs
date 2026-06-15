import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  eligibleAlbums, pickRoundPhoto, albumChoices, countryChoices,
  scoreCountry, scoreAlbum, generateRounds, TOTAL_ROUNDS, MAX_SCORE,
  doneMessage, shouldCelebrate, nextRoundPhoto,
} from './game.js';

// ── Fixture manifest ──────────────────────────────────────────────
const makeAlbum = (id, countries, photos = [{ id: `p${id}`, capturedAt: '2011-01-01T00:00:00' }]) => ({
  id, countries, primary: countries[0], name: `Album ${id}`, title: `Album ${id}`, photos,
});

const manifest = {
  countries: [
    { code: 'np', he: 'נפאל' }, { code: 'in', he: 'הודו' }, { code: 'au', he: 'אוסטרליה' },
  ],
  albums: [
    makeAlbum(1, ['np', 'th']),   // cross-country → excluded
    makeAlbum(2, ['np']),
    makeAlbum(3, ['np']),
    makeAlbum(4, ['np']),
    makeAlbum(5, ['in']),
    makeAlbum(6, ['in']),
    makeAlbum(7, ['au']),
    makeAlbum(8, ['au'], []),     // no photos → excluded
  ],
};

// Deterministic rng: always picks index 0.
const rng0 = () => 0;

// ── Tests ─────────────────────────────────────────────────────────
test('eligibleAlbums excludes cross-country albums', () => {
  const r = eligibleAlbums(manifest);
  assert.ok(!r.some((a) => a.countries.length > 1), 'cross-country album present');
});

test('eligibleAlbums excludes albums with no photos', () => {
  const r = eligibleAlbums(manifest);
  assert.ok(!r.some((a) => a.photos.length === 0), 'empty album present');
});

test('eligibleAlbums returns only single-country albums with photos', () => {
  const r = eligibleAlbums(manifest);
  // albums 2,3,4 (np), 5,6 (in), 7 (au) — NOT 1 (cross) or 8 (no photos)
  assert.equal(r.length, 6);
});

test('eligibleAlbums returns [] when manifest is null', () => {
  assert.deepEqual(eligibleAlbums(null), []);
});

test('pickRoundPhoto returns { photo, album }', () => {
  const r = pickRoundPhoto(eligibleAlbums(manifest), rng0);
  assert.ok(r !== null);
  assert.ok('photo' in r && 'album' in r);
});

test('pickRoundPhoto returns null for empty pool', () => {
  assert.equal(pickRoundPhoto([], rng0), null);
});

test('albumChoices returns exactly 4 choices', () => {
  const eligible = eligibleAlbums(manifest);
  const album = eligible.find((a) => a.id === 2);
  const choices = albumChoices(eligible, album, rng0);
  assert.equal(choices.length, 4);
});

test('albumChoices includes the correct album', () => {
  const eligible = eligibleAlbums(manifest);
  const album = eligible.find((a) => a.id === 2);
  const choices = albumChoices(eligible, album, rng0);
  assert.ok(choices.some((c) => c.id === 2));
});

test('albumChoices are unique', () => {
  const eligible = eligibleAlbums(manifest);
  const album = eligible.find((a) => a.id === 2);
  const choices = albumChoices(eligible, album, rng0);
  const ids = choices.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate choices');
});

// ── countryChoices (M68.1): 4 country options incl. the correct one ──
const GAME_COUNTRY_CODES = new Set(['np', 'in', 'vn', 'cn', 'au', 'nz', 'th']);

test('countryChoices returns exactly 4 codes', () => {
  assert.equal(countryChoices('np', rng0).length, 4);
});

test('countryChoices includes the correct country', () => {
  assert.ok(countryChoices('cn', rng0).includes('cn'));
});

test('countryChoices are unique', () => {
  const c = countryChoices('th', rng0);
  assert.equal(new Set(c).size, c.length, 'duplicate country choices');
});

test('countryChoices are all valid game country codes', () => {
  for (const code of countryChoices('au', rng0)) {
    assert.ok(GAME_COUNTRY_CODES.has(code), `unexpected code ${code}`);
  }
});

// ── doneMessage / shouldCelebrate (M68.2): graduated end messages ──
test('doneMessage: perfect 20/20 → מושלם', () => { assert.equal(doneMessage(20, 20), 'מושלם!'); });
test('doneMessage: 18/20 → מעולה', () => { assert.equal(doneMessage(18, 20), 'מעולה!'); });
test('doneMessage: 15/20 → כל הכבוד', () => { assert.equal(doneMessage(15, 20), 'כל הכבוד!'); });
test('doneMessage: 11/20 → יפה מאוד', () => { assert.equal(doneMessage(11, 20), 'יפה מאוד!'); });
test('doneMessage: under 10 is a fixed try-again', () => {
  assert.equal(doneMessage(9, 20), 'נסו שוב!');
  assert.equal(doneMessage(0, 20), 'נסו שוב!');
});
test('shouldCelebrate: only a perfect score', () => {
  assert.equal(shouldCelebrate(20, 20), true);
  assert.equal(shouldCelebrate(19, 20), false);
  assert.equal(shouldCelebrate(0, 20), false);
});

// ── nextRoundPhoto (M68.3): preload target for the next question ──
test('nextRoundPhoto: returns the following round photo', () => {
  const rounds = [{ photo: { id: 'a' } }, { photo: { id: 'b' } }, { photo: { id: 'c' } }];
  assert.equal(nextRoundPhoto(rounds, 0).id, 'b');
  assert.equal(nextRoundPhoto(rounds, 1).id, 'c');
});
test('nextRoundPhoto: null on the last round', () => {
  const rounds = [{ photo: { id: 'a' } }, { photo: { id: 'b' } }];
  assert.equal(nextRoundPhoto(rounds, 1), null);
});
test('nextRoundPhoto: null when rounds missing/out of range', () => {
  assert.equal(nextRoundPhoto(null, 0), null);
  assert.equal(nextRoundPhoto([{ photo: { id: 'a' } }], 5), null);
});

test('scoreCountry: correct → 1', () => { assert.equal(scoreCountry('np', 'np'), 1); });
test('scoreCountry: wrong → 0', () => { assert.equal(scoreCountry('in', 'np'), 0); });
test('scoreAlbum: correct → 1', () => { assert.equal(scoreAlbum(3, 3), 1); });
test('scoreAlbum: wrong → 0', () => { assert.equal(scoreAlbum(3, 7), 0); });
test('scoreAlbum: string vs number → 1', () => { assert.equal(scoreAlbum('3', 3), 1); });

test('TOTAL_ROUNDS is 10', () => { assert.equal(TOTAL_ROUNDS, 10); });
test('MAX_SCORE is 20', () => { assert.equal(MAX_SCORE, 20); });

test('generateRounds returns 10 rounds', () => {
  const rounds = generateRounds(manifest, rng0);
  assert.equal(rounds.length, TOTAL_ROUNDS);
});

test('generateRounds each round has photo and album', () => {
  const rounds = generateRounds(manifest, rng0);
  for (const r of rounds) {
    assert.ok(r !== null && 'photo' in r && 'album' in r);
  }
});
