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

test('albumPath (global album id under the country slug)', () => {
  assert.equal(albumPath('np', 1), '/nepal/1');
  assert.equal(albumPath('th', 19), '/thailand/19');
});

test('albumPath accepts string id', () => {
  assert.equal(albumPath('np', '5'), '/nepal/5');
});

test('slidePath', () => {
  assert.equal(slidePath('np', 1, 0), '/nepal/1/0');
  assert.equal(slidePath('nz', 70, 12), '/new-zealand/70/12');
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
