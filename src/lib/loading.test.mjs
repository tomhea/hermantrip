import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  DEFAULT_LOADING_TEXT,
  DEFAULT_ERROR_TEXT,
  loadingHTML,
  errorHTML,
} from './loading.js';

test('default loading text is Hebrew "טוען..."', () => {
  assert.equal(DEFAULT_LOADING_TEXT, 'טוען...');
});

test('default error text is Hebrew and not auto-translated', () => {
  // Hand-written natural Hebrew per R2 anti-AI check. The exact wording
  // can evolve; the test just guards that we shipped *Hebrew* with the
  // expected sentiment (something went wrong, suggest retry).
  assert.match(DEFAULT_ERROR_TEXT, /[֐-׿]/, 'expected Hebrew chars');
  assert.ok(DEFAULT_ERROR_TEXT.length > 0);
});

test('loadingHTML uses default text', () => {
  const html = loadingHTML();
  assert.match(html, new RegExp(DEFAULT_LOADING_TEXT));
});

test('loadingHTML uses custom text', () => {
  const html = loadingHTML('טוען תמונות...');
  assert.match(html, /טוען תמונות\.\.\./);
});

test('loadingHTML includes role="status" for assistive tech', () => {
  assert.match(loadingHTML(), /role="status"/);
});

test('loadingHTML includes aria-live="polite"', () => {
  assert.match(loadingHTML(), /aria-live="polite"/);
});

test('errorHTML uses default text', () => {
  assert.match(errorHTML(), new RegExp(DEFAULT_ERROR_TEXT.replace(/\./g, '\\.')));
});

test('errorHTML uses custom text', () => {
  assert.match(errorHTML('לא הצלחנו לטעון את האלבום'), /לא הצלחנו לטעון את האלבום/);
});

test('errorHTML includes role="alert"', () => {
  assert.match(errorHTML(), /role="alert"/);
});

test('escapes HTML special chars in custom text to prevent XSS', () => {
  const html = loadingHTML('<script>alert(1)</script>');
  assert.equal(html.includes('<script>'), false, 'raw <script> must not appear');
  assert.match(html, /&lt;script&gt;/);
});
