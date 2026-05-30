import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ALBUM_SLUGS, ALBUM_SLUG_ALIASES, slugForAlbum, aliasesForAlbum } from './album-slugs.js';
import { assignAlbumToCountries } from './countries.js';

test('slugForAlbum returns the canonical slug', () => {
  assert.equal(slugForAlbum(2), 'nagarkot-bhaktapur');
  assert.equal(slugForAlbum(19), 'bangkok');
  assert.equal(slugForAlbum(88), 'bangkok-final');
});

test('slugForAlbum returns null for unknown / merged album', () => {
  assert.equal(slugForAlbum(4), null);   // merged into 3
  assert.equal(slugForAlbum(999), null);
});

test('aliasesForAlbum returns the alias list (or [])', () => {
  assert.deepEqual(aliasesForAlbum(2), ['nagarkot', 'bhaktapur']);
  assert.deepEqual(aliasesForAlbum(6), []);
});

test('every non-merged album id (1-88, no 4) has a canonical slug', () => {
  for (let id = 1; id <= 88; id += 1) {
    if (id === 4) continue; // merged into 3
    assert.ok(ALBUM_SLUGS[id], `album ${id} is missing a slug`);
  }
});

test('all slugs are lowercase kebab-case', () => {
  const all = [...Object.values(ALBUM_SLUGS), ...Object.values(ALBUM_SLUG_ALIASES).flat()];
  for (const s of all) {
    assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/, `bad slug: ${s}`);
  }
});

// Group every canonical + alias by the album's PRIMARY country (which decides
// its URL country) and assert no two slugs collide inside one country.
test('slugs (canonical + alias) are unique within each country', () => {
  const byCountry = new Map(); // code -> Set of slugs
  const add = (code, slug) => {
    if (!byCountry.has(code)) byCountry.set(code, new Set());
    const set = byCountry.get(code);
    assert.ok(!set.has(slug), `duplicate slug "${slug}" in country ${code}`);
    set.add(slug);
  };
  for (const idStr of Object.keys(ALBUM_SLUGS)) {
    const id = Number(idStr);
    const { primary } = assignAlbumToCountries(id);
    add(primary, ALBUM_SLUGS[id]);
    for (const alias of aliasesForAlbum(id)) add(primary, alias);
  }
});

test('no alias equals a different album’s canonical in the same country', () => {
  // covered by the uniqueness test above, but assert the specific Bangkok case
  // (19 canonical "bangkok" must not be an alias of 77/88).
  assert.ok(!aliasesForAlbum(77).includes('bangkok'));
  assert.ok(!aliasesForAlbum(88).includes('bangkok'));
});
