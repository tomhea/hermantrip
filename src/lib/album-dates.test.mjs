import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumDateRange, albumDateLabel } from './album-dates.js';
import { formatDateRange } from './photo-date.js';

const P = (capturedAt) => ({ id: 'x', capturedAt });

test.describe('albumDateRange', () => {
  test('min/max of captured dates', () => {
    assert.deepEqual(albumDateRange([
      P('2011-07-25T10:00:00'), P('2011-07-23T08:00:00'), P('2011-07-27T20:00:00'),
    ]), { start: '2011-07-23', end: '2011-07-27' });
  });
  test('ignores photos without capturedAt', () => {
    assert.deepEqual(albumDateRange([
      { id: 'a' }, P('2011-07-23T08:00:00'), { id: 'b', capturedAt: null },
    ]), { start: '2011-07-23', end: '2011-07-23' });
  });
  test('single dated photo → start === end', () => {
    assert.deepEqual(albumDateRange([P('2011-08-01T08:00:00')]), { start: '2011-08-01', end: '2011-08-01' });
  });
  test('no dated photos → null', () => {
    assert.equal(albumDateRange([{ id: 'a' }, { id: 'b' }]), null);
    assert.equal(albumDateRange([]), null);
  });
  test('spans months/years', () => {
    assert.deepEqual(albumDateRange([
      P('2011-12-30T10:00:00'), P('2012-01-03T10:00:00'),
    ]), { start: '2011-12-30', end: '2012-01-03' });
  });
});

test.describe('formatDateRange', () => {
  test('same day', () => {
    assert.equal(formatDateRange('2011-07-23', '2011-07-23'), '23 ביולי 2011');
  });
  test('same month → "23–27 ביולי 2011"', () => {
    assert.equal(formatDateRange('2011-07-23', '2011-07-27'), '23–27 ביולי 2011');
  });
  test('same year, different month', () => {
    assert.equal(formatDateRange('2011-07-23', '2011-08-02'), '23 ביולי – 2 באוגוסט 2011');
  });
  test('across years → both full', () => {
    assert.equal(formatDateRange('2011-12-30', '2012-01-03'), '30 בדצמבר 2011 – 3 בינואר 2012');
  });
  test('garbage → empty', () => {
    assert.equal(formatDateRange('nope', '2011-01-01'), '');
  });
});

test.describe('albumDateLabel', () => {
  test('formats the album range', () => {
    assert.equal(albumDateLabel([
      { id: 'a', capturedAt: '2011-07-23T08:00:00' },
      { id: 'b', capturedAt: '2011-07-27T08:00:00' },
    ]), '23–27 ביולי 2011');
  });
  test('no dates → empty string', () => {
    assert.equal(albumDateLabel([{ id: 'a' }]), '');
  });
});
