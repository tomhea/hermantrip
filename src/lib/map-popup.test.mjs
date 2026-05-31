import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { stopPopupHTML } from './map-popup.js';

// A Bangkok-like pin: 5 album stops (all city-labelled "בנגקוק") + 1 linkless
// closing trail marker. (slugs are real canonical slugs so albumPath resolves.)
const bangkok = [
  { albumId: 1, albumTitle: '01. ההתחלה', label: 'בנגקוק', primary: 'np', slug: 'bangkok-kathmandu' },
  { albumId: 37, albumTitle: '37. קונמינג', label: 'בנגקוק', primary: 'cn', slug: 'kunming-bangkok-perth' },
  { albumId: 19, albumTitle: '19. בנגקוק1', label: 'בנגקוק', primary: 'th', slug: 'bangkok' },
  { albumId: 77, albumTitle: '77. בנגקוק שוב', label: 'בנגקוק', primary: 'th', slug: 'bangkok-2' },
  { albumId: 88, albumTitle: '88. בנגקוק אחרון', label: 'בנגקוק', primary: 'th', slug: 'bangkok-3' },
  { albumId: null, label: 'בנגקוק', primary: null, slug: null }, // closing trail marker
];

test('#9: shows the five albums by NAME, not the city label "בנגקוק"', () => {
  const html = stopPopupHTML(bangkok);
  const links = html.match(/class="map-popup-link"/g) || [];
  assert.equal(links.length, 5);
  assert.match(html, /01\. ההתחלה/);
  assert.match(html, /88\. בנגקוק אחרון/);
});

test('#9: the linkless closing "בנגקוק" marker is dropped (pin has album links)', () => {
  const html = stopPopupHTML(bangkok);
  assert.equal(/class="map-popup-label"/.test(html), false);
});

test('#9: a label-only pin (גבעת שמואל) still shows its label once', () => {
  const html = stopPopupHTML([
    { albumId: null, label: 'גבעת שמואל', primary: null, slug: null }, // opening
    { albumId: null, label: 'גבעת שמואל', primary: null, slug: null }, // closing
  ]);
  const labels = html.match(/class="map-popup-label"/g) || [];
  assert.equal(labels.length, 1);
  assert.match(html, /גבעת שמואל/);
  assert.equal(/map-popup-link/.test(html), false);
});

test('de-dupes repeated album hrefs', () => {
  const html = stopPopupHTML([
    { albumId: 2, albumTitle: 'A', label: 'x', primary: 'np', slug: 'nagarkot-bhaktapur' },
    { albumId: 2, albumTitle: 'A', label: 'y', primary: 'np', slug: 'nagarkot-bhaktapur' },
  ]);
  assert.equal((html.match(/map-popup-link/g) || []).length, 1);
});

test('escapes album titles', () => {
  const html = stopPopupHTML([{ albumId: 1, albumTitle: '<b>x</b>', label: 'l', primary: 'np', slug: 's' }]);
  assert.equal(html.includes('<b>x</b>'), false);
});
