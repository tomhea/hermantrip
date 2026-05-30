import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { globeModuleUrl, GLOBE_VERSION } from './globe-loader.js';

test('globeModuleUrl is an absolute https URL', () => {
  assert.match(globeModuleUrl(), /^https:\/\//);
});

test('globeModuleUrl uses esm.sh (resolves bare deps), pinned to the version', () => {
  assert.equal(globeModuleUrl(), `https://esm.sh/globe.gl@${GLOBE_VERSION}`);
});

test('globeModuleUrl is NOT the bare-specifier unpkg .module.js build', () => {
  // The unpkg dist/globe.gl.module.js build keeps `import "three"` etc. and
  // fails with no import-map — guard against regressing to it.
  const url = globeModuleUrl();
  assert.doesNotMatch(url, /unpkg\.com/);
  assert.doesNotMatch(url, /\.module\.js$/);
});

test('GLOBE_VERSION is a pinned semver (no floating range)', () => {
  assert.match(GLOBE_VERSION, /^\d+\.\d+\.\d+$/);
});
