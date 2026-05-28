import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  PHONE_QUERY,
  TABLET_QUERY,
  DESKTOP_QUERY,
  isPhone,
  isTablet,
  isDesktop,
} from './viewport.js';

// Build a mock matchMedia that responds to specific queries.
function mockMM(matchingQueries) {
  return (q) => ({ matches: matchingQueries.includes(q) });
}

test('query strings target the documented breakpoints', () => {
  assert.equal(PHONE_QUERY, '(max-width: 768px)');
  assert.equal(TABLET_QUERY, '(min-width: 769px) and (max-width: 1199px)');
  assert.equal(DESKTOP_QUERY, '(min-width: 1200px)');
});

test('isPhone true when matchMedia matches PHONE_QUERY', () => {
  assert.equal(isPhone(mockMM([PHONE_QUERY])), true);
});

test('isPhone false when only desktop matches', () => {
  assert.equal(isPhone(mockMM([DESKTOP_QUERY])), false);
});

test('isTablet true only at tablet breakpoint', () => {
  assert.equal(isTablet(mockMM([TABLET_QUERY])), true);
  assert.equal(isTablet(mockMM([PHONE_QUERY])), false);
  assert.equal(isTablet(mockMM([DESKTOP_QUERY])), false);
});

test('isDesktop true only at desktop breakpoint', () => {
  assert.equal(isDesktop(mockMM([DESKTOP_QUERY])), true);
  assert.equal(isDesktop(mockMM([PHONE_QUERY])), false);
  assert.equal(isDesktop(mockMM([TABLET_QUERY])), false);
});
