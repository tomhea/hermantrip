// Fisher-Yates shuffle (M17). Pure + non-mutating; takes an rng so tests
// can feed a seeded generator for deterministic output. Default rng is
// Math.random (the only impurity, and only when no rng is passed).

export function shuffle(arr, rng = Math.random) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}
