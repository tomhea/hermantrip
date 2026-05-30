import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderMap } from './map.js';

const manifest = {
  countries: [{ code: 'np', he: 'נפאל' }],
  albums: [{ id: 2, name: '02. נגארקוט', title: 'נגארקוט', primary: 'np', countries: ['np'], photos: [] }],
};

test('loading state when manifest null', () => {
  assert.match(renderMap({ manifest: null }), /role="status"/);
});

test('error state', () => {
  assert.match(renderMap({ manifest: null, error: new Error('net error') }), /role="alert"/);
});

test('renders the map container div', () => {
  const html = renderMap({ manifest });
  assert.match(html, /id="map-container"/);
});

test('renders the globe container div', () => {
  const html = renderMap({ manifest });
  assert.match(html, /id="globe-container"/);
});

test('renders back link to home', () => {
  assert.match(renderMap({ manifest }), /href="\/"/);
});

test('renders page title', () => {
  assert.match(renderMap({ manifest }), /מפה/);
});

test('map mode: map-container visible, globe hidden', () => {
  const html = renderMap({ manifest, mode: 'map' });
  // map-container NOT hidden
  assert.doesNotMatch(html, /id="map-container"[^>]*style="display:none"/);
  // globe-container IS hidden
  assert.match(html, /id="globe-container"[^>]*style="display:none"/);
});

test('globe mode: globe-container visible, map hidden', () => {
  const html = renderMap({ manifest, mode: 'globe' });
  assert.match(html, /id="map-container"[^>]*style="display:none"/);
  assert.doesNotMatch(html, /id="globe-container"[^>]*style="display:none"/);
});

test('renders toggle buttons with data-map-mode attributes', () => {
  const html = renderMap({ manifest });
  assert.match(html, /data-map-mode="map"/);
  assert.match(html, /data-map-mode="globe"/);
});
