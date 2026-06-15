import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  angularDistance, arcApexAltitude, greatCircleMidpoint, ARC_APEX_SCALE,
} from './globe-arrows.js';

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
