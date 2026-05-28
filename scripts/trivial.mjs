// M0 toolchain validator sentinel. Replaced once real modules exist in src/.
// Intentionally returns a wrong value first to make scripts/trivial.test.mjs
// FAIL, then gets corrected so the test PASSes — exercising the full
// FAIL→PASS evidence loop the CR-ist's R1 enforces.

export function answer() {
  return 42;
}
