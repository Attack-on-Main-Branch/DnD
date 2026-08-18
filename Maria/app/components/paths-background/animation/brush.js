/**
 * The brush a path is drawn with. Paths are not stroked: nested strokes band
 * visibly on a wide trunk, and round caps overlap segment to segment, making
 * the core read as a chain of beads.
 *
 * Instead one smooth radial falloff is baked per colour bucket and stamped
 * densely along each segment. The profile is a sum of gaussians, smooth to
 * every derivative, so neither bands nor ripple survive.
 */

import { HIGHLIGHT, mix, rgba, sampleRamp } from "./palette.js";

/** Backing size of each stamp. Scaled per segment, so this is detail, not size. */
const SIZE = 200;
/** Colour buckets baked across the ramp. */
const BUCKETS = 16;
/** Gradient stops per stamp — enough that the piecewise-linear kinks vanish. */
const STOPS = 48;

/**
 * Radial brightness, 1 at the centre to 0 at the rim: a hot needle, the stroke
 * body, and a wide halo. `u` is the fraction of the stamp radius.
 */
function profile(u) {
  if (u >= 1) return 0;
  const g = (sigma) => Math.exp(-(u * u) / (2 * sigma * sigma));
  const v = 0.3 * g(0.06) + 0.45 * g(0.2) + 0.25 * g(0.45);
  // Ease the last stretch to exactly zero so the stamp has no faint rim edge.
  const edge = u > 0.72 ? 1 - (u - 0.72) / 0.28 : 1;
  return v * edge * edge;
}

/** How white the centre runs. Only the very core, or the whole path desaturates. */
function tint(u) {
  return 0.45 * Math.exp(-(u * u) / (2 * 0.07 * 0.07));
}

/**
 * Integral of the profile across a diameter. Stamping accumulates
 * `alpha * radius * K / spacing` at the centre, which is what pins brightness
 * independently of width, segment length and step size.
 */
const K = (() => {
  const n = 2048;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += profile((i + 0.5) / n);
  return (2 * sum) / n;
})();

function makeStamp(colour) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const half = SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (let i = 0; i <= STOPS; i++) {
    const u = i / STOPS;
    gradient.addColorStop(u, rgba(mix(colour, HIGHLIGHT, tint(u)), profile(u)));
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return canvas;
}

export function createBrush() {
  const stamps = [];
  for (let i = 0; i < BUCKETS; i++)
    stamps.push(makeStamp(sampleRamp(i / (BUCKETS - 1))));

  /** `ctx` must already be in `lighter` mode. */
  return function stampSegment(ctx, segment, spread, brightness) {
    const radius = Math.max(1.2, segment.w * spread * 0.5);
    // Far denser than the falloff is wide; sparser and the beading returns.
    const steps = Math.min(
      10,
      Math.max(1, Math.ceil(segment.len / (radius * 0.3))),
    );
    const spacing = segment.len / steps;
    const alpha = Math.min(1, (brightness * spacing) / (radius * K));
    if (alpha <= 0.0015) return;

    const stamp =
      stamps[
        Math.min(
          BUCKETS - 1,
          Math.max(0, Math.round(segment.t * (BUCKETS - 1))),
        )
      ];
    const size = radius * 2;
    const dx = segment.x1 - segment.x0;
    const dy = segment.y1 - segment.y0;

    ctx.globalAlpha = alpha;
    for (let i = 0; i < steps; i++) {
      const at = (i + 0.5) / steps;
      ctx.drawImage(
        stamp,
        segment.x0 + dx * at - radius,
        segment.y0 + dy * at - radius,
        size,
        size,
      );
    }
    ctx.globalAlpha = 1;
  };
}
