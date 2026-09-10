// Deterministic seeded RNG so results are reproducible for a given parameter set
// (important for "live" recompute — same inputs must always give same output).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal(0,1) samples from a uniform RNG
export function makeGaussian(rng) {
  let spare = null;
  return function (mean = 0, std = 1) {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return mean + std * v;
    }
    let u = 0,
      v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const z0 = mag * Math.cos(2.0 * Math.PI * v);
    const z1 = mag * Math.sin(2.0 * Math.PI * v);
    spare = z1;
    return mean + std * z0;
  };
}
