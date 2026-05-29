import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  COUNTRIES,
  COUNTRY_ORDER,
  assignAlbumToCountries,
  slugFromCode,
  codeFromSlug,
} from './countries.js';

test.describe('slug ↔ code (M12)', () => {
  test('every country has a unique non-empty slug', () => {
    const slugs = COUNTRIES.map((c) => c.slug);
    assert.ok(slugs.every((s) => typeof s === 'string' && s.length > 0));
    assert.equal(new Set(slugs).size, slugs.length);
  });
  test('slugFromCode', () => {
    assert.equal(slugFromCode('np'), 'nepal');
    assert.equal(slugFromCode('nz'), 'new-zealand');
    assert.equal(slugFromCode('th'), 'thailand');
  });
  test('codeFromSlug', () => {
    assert.equal(codeFromSlug('nepal'), 'np');
    assert.equal(codeFromSlug('new-zealand'), 'nz');
    assert.equal(codeFromSlug('thailand'), 'th');
  });
  test('codeFromSlug unknown → null', () => {
    assert.equal(codeFromSlug('atlantis'), null);
    assert.equal(slugFromCode('xx'), null);
  });
  test('round-trips for every country', () => {
    for (const c of COUNTRIES) {
      assert.equal(codeFromSlug(slugFromCode(c.code)), c.code);
    }
  });
});

test('COUNTRY_ORDER lists the seven countries in trip order', () => {
  assert.deepEqual(COUNTRY_ORDER, ['np', 'in', 'vn', 'cn', 'au', 'nz', 'th']);
});

test('COUNTRIES exposes Hebrew + English names for every code', () => {
  assert.equal(COUNTRIES.length, 7);
  for (const code of COUNTRY_ORDER) {
    const c = COUNTRIES.find((x) => x.code === code);
    assert.ok(c, `missing country ${code}`);
    assert.ok(c.he && c.he.length > 0, `country ${code} missing Hebrew name`);
    assert.ok(c.en && c.en.length > 0, `country ${code} missing English name`);
  }
});

// Single-country mappings — one representative album per country.
test.describe('assignAlbumToCountries — single-country', () => {
  const cases = [
    [5, 'np'],   // Nepal mid
    [12, 'in'],  // India mid
    [25, 'vn'],  // Vietnam mid
    [34, 'cn'],  // China mid (not 37 — that's the cross-country)
    [45, 'au'],  // Australia mid
    [65, 'nz'],  // New Zealand mid
    [80, 'th'],  // Thailand mid (contiguous range)
    [19, 'th'],  // Thailand non-contiguous
  ];
  for (const [albumId, code] of cases) {
    test(`album ${albumId} → only [${code}], primary ${code}`, () => {
      const r = assignAlbumToCountries(albumId);
      assert.deepEqual(r.countries, [code]);
      assert.equal(r.primary, code);
    });
  }
});

// Cross-country albums — from docs/spec.md.
test('album 1 is Nepal + Thailand, primary Nepal', () => {
  const r = assignAlbumToCountries(1);
  assert.deepEqual(r.countries, ['np', 'th']);
  assert.equal(r.primary, 'np');
});

test('album 37 is China + Australia + Thailand, primary China', () => {
  const r = assignAlbumToCountries(37);
  assert.deepEqual(r.countries, ['cn', 'au', 'th']);
  assert.equal(r.primary, 'cn');
});

// Contiguous-range boundaries — first and last album of each range that
// doesn't overlap.
test.describe('assignAlbumToCountries — range boundaries', () => {
  const boundaries = [
    [7, 'np'],   // Nepal last (not cross-country)
    [8, 'in'],   // India first
    [18, 'in'],  // India last
    [20, 'vn'],  // Vietnam first
    [29, 'vn'],  // Vietnam last
    [30, 'cn'],  // China first (not the 37 overlap)
    [38, 'au'],  // Australia first (after 37 overlap)
    [53, 'au'],  // Australia last
    [54, 'nz'],  // New Zealand first
    [76, 'nz'],  // New Zealand last
    [77, 'th'],  // Thailand contiguous first
    [88, 'th'],  // Thailand contiguous last
  ];
  for (const [albumId, code] of boundaries) {
    test(`album ${albumId} → [${code}]`, () => {
      const r = assignAlbumToCountries(albumId);
      assert.deepEqual(r.countries, [code]);
    });
  }
});

// Out-of-range throws.
test('album with no country range throws loudly', () => {
  assert.throws(() => assignAlbumToCountries(100), /album.*100/i);
  assert.throws(() => assignAlbumToCountries(89), /album.*89/i);
});

test('non-positive album throws', () => {
  assert.throws(() => assignAlbumToCountries(0));
  assert.throws(() => assignAlbumToCountries(-1));
});
