// Guessing-game view (M19).
//
// Pure HTML-string builder. State machine:
//   'country'  — show the photo, pick a country from the 7 flags
//   'album'    — correct country confirmed, now pick the album from 4 choices
//   'result'   — round result with next / finish
//   'done'     — all 10 rounds over, show final score

import { errorHTML, loadingHTML } from '../lib/loading.js';
import { imageUrl } from '../lib/image-url.js';
import { COUNTRIES } from '../lib/countries.js';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Country labels & emoji-free dots for the 7 game countries.
const COUNTRY_LABELS = {
  np: 'נפאל', in: 'הודו', vn: 'ויאטנם', cn: 'סין',
  au: 'אוסטרליה', nz: 'ניו זילנד', th: 'תאילנד',
};

// Render the photo (shared across steps).
function photoHTML(photo, album, dpr, viewport) {
  const src = imageUrl(photo.id, 'slide', { dpr, viewport });
  return `<img class="game-photo" src="${src}" alt="" loading="eager" decoding="async">`;
}

// Country-pick step.
export function renderGameCountry({ round, roundNum, totalRounds, score, dpr, viewport }) {
  const { photo, album } = round;
  return `
    <div class="game-shell" data-game-step="country">
      <div class="game-header">
        <span class="game-round">שאלה ${roundNum} מתוך ${totalRounds}</span>
        <span class="game-score">ניקוד: ${score}</span>
      </div>
      <div class="game-stage">
        ${photoHTML(photo, album, dpr, viewport)}
      </div>
      <div class="game-prompt">באיזו מדינה צולמה התמונה?</div>
      <div class="game-country-grid" role="group" aria-label="בחר מדינה">
        ${Object.entries(COUNTRY_LABELS).map(([code, label]) => `
          <button class="game-country-btn" data-country="${escapeHTML(code)}" aria-label="${escapeHTML(label)}">
            ${escapeHTML(label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// Album-pick step (shown after country guess).
export function renderGameAlbum({ round, roundNum, totalRounds, score, choices, countryCorrect, dpr, viewport }) {
  const { photo, album } = round;
  const feedback = countryCorrect
    ? `<span class="game-correct">✓ ${escapeHTML(COUNTRY_LABELS[album.primary] || album.primary)}</span>`
    : `<span class="game-wrong">✗ תשובה נכונה: ${escapeHTML(COUNTRY_LABELS[album.primary] || album.primary)}</span>`;
  return `
    <div class="game-shell" data-game-step="album">
      <div class="game-header">
        <span class="game-round">שאלה ${roundNum} מתוך ${totalRounds}</span>
        <span class="game-score">ניקוד: ${score}</span>
      </div>
      <div class="game-stage">
        ${photoHTML(photo, album, dpr, viewport)}
      </div>
      <div class="game-prompt">${feedback} — מאיזה אלבום התמונה?</div>
      <div class="game-album-grid" role="group" aria-label="בחר אלבום">
        ${choices.map((c) => `
          <button class="game-album-btn" data-album-id="${c.id}" aria-label="${escapeHTML(c.title)}">
            ${escapeHTML(c.title)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// Round result step.
export function renderGameResult({ round, roundNum, totalRounds, score, countryCorrect, albumCorrect, isLast, dpr, viewport }) {
  const { photo, album } = round;
  const earned = (countryCorrect ? 1 : 0) + (albumCorrect ? 1 : 0);
  return `
    <div class="game-shell" data-game-step="result">
      <div class="game-header">
        <span class="game-round">שאלה ${roundNum} מתוך ${totalRounds}</span>
        <span class="game-score">ניקוד: ${score}</span>
      </div>
      <div class="game-stage">
        ${photoHTML(photo, album, dpr, viewport)}
      </div>
      <div class="game-result-info">
        <p class="game-result-album">
          <strong>${escapeHTML(album.title || album.name)}</strong>
          (${escapeHTML(COUNTRY_LABELS[album.primary] || album.primary)})
        </p>
        <p class="game-result-points">+${earned} נקודות בסיבוב זה</p>
      </div>
      <div class="game-result-actions">
        <button class="game-next-btn" data-game-action="${isLast ? 'finish' : 'next'}">
          ${isLast ? 'סיום' : 'הבא →'}
        </button>
      </div>
    </div>
  `;
}

// Final score screen.
export function renderGameDone({ score, maxScore, onReplay }) {
  const pct = Math.round((score / maxScore) * 100);
  const msg = pct >= 90 ? 'מעולה!' : pct >= 60 ? 'כל הכבוד!' : 'נסו שוב!';
  return `
    <div class="game-shell" data-game-step="done">
      <div class="game-done-content">
        <h2 class="game-done-title">${msg}</h2>
        <p class="game-done-score">${score} / ${maxScore}</p>
        <p class="game-done-pct">${pct}%</p>
        <div class="game-done-actions">
          <button class="game-replay-btn" data-game-action="replay">שחק שוב</button>
          <a class="game-home-btn" href="/">דף הבית</a>
        </div>
      </div>
    </div>
  `;
}

// Loading / error shells (R3).
export function renderGame({ manifest, error }) {
  if (error) return errorHTML('לא הצלחנו לטעון את האלבום. נסו לרענן.');
  if (!manifest) return loadingHTML();
  // Game is JS-driven; main.js renders the specific step views above.
  // This shell is used only on initial render (immediately replaced by a step).
  return `<div class="game-shell" data-game-step="loading">${loadingHTML()}</div>`;
}
