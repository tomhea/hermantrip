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
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, dpr: 1, viewport: 'phone' });
  assert.match(html, /שאלה 1 מתוך 10/);
});

test('renderGameCountry: renders 7 country buttons', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, dpr: 1, viewport: 'phone' });
  const matches = html.match(/data-country=/g) || [];
  assert.equal(matches.length, 7);
});

test('renderGameCountry: renders photo img', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, dpr: 1, viewport: 'phone' });
  assert.match(html, /class="game-photo"/);
  assert.match(html, /src="\/img\/p1\//);
});

test('renderGameCountry: data-game-step="country"', () => {
  const html = renderGameCountry({ round, roundNum: 1, totalRounds: 10, score: 0, dpr: 1, viewport: 'phone' });
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

test('renderGameDone: high score gives מעולה', () => {
  const html = renderGameDone({ score: 20, maxScore: 20 });
  assert.match(html, /מעולה/);
});

test('renderGameDone: low score gives נסו שוב', () => {
  const html = renderGameDone({ score: 5, maxScore: 20 });
  assert.match(html, /נסו שוב/);
});
