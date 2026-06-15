import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { styleUrl, MAP_ATTRIBUTION } from './map-tiles.js';

test('builds the MapTiler vector style-JSON URL for the chosen style + key', () => {
  assert.equal(
    styleUrl({ style: 'STYLE_LIGHT', key: 'K' }),
    'https://api.maptiler.com/maps/STYLE_LIGHT/style.json?key=K',
  );
});

test('attribution credits MapTiler + OpenStreetMap (licence)', () => {
  assert.match(MAP_ATTRIBUTION, /MapTiler/);
  assert.match(MAP_ATTRIBUTION, /OpenStreetMap/);
});
