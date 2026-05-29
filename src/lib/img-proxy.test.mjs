import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseImgPath, lh3UrlFor } from './img-proxy.js';
import { imageUrl } from './image-url.js';

test.describe('parseImgPath', () => {
  test('width path → { id, size }', () => {
    assert.deepEqual(parseImgPath('/img/ABC123/280'), { id: 'ABC123', size: '280' });
  });
  test('orig path → { id, size: "orig" }', () => {
    assert.deepEqual(parseImgPath('/img/ABC123/orig'), { id: 'ABC123', size: 'orig' });
  });
  test('id with - and _ accepted', () => {
    assert.deepEqual(parseImgPath('/img/a-b_C9/720'), { id: 'a-b_C9', size: '720' });
  });
  test('non-/img path → null', () => {
    assert.equal(parseImgPath('/index.html'), null);
    assert.equal(parseImgPath('/data/manifest.json'), null);
  });
  test('bad size (not digits/orig) → null', () => {
    assert.equal(parseImgPath('/img/ABC/huge'), null);
  });
  test('path traversal / extra segments → null', () => {
    assert.equal(parseImgPath('/img/ABC/280/../x'), null);
    assert.equal(parseImgPath('/img/ABC'), null);
  });
  test('id with illegal chars → null (no upstream injection)', () => {
    assert.equal(parseImgPath('/img/a.b/280'), null);
    assert.equal(parseImgPath('/img/a%2Fb/280'), null);
  });
});

test.describe('lh3UrlFor', () => {
  test('numeric size → =w{size}', () => {
    assert.equal(lh3UrlFor('ABC', '280'), 'https://lh3.googleusercontent.com/d/ABC=w280');
  });
  test('orig → =s0 (full original)', () => {
    assert.equal(lh3UrlFor('ABC', 'orig'), 'https://lh3.googleusercontent.com/d/ABC=s0');
  });
});

// The loop that broke in M8: the CLIENT emits /img/ URLs and the SERVER must
// be able to parse every shape the client emits. This ties the two sides
// together so a future change to one without the other fails a test.
test.describe('client URLs round-trip through the server parser', () => {
  const cases = [
    imageUrl('FILE1', 'thumb', { dpr: 2 }),       // /img/FILE1/280
    imageUrl('FILE2', 'card', { dpr: 2 }),         // /img/FILE2/720
    imageUrl('FILE3', 'slide', { viewport: 'phone', dpr: 2 }), // /img/FILE3/1040
    imageUrl('FILE4', 'download'),                 // /img/FILE4/orig
  ];
  for (const url of cases) {
    test(`server parses client URL ${url}`, () => {
      const parsed = parseImgPath(url);
      assert.notEqual(parsed, null, `server failed to parse client-emitted ${url}`);
      // and the parsed parts map to a valid upstream URL
      const upstream = lh3UrlFor(parsed.id, parsed.size);
      assert.match(upstream, /^https:\/\/lh3\.googleusercontent\.com\/d\/FILE\d=(w\d+|s0)$/);
    });
  }
});
