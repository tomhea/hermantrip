import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { groupPhotosByDay } from './photo-group.js';

test('empty → empty', () => {
  assert.deepEqual(groupPhotosByDay([]), []);
});

test('groups consecutive photos sharing a day', () => {
  const groups = groupPhotosByDay([
    { id: '1', capturedAt: '2011-07-23T08:00:00' },
    { id: '2', capturedAt: '2011-07-23T19:00:00' },
    { id: '3', capturedAt: '2011-07-24T09:00:00' },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].date, '2011-07-23');
  assert.deepEqual(groups[0].photos.map((p) => p.id), ['1', '2']);
  assert.equal(groups[1].date, '2011-07-24');
  assert.deepEqual(groups[1].photos.map((p) => p.id), ['3']);
});

test('preserves input order within and across groups', () => {
  const groups = groupPhotosByDay([
    { id: 'a', capturedAt: '2011-07-23T08:00:00' },
    { id: 'b', capturedAt: '2011-07-24T08:00:00' },
    { id: 'c', capturedAt: '2011-07-25T08:00:00' },
  ]);
  assert.deepEqual(groups.map((g) => g.date), ['2011-07-23', '2011-07-24', '2011-07-25']);
});

test('undated photos form a date:null group', () => {
  const groups = groupPhotosByDay([
    { id: 'd', capturedAt: '2011-07-23T08:00:00' },
    { id: 'u1' },
    { id: 'u2', capturedAt: null },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[1].date, null);
  assert.deepEqual(groups[1].photos.map((p) => p.id), ['u1', 'u2']);
});

test('a day that recurs non-contiguously starts a new group (input should be pre-sorted)', () => {
  // documents the contiguous-run contract
  const groups = groupPhotosByDay([
    { id: '1', capturedAt: '2011-07-23T08:00:00' },
    { id: '2', capturedAt: '2011-07-24T08:00:00' },
    { id: '3', capturedAt: '2011-07-23T20:00:00' },
  ]);
  assert.equal(groups.length, 3); // 23, 24, 23 again
});

test('total photos preserved across groups', () => {
  const photos = Array.from({ length: 10 }, (_, i) => ({
    id: String(i), capturedAt: `2011-07-${String(20 + (i % 3)).padStart(2, '0')}T08:00:00`,
  }));
  // not pre-sorted here, but count must be conserved regardless
  const total = groupPhotosByDay(photos).reduce((s, g) => s + g.photos.length, 0);
  assert.equal(total, 10);
});
