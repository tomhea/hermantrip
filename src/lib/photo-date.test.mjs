import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatHebrewDate, hebrewWeekday, formatClock } from './photo-date.js';

test('formatHebrewDate: "23 ביולי 2011" (ב-prefixed month)', () => {
  assert.equal(formatHebrewDate('2011-07-23T14:32:05'), '23 ביולי 2011');
});

test('formatHebrewDate: handles each month prefix', () => {
  assert.equal(formatHebrewDate('2012-01-03T00:00:00'), '3 בינואר 2012');
  assert.equal(formatHebrewDate('2011-03-29T10:00:00'), '29 במרץ 2011');
  assert.equal(formatHebrewDate('2011-05-01T10:00:00'), '1 במאי 2011');
  assert.equal(formatHebrewDate('2011-12-08T10:00:00'), '8 בדצמבר 2011');
});

test('formatHebrewDate: no leading zero on day', () => {
  assert.equal(formatHebrewDate('2011-08-07T10:00:00'), '7 באוגוסט 2011');
});

test('formatHebrewDate: null/garbage → empty string', () => {
  assert.equal(formatHebrewDate(null), '');
  assert.equal(formatHebrewDate('not-a-date'), '');
  assert.equal(formatHebrewDate(undefined), '');
});

test('hebrewWeekday: known dates', () => {
  // 2011-07-23 was a Saturday; 2012-01-01 a Sunday.
  assert.equal(hebrewWeekday('2011-07-23T00:00:00'), 'יום שבת');
  assert.equal(hebrewWeekday('2012-01-01T00:00:00'), 'יום ראשון');
});

test('hebrewWeekday: midweek', () => {
  // 2011-07-25 Monday, 2011-07-27 Wednesday
  assert.equal(hebrewWeekday('2011-07-25T00:00:00'), 'יום שני');
  assert.equal(hebrewWeekday('2011-07-27T00:00:00'), 'יום רביעי');
});

test('hebrewWeekday: null → empty', () => {
  assert.equal(hebrewWeekday(null), '');
  assert.equal(hebrewWeekday('xyz'), '');
});

test('formatClock: "14:32"', () => {
  assert.equal(formatClock('2011-07-23T14:32:05'), '14:32');
});

test('formatClock: pads single-digit hour/minute', () => {
  assert.equal(formatClock('2011-07-23T04:05:00'), '04:05');
});

test('formatClock: null → empty', () => {
  assert.equal(formatClock(null), '');
});
