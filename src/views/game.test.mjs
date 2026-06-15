import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  renderGame, renderGameCountry, renderGameAlbum, renderGameResult, renderGameDone,
} from './game.js';

const manifest = { countries: [], albums: [] };
const album = { id: 3, name: '03. טרק', title: 'טרק פון היל', primary: 'np', countries: ['np'], photos: [] };
const photo = { id: 'p1', capturedAt: '2011-03-15T10:00:00' };
const round = { photo, album };
const choices = [
  { id: 3, title: 'טרק פון היל' },
  { id: 5, title: 'פוקארה' },
  { id: 2, title: 'נגארקוט' },
  { id: 7, title: 'צ\'יטואן' },
];
// 4 country options (incl. the correct 'np') — M68.1.
const cChoices = ['np', 'in', 'au', 'th'];

// Loading / error states (R3)
test('renderGame: loading state when manifest null', () => {
  assert.match(renderGame({ manifest: null }), /role="status"/);
});

test('renderGame: error state', () => {
  assert.match(renderGame({ manifest: null, error: new Error('net') }), /role="alert"/);
});

test('renderGame: with manifest shows game shell', () => {
  const html = renderGame({ manifest });
  assert.match(html, /data-game-step/);
});

// Country step
test('renderGameCountry: shows round number', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  assert.match(html, /שאלה 1 מתוך 10/);
});

test('renderGameCountry: renders 4 country buttons (4 of 7, incl. the correct one)', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  const matches = html.match(/data-country=/g) || [];
  assert.equal(matches.length, 4);
});

test('renderGameCountry: renders exactly the country codes it was given', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  for (const code of cChoices) assert.match(html, new RegExp(`data-country="${code}"`));
  assert.equal(/data-country="vn"/.test(html), false, 'a country not in choices must not render');
});

test('renderGameCountry: renders photo img', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-photo"/);
  assert.match(html, /src="\/img\/p1\//);
});

test('renderGameCountry: data-game-step="country"', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  assert.match(html, /data-game-step="country"/);
});

// Album step
test('renderGameAlbum: shows 4 album choices', () => {
  const html = renderGameAlbum({ round, roundNum: 1, totalRounds: 10, score: 1, choices, countryCorrect: true, dpr: 1, viewport: 'phone' });
  const matches = html.match(/data-album-id=/g) || [];
  assert.equal(matches.length, 4);
});

