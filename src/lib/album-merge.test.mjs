import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mergeFolders } from './album-merge.js';

test('empty input returns empty array', () => {
  assert.deepEqual(mergeFolders([]), []);
});

test('no collisions: one entry per folder, folderIds wraps the source', () => {
  const input = [
    { id: 5, name: 'a', folderId: 'fA', photos: [{ name: 'p1' }] },
    { id: 9, name: 'b', folderId: 'fB', photos: [{ name: 'p2' }] },
  ];
  const out = mergeFolders(input);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 5);
  assert.equal(out[0].name, 'a');
  assert.deepEqual(out[0].folderIds, ['fA']);
  assert.deepEqual(out[0].photos, [{ name: 'p1' }]);
  assert.equal(out[1].id, 9);
  assert.deepEqual(out[1].folderIds, ['fB']);
});

test('same id: photos concatenated, both folderIds tracked', () => {
  const input = [
    { id: 14, name: 'Bhagsu 1', folderId: 'fX', photos: [{ name: 'a' }, { name: 'b' }] },
    { id: 14, name: 'Bhagsu 2', folderId: 'fY', photos: [{ name: 'c' }] },
  ];
  const out = mergeFolders(input);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 14);
  assert.deepEqual(out[0].folderIds, ['fX', 'fY']);
  assert.equal(out[0].photos.length, 3);
});

test('same id: first folder name wins (lex order preserves "Bhagsu 1")', () => {
  // mergeFolders sees folders in insertion order — caller should pass them
  // sorted so the "1" variant lands first.
  const input = [
    { id: 14, name: 'Bhagsu 1', folderId: 'fX', photos: [] },
    { id: 14, name: 'Bhagsu 2', folderId: 'fY', photos: [] },
  ];
  const out = mergeFolders(input);
  assert.equal(out[0].name, 'Bhagsu 1');
});

test('mixed: some collide, some do not', () => {
  const input = [
    { id: 1, name: 'one', folderId: 'f1', photos: [{ name: 'a' }] },
    { id: 14, name: 'fourteen', folderId: 'f14', photos: [{ name: 'b' }] },
    { id: 14, name: 'fourteen-a', folderId: 'f14a', photos: [{ name: 'c' }] },
    { id: 2, name: 'two', folderId: 'f2', photos: [{ name: 'd' }] },
  ];
  const out = mergeFolders(input);
  assert.equal(out.length, 3);
  const ids = out.map((a) => a.id).sort((x, y) => x - y);
  assert.deepEqual(ids, [1, 2, 14]);
  const fourteen = out.find((a) => a.id === 14);
  assert.equal(fourteen.photos.length, 2);
  assert.deepEqual(fourteen.folderIds, ['f14', 'f14a']);
});

test('does not mutate input photos arrays', () => {
  const photos1 = [{ name: 'a' }];
  const photos2 = [{ name: 'b' }];
  const input = [
    { id: 14, name: 'x', folderId: 'fX', photos: photos1 },
    { id: 14, name: 'y', folderId: 'fY', photos: photos2 },
  ];
  mergeFolders(input);
  assert.deepEqual(photos1, [{ name: 'a' }]);
  assert.deepEqual(photos2, [{ name: 'b' }]);
});
