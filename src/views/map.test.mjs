import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderMap } from './map.js';

const manifest = {
  countries: [{ code: 'np', he: 'נפאל' }],
  albums: [{ id: 2, name: '02. נגארקוט', title: 'נגארקוט', primary: 'np', countries: ['np'], photos: [] }],
};

test('loading state when manifest null', () => {
  const html = renderMap({ manifest: null });
  assert.match(html, /role="status"/);
});

test('error state', () => {
  const html = renderMap({ manifest: null, error: new Error('net error') });
  assert.match(html, /role="alert"/);
});

test('renders the map container div', () => {
  const html = renderMap({ manifest });
  assert.match(html, /id="map-container"/);
  assert.match(html, /class="map-container"/);
});

test('renders back link to home', () => {
  const html = renderMap({ manifest });
  assert.match(html, /href="\/"/);
});

test('renders page title', () => {
  const html = renderMap({ manifest });
  assert.match(html, /מפה/);
});