test('renderGameAlbum: correct country shows ✓ feedback', () => {
  const html = renderGameAlbum({ round, roundNum: 1, totalRounds: 10, score: 1, choices, countryCorrect: true, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-correct"/);
});

test('renderGameAlbum: wrong country shows ✗ feedback', () => {
  const html = renderGameAlbum({ round, roundNum: 1, totalRounds: 10, score: 0, choices, countryCorrect: false, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-wrong"/);
});

// Result step
test('renderGameResult: shows album title', () => {
  const html = renderGameResult({ round, roundNum: 1, totalRounds: 10, score: 2, countryCorrect: true, albumCorrect: true, isLast: false, dpr: 1, viewport: 'phone' });
  assert.match(html, /טרק פון היל/);
});

test('renderGameResult: not-last round shows next button', () => {
  const html = renderGameResult({ round, roundNum: 1, totalRounds: 10, score: 2, countryCorrect: true, albumCorrect: true, isLast: false, dpr: 1, viewport: 'phone' });
  assert.match(html, /data-game-action="next"/);
});

test('renderGameResult: last round shows finish button', () => {
  const html = renderGameResult({ round, roundNum: 10, totalRounds: 10, score: 2, countryCorrect: true, albumCorrect: true, isLast: true, dpr: 1, viewport: 'phone' });
  assert.match(html, /data-game-action="finish"/);
});

// Done screen
test('renderGameDone: shows score', () => {
  const html = renderGameDone({ score: 15, maxScore: 20 });
  assert.match(html, /15 \/ 20/);
});

test('renderGameDone: replay button', () => {
  const html = renderGameDone({ score: 15, maxScore: 20 });
  assert.match(html, /data-game-action="replay"/);
});

test('renderGameDone: home link', () => {
  const html = renderGameDone({ score: 15, maxScore: 20 });
  assert.match(html, /href="\/"/);
});

test('renderGameDone: perfect score gives מושלם (M68.2)', () => {
  const html = renderGameDone({ score: 20, maxScore: 20 });
  assert.match(html, /מושלם/);
});

test('renderGameDone: a strong-but-imperfect score gives מעולה (M68.2)', () => {
  const html = renderGameDone({ score: 18, maxScore: 20 });
  assert.match(html, /מעולה/);
});

test('renderGameDone: low score gives נסו שוב', () => {
  const html = renderGameDone({ score: 5, maxScore: 20 });
  assert.match(html, /נסו שוב/);
});

test('M68.2: renderGameDone renders confetti when celebrate is set', () => {
  const html = renderGameDone({ score: 20, maxScore: 20, celebrate: true });
  assert.match(html, /class="game-confetti"/);
});

test('M68.2: renderGameDone has NO confetti when celebrate is falsy', () => {
  const html = renderGameDone({ score: 5, maxScore: 20, celebrate: false });
  assert.equal(/game-confetti/.test(html), false);
});

// M7: progress strip + bar (Task 7.1)
test('M7: country step renders a progress strip + bar', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-progress"/);
  assert.match(html, /class="game-progress-bar"/);
});

test('M7: progress bar width is proportional to roundNum/totalRounds', () => {
  const html = renderGameCountry({ round, roundNum: 5, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-progress-bar"[^>]*width:\s*50%/);
});

test('M7: album step renders a progress strip + bar (30% at round 3)', () => {
  const html = renderGameAlbum({ round, roundNum: 3, totalRounds: 10, score: 1, choices, countryCorrect: true, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-progress"/);
  assert.match(html, /class="game-progress-bar"[^>]*width:\s*30%/);
});

test('M7: result step renders a progress strip + bar (100% at last round)', () => {
  const html = renderGameResult({ round, roundNum: 10, totalRounds: 10, score: 2, countryCorrect: true, albumCorrect: true, isLast: true, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-progress"/);
  assert.match(html, /class="game-progress-bar"[^>]*width:\s*100%/);
});

test('M7: steps group the photo + options in a .game-body > .game-answers (landscape side-by-side)', () => {
  const c = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  const a = renderGameAlbum({ round, roundNum: 1, totalRounds: 10, score: 1, choices, countryCorrect: true, dpr: 1, viewport: 'phone' });
  const r = renderGameResult({ round, roundNum: 1, totalRounds: 10, score: 2, countryCorrect: true, albumCorrect: true, isLast: false, dpr: 1, viewport: 'phone' });
  for (const html of [c, a, r]) {
    assert.match(html, /class="game-body"/);
    assert.match(html, /class="game-answers"/);
  }
});

test('M7: progress strip carries an accessible round/score label', () => {
  const html = renderGameCountry({ round, roundNum: 4, totalRounds: 10, score: 6, choices: cChoices, dpr: 1, viewport: 'phone' });
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="4"/);
  assert.match(html, /aria-valuemax="10"/);
});

test('M45: every play step has a "חזרה" back link to home (#8)', () => {
  const c = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, choices: cChoices, dpr: 1, viewport: 'phone' });
  const a = renderGameAlbum({ round, roundNum: 1, totalRounds: 10, score: 1, choices, countryCorrect: true, dpr: 1, viewport: 'phone' });
  const r = renderGameResult({ round, roundNum: 1, totalRounds: 10, score: 2, countryCorrect: true, albumCorrect: true, isLast: false, dpr: 1, viewport: 'phone' });
  for (const html of [c, a, r]) {
    assert.match(html, /class="game-back"[^>]*href="\/"/);
    assert.match(html, /חזרה/);
  }
});
