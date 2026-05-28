import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseHash, createRouter } from './router.js';

test.describe('parseHash', () => {
  const cases = [
    ['', '/'],
    ['#', '/'],
    ['#/', '/'],
    ['#/country/np', '/country/np'],
    ['#/album/5', '/album/5'],
    ['#/album/5/slide/12', '/album/5/slide/12'],
    ['/country/np', '/country/np'], // missing leading # is tolerated
    ['#country/np', '/country/np'], // missing leading / after # is normalized
    ['#/random', '/random'],
  ];
  for (const [input, expected] of cases) {
    test(`"${input}" → "${expected}"`, () => {
      assert.equal(parseHash(input), expected);
    });
  }
});

test.describe('createRouter — static routes', () => {
  const router = createRouter([
    { pattern: '/', name: 'home' },
    { pattern: '/map', name: 'map' },
    { pattern: '/random', name: 'random' },
  ]);

  test('matches home route', () => {
    assert.deepEqual(router.match('/'), { name: 'home', params: {} });
  });

  test('matches map route', () => {
    assert.deepEqual(router.match('/map'), { name: 'map', params: {} });
  });

  test('unknown path returns null', () => {
    assert.equal(router.match('/no-such-route'), null);
  });
});

test.describe('createRouter — param routes', () => {
  const router = createRouter([
    { pattern: '/country/:code', name: 'country' },
    { pattern: '/album/:id', name: 'album' },
    { pattern: '/album/:id/slide/:idx', name: 'slide' },
    { pattern: '/country/:code/random', name: 'country-random' },
  ]);

  test('single param', () => {
    assert.deepEqual(router.match('/country/np'), {
      name: 'country',
      params: { code: 'np' },
    });
  });

  test('two params', () => {
    assert.deepEqual(router.match('/album/5/slide/12'), {
      name: 'slide',
      params: { id: '5', idx: '12' },
    });
  });

  test('static segment after param', () => {
    assert.deepEqual(router.match('/country/np/random'), {
      name: 'country-random',
      params: { code: 'np' },
    });
  });

  test('decodes URI components in params', () => {
    assert.deepEqual(router.match('/country/%D7%A0%D7%A4'), {
      name: 'country',
      params: { code: 'נפ' },
    });
  });

  test('extra segments do not match shorter pattern', () => {
    // /album/5/slide/12 should NOT match /album/:id (different segment count)
    const r = createRouter([{ pattern: '/album/:id', name: 'album' }]);
    assert.equal(r.match('/album/5/slide/12'), null);
  });

  test('first matching route wins', () => {
    const r = createRouter([
      { pattern: '/foo/:a', name: 'first' },
      { pattern: '/foo/:b', name: 'second' },
    ]);
    assert.equal(r.match('/foo/x').name, 'first');
  });
});
