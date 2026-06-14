// src/lib/view-header.test.mjs
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { viewHeader } from './view-header.js';

test('renders title + inline subtitle on the right', () => {
  const html = viewHeader({ title: 'נפאל', subtitle: '6 אלבומים · 849' });
  assert.match(html, /class="slim-header"/);
  assert.match(html, /נפאל/);
  assert.match(html, /6 אלבומים · 849/);
});

test('subtitleHTML is inserted raw inside .slim-sub (caller-trusted, for structured subtitles)', () => {
  const html = viewHeader({ title: 'x', subtitleHTML: '<span class="sub-count">5 · </span><span class="sub-dates">May</span>' });
  assert.match(html, /<span class="slim-sub"><span class="sub-count">5 · <\/span><span class="sub-dates">May<\/span><\/span>/);
});

test('renders a back link top-right when back is given', () => {
  const html = viewHeader({ title: 'נפאל', back: { href: '/', label: 'דף הבית' } });
  assert.match(html, /class="slim-back"[^>]*href="\/"/);
  assert.match(html, /→ דף הבית/);
});

test('no back link on the root (back omitted)', () => {
  const html = viewHeader({ title: 'הרמן בדרכים' });
  assert.equal(/slim-back/.test(html), false);
});

test('actions HTML is placed in the left action group', () => {
  const html = viewHeader({ title: 'x', actions: '<a class="z">y</a>' });
  assert.match(html, /class="slim-actions"[^>]*>\s*<a class="z">y<\/a>/);
});

test('escapes title/subtitle', () => {
  const html = viewHeader({ title: '<b>', subtitle: '"&"' });
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /&quot;&amp;&quot;/);
});
