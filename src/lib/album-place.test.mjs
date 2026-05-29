import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { albumPlace } from './album-place.js';

test('strips "NN. {country} - " prefix, returns the place', () => {
  assert.equal(albumPlace('02. נפאל - נגארקוט ובקטפור'), 'נגארקוט ובקטפור');
  assert.equal(albumPlace('05. נפאל - פוקארה ורפטינג'), 'פוקארה ורפטינג');
});

test('album 1 "ההתחלה - בנגקוק וקטמנדו" → place after the dash', () => {
  assert.equal(albumPlace('01. ההתחלה - בנגקוק וקטמנדו'), 'בנגקוק וקטמנדו');
});

test('no " - " separator → cleaned remainder (number prefix stripped)', () => {
  assert.equal(albumPlace('19. בנגקוק1'), 'בנגקוק1');
  assert.equal(albumPlace("37. קונמינג בנגקוק ופרת'"), "קונמינג בנגקוק ופרת'");
});

test('handles the "NNa." merged-folder prefix', () => {
  assert.equal(albumPlace('14a. הודו - באגסו 2'), 'באגסו 2');
});

test('takes text after the LAST dash when multiple', () => {
  assert.equal(albumPlace('30. סין - צ׳נגדו - מרכז'), 'מרכז');
});

test('trims surrounding whitespace', () => {
  assert.equal(albumPlace('07. נפאל -  בחזרה לקטמנדו '), 'בחזרה לקטמנדו');
});

test('empty / non-string → empty string', () => {
  assert.equal(albumPlace(''), '');
  assert.equal(albumPlace(null), '');
  assert.equal(albumPlace(undefined), '');
});

test('name with only a number → empty', () => {
  assert.equal(albumPlace('42.'), '');
  assert.equal(albumPlace('42'), '');
});
