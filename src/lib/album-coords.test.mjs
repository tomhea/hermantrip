import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { coordsForAlbum, allMapMarkers, ALBUM_COORDS, groupAlbumsByLocation } from './album-coords.js';

test('coordsForAlbum returns [lat, lng, label] for a known album', () => {
  const r = coordsForAlbum(48);
  assert.ok(Array.isArray(r));
  assert.equal(r.length, 3);
  assert.ok(typeof r[0] === 'number'); // lat
  assert.ok(typeof r[1] === 'number'); // lng
  assert.ok(typeof r[2] === 'string'); // label
});

test('coordsForAlbum returns null for unknown album', () => {
  assert.equal(coordsForAlbum(999), null);
});

test('album 4 is absent (absorbed into merged album 3)', () => {
  // Album 4 was merged into album 3 by album-transform.js → no separate pin needed.
  assert.equal(coordsForAlbum(4), null);
});

test('allMapMarkers returns an array with at least 80 entries', () => {
  const markers = allMapMarkers();
  assert.ok(markers.length >= 80);
});

test('allMapMarkers entries have required shape', () => {
  const [m] = allMapMarkers();
  assert.ok('albumId' in m);
  assert.ok('lat' in m);
  assert.ok('lng' in m);
  assert.ok('label' in m);
  assert.ok(typeof m.albumId === 'number');
  assert.ok(typeof m.lat === 'number');
  assert.ok(typeof m.lng === 'number');
});

test('lat/lng are in plausible geographic ranges', () => {
  for (const [, [lat, lng]] of Object.entries(ALBUM_COORDS)) {
    assert.ok(lat >= -90 && lat <= 90,  `lat ${lat} out of range`);
    assert.ok(lng >= -180 && lng <= 180, `lng ${lng} out of range`);
  }
});

test('cross-country album 1 is pinned in Nepal (lat > 20)', () => {
  const r = coordsForAlbum(1);
  assert.ok(r[0] > 20); // Nepal latitude
});

test('cross-country album 37 is pinned in China (lat > 20)', () => {
  const r = coordsForAlbum(37);
  assert.ok(r[0] > 20); // China latitude
});

// ── groupAlbumsByLocation ────────────────────────────────────────
const bangkokAlbums = [
  { id: 19, primary: 'th', name: 'בנגקוק', title: 'בנגקוק' },
  { id: 77, primary: 'th', name: 'בנגקוק שוב', title: 'בנגקוק שוב' },
  { id: 88, primary: 'th', name: 'בנגקוק אחרון', title: 'בנגקוק אחרון' },
  { id: 2,  primary: 'np', name: 'נגארקוט', title: 'נגארקוט' }, // different location
];
const fakeManifest = { albums: bangkokAlbums };

test('groupAlbumsByLocation returns null for null manifest', () => {
  assert.deepEqual(groupAlbumsByLocation(null), []);
});

test('groupAlbumsByLocation groups Bangkok albums (same lat/lng) together', () => {
  const groups = groupAlbumsByLocation(fakeManifest);
  const bkk = groups.find(g => g.albums.some(a => a.id === 19));
  assert.ok(bkk, 'Bangkok group not found');
  assert.equal(bkk.albums.length, 3, 'Expected 3 Bangkok albums');
});

test('groupAlbumsByLocation keeps separate-location albums apart', () => {
  const groups = groupAlbumsByLocation(fakeManifest);
  // Nagarkot (album 2) should be in its own group
  const nagarkot = groups.find(g => g.albums.some(a => a.id === 2));
  assert.equal(nagarkot?.albums.length, 1);
});

test('groupAlbumsByLocation group entries have lat, lng, albums array', () => {
  const groups = groupAlbumsByLocation(fakeManifest);
  for (const g of groups) {
    assert.ok(typeof g.lat === 'number');
    assert.ok(typeof g.lng === 'number');
    assert.ok(Array.isArray(g.albums));
  }
});
