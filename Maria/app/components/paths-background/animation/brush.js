/**
 * The brush a path is drawn with.
 *
 * Nested hard-edged strokes — one for the halo, one for the body, one for the
 * core — give exactly that many concentric bands, and on a wide trunk the steps
 * between them are plainly visible. Round line caps add a second artefact: each
 * segment's cap overlaps the previous one, so the deposit ripples once per
 * segment and the core reads as a chain of beads.
 *
 * So a path is not stroked at all. One smooth radial falloff is baked per colour
 * bucket, and each segment stamps it densely along its own length. The profile
 * is a sum of gaussians, so it is smooth to every derivative — no bands — and
 * convolving a smooth kernel along the line leaves no ripple either.
 */

import { HIGHLIGHT, mix, rgba, sampleRamp } from "./palette.js";

/** Backing size of each stamp. Scaled per segment, so this is detail, not size. */
const SIZE = 200;
/** Colour buckets baked across the ramp. */
const BUCKETS = 16;
/** Gradient stops per stamp — enough that the piecewise-linear kinks vanish. */
const STOPS = 48;

/**
 * Radial brightness, 1 at the centre falling to 0 at the rim.
 *
 * Three gaussians: a hot needle, the body of the stroke, and a wide soft halo.
 * `u` is the fraction of the stamp radius, and the nominal stroke edge sits at
 * u = 1 / SPREAD.
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
 * Integral of the profile across a diameter, in units of the radius.
 *
 * Stamping along a line accumulates `alpha * radius * K / spacing` at the
 * centre, so this is what lets brightness be pinned independently of stroke
 * width, segment length and simulation step size.
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

  /**
   * Stamp one segment onto `ctx`, which must already be in `lighter` mode.
   *
   * @param spread stamp radius as a multiple of the segment's nominal width
   * @param brightness accumulated centre brightness for a straight run, 0..1
   */
  return function stampSegment(ctx, segment, spread, brightness) {
    const radius = Math.max(1.2, segment.w * spread * 0.5);
    // Keep stamps far denser than the falloff is wide; any sparser and the
    // ripple that caused the beading in the first place starts to come back.
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
