import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  angularDistance, arcApexAltitude, greatCircleMidpoint, ARC_APEX_SCALE,
  israelBangkokLeg, arrowVisible, MIN_ARROW_ANGLE,
} from './globe-arrows.js';
import { ISRAEL, BANGKOK } from './map-stops.js';

test('angularDistance: identical points → 0', () => {
  assert.equal(angularDistance([13.75, 100.5], [13.75, 100.5]), 0);
});

test('angularDistance: a quarter of the globe → π/2 rad', () => {
  // (0,0) to (0,90) is 90° of longitude on the equator = π/2 radians.
  assert.ok(Math.abs(angularDistance([0, 0], [0, 90]) - Math.PI / 2) < 1e-9);
  // pole to equator is also a quarter turn.
  assert.ok(Math.abs(angularDistance([90, 0], [0, 0]) - Math.PI / 2) < 1e-9);
});

test('arcApexAltitude: scales with angular distance; zero-length → 0', () => {
  assert.equal(arcApexAltitude([0, 0], [0, 0]), 0);
  // A π/2 arc bows to π/2 · scale.
  const apex = arcApexAltitude([0, 0], [0, 90]);
  assert.ok(Math.abs(apex - (Math.PI / 2) * ARC_APEX_SCALE) < 1e-9);
  // A short hop bows far less than a long haul (monotonic in distance).
  assert.ok(arcApexAltitude([0, 0], [0, 2]) < arcApexAltitude([0, 0], [0, 60]));
  assert.ok(ARC_APEX_SCALE > 0 && ARC_APEX_SCALE < 1);
});

test('greatCircleMidpoint: equator midpoint is the lat/lng average', () => {
  const [lat, lng] = greatCircleMidpoint([0, 0], [0, 90]);
  assert.ok(Math.abs(lat - 0) < 1e-9);
  assert.ok(Math.abs(lng - 45) < 1e-9);
});

test('greatCircleMidpoint: a same-longitude pair midpoints at the mean latitude', () => {
  const [lat, lng] = greatCircleMidpoint([10, 100], [50, 100]);
  assert.ok(Math.abs(lat - 30) < 1e-6);
  assert.ok(Math.abs(lng - 100) < 1e-6);
});

test('israelBangkokLeg: detects the outbound and return long-haul, null otherwise', () => {
  assert.equal(israelBangkokLeg(ISRAEL, BANGKOK), 'outbound');
  assert.equal(israelBangkokLeg(BANGKOK, ISRAEL), 'return');
  assert.equal(israelBangkokLeg(ISRAEL, [0, 0]), null);
  assert.equal(israelBangkokLeg([10, 100], [50, 100]), null);
});

test('arcApexAltitude: the two Israel↔Bangkok legs bow to DIFFERENT heights (separated)', () => {
  const out = arcApexAltitude(ISRAEL, BANGKOK);
  const ret = arcApexAltitude(BANGKOK, ISRAEL);
  assert.ok(out > ret, 'outbound bows higher than the return so they do not overlap');
  // A non-leg pair of the SAME distance is unscaled (plain base altitude).
  const base = angularDistance(ISRAEL, BANGKOK) * ARC_APEX_SCALE;
  assert.ok(out > base && ret < base);
});

test('arrowVisible: drops dense short hops, keeps the long legs', () => {
  assert.equal(MIN_ARROW_ANGLE > 0, true);
  assert.equal(arrowVisible([27.7, 85.3], [27.7, 85.5]), false); // ~0.2° Nepal hop
  assert.equal(arrowVisible(ISRAEL, BANGKOK), true);             // long-haul
  assert.equal(arrowVisible([0, 0], [0, 0]), false);             // zero-length
});
