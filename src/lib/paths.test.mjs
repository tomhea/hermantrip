import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  homePath, countryPath, countryRandomPath, albumPath, slidePath,
  randomPath, mapPath, gamePath, timelinePath, dayPath,
} from './paths.js';

test('homePath', () => {
  assert.equal(homePath(), '/');
});

test('countryPath maps code → slug', () => {
  assert.equal(countryPath('np'), '/nepal');
  assert.equal(countryPath('nz'), '/new-zealand');
  assert.equal(countryPath('th'), '/thailand');
});

test('countryRandomPath', () => {
  assert.equal(countryRandomPath('np'), '/nepal/random');
});

test('albumPath uses the album name slug under the country slug (M23)', () => {
  assert.equal(albumPath('np', 'nagarkot-bhaktapur'), '/nepal/nagarkot-bhaktapur');
  assert.equal(albumPath('th', 'bangkok'), '/thailand/bangkok');
});

test('slidePath appends the photo index to the album slug (M23)', () => {
  assert.equal(slidePath('np', 'poon-hill-trek', 0), '/nepal/poon-hill-trek/0');
  assert.equal(slidePath('nz', 'milford-sound', 12), '/new-zealand/milford-sound/12');
});

test('all-countries random + feature pages', () => {
  assert.equal(randomPath(), '/random');
  assert.equal(mapPath(), '/map');
  assert.equal(gamePath(), '/game');
  assert.equal(timelinePath(), '/timeline');
});

test('dayPath: bare + specific date', () => {
  assert.equal(dayPath(), '/day');
  assert.equal(dayPath('2011-07-23'), '/day/2011-07-23');
});

test('feature-page paths never collide with any country slug', () => {
  const features = [randomPath(), mapPath(), gamePath(), timelinePath(), dayPath()]
    .map((p) => p.slice(1));
  const slugs = ['nepal', 'india', 'vietnam', 'china', 'australia', 'new-zealand', 'thailand'];
  for (const f of features) assert.equal(slugs.includes(f), false, `feature "${f}" collides with a country slug`);
});
