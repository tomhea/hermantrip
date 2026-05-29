import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { correctPhotoDate } from './date-fixes.js';

test('sets capturedAt for the album-6 PNGs by id', () => {
  const p = correctPhotoDate({ id: '1shHURQWbUdWA6TJUpFRcoGTgSzMvhyEx', name: 'x.png', capturedAt: null }, 6);
  assert.equal(p.capturedAt, '2011-03-29T21:11:37');
  const q = correctPhotoDate({ id: '17jxRQM7P2S_3Uj-f1USxJfcTEp3M0R8r', name: 'y.png', capturedAt: null }, 6);
  assert.equal(q.capturedAt, '2011-03-29T21:13:18');
});

test('shifts Chiang Mai (album 78) 2011-01-25 → 2012-01-25, keeping the time', () => {
  const p = correctPhotoDate({ id: 'z', name: 'a.jpg', capturedAt: '2011-01-25T14:30:09' }, 78);
  assert.equal(p.capturedAt, '2012-01-25T14:30:09');
});

test('does NOT shift other dates in album 78', () => {
  const p = correctPhotoDate({ id: 'z', name: 'a.jpg', capturedAt: '2012-01-26T10:00:00' }, 78);
  assert.equal(p.capturedAt, '2012-01-26T10:00:00');
});

test('does NOT shift 2011-01-25 in OTHER albums (scoped to 78)', () => {
  const p = correctPhotoDate({ id: 'z', name: 'a.jpg', capturedAt: '2011-01-25T09:00:00' }, 1);
  assert.equal(p.capturedAt, '2011-01-25T09:00:00');
});

test('returns the same object unchanged when nothing matches', () => {
  const input = { id: 'untouched', name: 'a.jpg', capturedAt: '2011-07-23T10:00:00' };
  const out = correctPhotoDate(input, 5);
  assert.equal(out, input); // same reference, no needless clone
});

test('non-matching id + no capturedAt is left as-is', () => {
  const input = { id: 'plain', name: 'a.jpg' };
  assert.equal(correctPhotoDate(input, 9), input);
});
