import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { landscapeFullscreenAction, LANDSCAPE_PHONE_MEDIA } from './fullscreen-policy.js';

test('enter: phone in landscape, not yet fullscreen', () => {
  assert.equal(landscapeFullscreenAction({ landscapePhone: true, isFullscreen: false, ownedByLandscape: false }), 'enter');
});

test('no action: phone in landscape but already fullscreen', () => {
  assert.equal(landscapeFullscreenAction({ landscapePhone: true, isFullscreen: true, ownedByLandscape: true }), null);
});

test('exit: rotated to portrait while in OUR landscape fullscreen', () => {
  assert.equal(landscapeFullscreenAction({ landscapePhone: false, isFullscreen: true, ownedByLandscape: true }), 'exit');
});

test('no action: fullscreen we did NOT own (e.g. slideshow) is left alone on portrait', () => {
  assert.equal(landscapeFullscreenAction({ landscapePhone: false, isFullscreen: true, ownedByLandscape: false }), null);
});

test('no action: portrait, not fullscreen', () => {
  assert.equal(landscapeFullscreenAction({ landscapePhone: false, isFullscreen: false, ownedByLandscape: false }), null);
});

test('media query targets short landscape viewports (phones)', () => {
  assert.match(LANDSCAPE_PHONE_MEDIA, /orientation: landscape/);
  assert.match(LANDSCAPE_PHONE_MEDIA, /max-height: 500px/);
});
