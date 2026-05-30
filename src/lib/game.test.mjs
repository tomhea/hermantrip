import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  eligibleAlbums, pickRoundPhoto, albumChoices,
  scoreCountry, scoreAlbum, generateRounds, TOTAL_ROUNDS, MAX_SCORE,
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
