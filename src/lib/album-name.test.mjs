import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractAlbumNumber } from './album-name.js';

test.describe('extractAlbumNumber — common patterns', () => {
  const cases = [
    ['01', 1],
    ['1', 1],
    ['01 קטמנדו', 1],
    ['1 - דהלי', 1],
    ['1. דהלי', 1],
    ['1-עלייה לאוורסט', 1],
    ['37 - יאנגשואו', 37],
    ['037 - sometext', 37],
    ['88 פוקט', 88],
    ['88', 88],
    // Letter suffix on album number: parser strips it and returns the
    // leading integer. The build script merges same-ID folders into one
    // album (handled by src/lib/album-merge.js).
    ['14a', 14],
    ['14a. הודו - באגסו 2', 14],
  ];
  for (const [input, expected] of cases) {
    test(`"${input}" → ${expected}`, () => {
      assert.equal(extractAlbumNumber(input), expected);
    });
  }
});

test.describe('extractAlbumNumber — ignored folders return null', () => {
  const ignored = [
    '.temp',
    '.temp_1',
    '.temp_2',
    '.temp_3',
    '.hidden',
    'export',
    'Export',
    'EXPORT',
    'exports',  // any export-prefixed folder
  ];
  for (const input of ignored) {
    test(`"${input}" → null`, () => {
      assert.equal(extractAlbumNumber(input), null);
    });
  }
});

test.describe('extractAlbumNumber — names without leading digits return null', () => {
  const noDigit = [
    'תיאור בלי מספר',
    'random folder',
    'a01',
    '_01',
    '',
  ];
  for (const input of noDigit) {
    test(`"${input}" → null`, () => {
      assert.equal(extractAlbumNumber(input), null);
    });
  }
});

test('extractAlbumNumber strips leading zeros', () => {
  assert.equal(extractAlbumNumber('001'), 1);
  assert.equal(extractAlbumNumber('008 - some text'), 8);
});
