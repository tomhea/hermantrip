import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { globePickerHTML } from './globe-picker.js';

const albums = [
  { id: 19, title: 'בנגקוק1', primary: 'th', slug: 'bangkok' },
  { id: 77, title: 'תאילנד - בנגקוק שוב', primary: 'th', slug: 'bangkok-again' },
  { id: 88, title: 'תאילנד - בנגקוק אחרון', primary: 'th', slug: 'bangkok-last' },
];

test('renders one link per album, each pointing at its album path', () => {
  const html = globePickerHTML(albums);
  const links = html.match(/data-href="[^"]+"/g) || [];
  assert.equal(links.length, 3);
  assert.match(html, /data-href="\/thailand\/bangkok"/);
  assert.match(html, /data-href="\/thailand\/bangkok-again"/);
  assert.match(html, /data-href="\/thailand\/bangkok-last"/);
});

test('shows each album title', () => {
  const html = globePickerHTML(albums);
  assert.match(html, /בנגקוק1/);
  assert.match(html, /בנגקוק שוב/);
  assert.match(html, /בנגקוק אחרון/);
});

test('carries the dialog + close + backdrop hooks main.js wires', () => {
  const html = globePickerHTML(albums);
  assert.match(html, /data-globe-picker-backdrop/);
  assert.match(html, /data-globe-picker-close/);
  assert.match(html, /role="dialog"/);
});

test('falls back to a default Hebrew heading, or uses a given one', () => {
  assert.match(globePickerHTML(albums), /איזה ביקור\?/);
  assert.match(globePickerHTML(albums, 'בנגקוק'), /בנגקוק/);
});

test('escapes album titles (no raw HTML injection)', () => {
  const html = globePickerHTML([{ id: 1, title: '<img src=x>', primary: 'th', slug: 's' }]);
  assert.equal(html.includes('<img src=x>'), false);
  assert.match(html, /&lt;img/);
});

test('empty / missing album list yields an empty list, no crash', () => {
  assert.match(globePickerHTML([]), /globe-picker-list/);
  assert.doesNotThrow(() => globePickerHTML(undefined));
});
