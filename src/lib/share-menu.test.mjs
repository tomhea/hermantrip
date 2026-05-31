import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { SHARE_ACTIONS, shareMenuHTML } from './share-menu.js';

test('exposes the four share actions', () => {
  assert.deepEqual(SHARE_ACTIONS.map((a) => a.key),
    ['copy-link', 'copy-picture', 'share-link', 'share-picture']);
});

test('each action is tagged copy or share (for feature-gating)', () => {
  assert.deepEqual(SHARE_ACTIONS.map((a) => a.kind), ['copy', 'copy', 'share', 'share']);
});

test('menu renders a button per action with its data-share key + kind', () => {
  const html = shareMenuHTML();
  for (const a of SHARE_ACTIONS) {
    assert.match(html, new RegExp(`data-share="${a.key}"`));
    assert.match(html, new RegExp(a.label));
  }
  assert.match(html, /data-share-kind="copy"/);
  assert.match(html, /data-share-kind="share"/);
});

test('menu uses a <details> so it opens without JS', () => {
  assert.match(shareMenuHTML(), /<details class="slideshow-share"/);
  assert.match(shareMenuHTML(), /<summary[^>]*aria-label="שיתוף"/);
});
