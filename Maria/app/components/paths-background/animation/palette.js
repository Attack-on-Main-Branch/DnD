/**
 * Colour ramp for the Paths tree.
 *
 * Sampled from the Attack on Titan S4 Part 1 ending: the core of the plume
 * burns pale chartreuse, the canopy is molten gold, and the outermost tendrils
 * cool off into rust. Everything is composited additively, so treat these as
 * "energy" values rather than final pixel colours — overlapping strokes bloom
 * towards white on their own.
 */
const STOPS = [
  { t: 0.0, c: [236, 248, 186] }, // pale chartreuse (hot core)
  { t: 0.2, c: [212, 233, 104] }, // yellow-green
  { t: 0.42, c: [255, 205, 74] }, // gold
  { t: 0.68, c: [232, 134, 24] }, // amber
  { t: 0.86, c: [190, 82, 10] }, // ember
  { t: 1.0, c: [138, 44, 6] }, // rust
];

const LUT_SIZE = 512;

/** Pre-baked lookup table so per-segment colour sampling costs one array read. */
const LUT = (() => {
  const table = new Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    let a = STOPS[0];
    let b = STOPS[STOPS.length - 1];
    for (let s = 0; s < STOPS.length - 1; s++) {
      if (t >= STOPS[s].t && t <= STOPS[s + 1].t) {
        a = STOPS[s];
        b = STOPS[s + 1];
        break;
      }
    }
    const span = b.t - a.t || 1;
    const k = (t - a.t) / span;
    table[i] = [
      a.c[0] + (b.c[0] - a.c[0]) * k,
      a.c[1] + (b.c[1] - a.c[1]) * k,
      a.c[2] + (b.c[2] - a.c[2]) * k,
    ];
  }
  return table;
})();

/** Sample the ramp. `t` is clamped to 0..1 (0 = core, 1 = rust). */
export function sampleRamp(t) {
  const i = t <= 0 ? 0 : t >= 1 ? LUT_SIZE - 1 : (t * (LUT_SIZE - 1)) | 0;
  return LUT[i];
}

/** Linear blend between two `[r, g, b]` triples. */
export function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** `[r, g, b]` + alpha -> CSS colour string. */
export function rgba(c, a) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

/** Near-white highlight the branch cores are tinted towards. */
export const HIGHLIGHT = [255, 249, 219];
