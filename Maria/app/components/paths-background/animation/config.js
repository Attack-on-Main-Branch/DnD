/**
 * Tuning dials. Everything else lives next to the code that uses it — the brush
 * profile in `brush.js`, sway / taper / fork behaviour in `paths.js`.
 *
 *   grow  →  hold (FADE_DELAY)  →  dissolve (FADE_DURATION)
 *                                  └─ next path launches at NEXT_PATH_DELAY
 */

/**
 * Trunk width in design pixels, scaled to the viewport before use (×1 at ~820px,
 * ×1.3 at 1080p) so proportions hold on a phone and an ultrawide.
 */
export const TRUNK_WIDTH_MIN = 10;
export const TRUNK_WIDTH_MAX = 20;

/**
 * Width at which a branch burns out into a bead. Lower is wispier and
 * longer-lived, since branches grow until they thin to this.
 */
export const BRANCH_MIN_WIDTH = 1.0;

/**
 * Live branches per path. The main density dial and the main cost dial — every
 * live branch paints four strokes per frame. Not scaled to viewport area.
 */
export const MAX_BRANCHES_PER_PATH = 150;

/**
 * Time multiplier for the whole animation. Every other duration here is in
 * simulation seconds. Above ~3 the curves go faceted.
 */
export const SPEED = 1;

/** Seconds at full brightness before dissolving, from the last branch burning out. */
export const FADE_DELAY = 0.0;

/** Seconds to dissolve. A true ramp to zero — the layer is cleared at the end. */
export const FADE_DURATION = 6;

/**
 * When the next path launches, measured from the previous one starting to
 * dissolve. Below FADE_DURATION the two overlap; above it the frame sits empty.
 * Each generation gets its own trail layer, so an overlap dissolves only the old.
 */
export const NEXT_PATH_DELAY = 2.5;

/**
 * Peak brightness along a path, 0..1. An accumulated target, not a raw alpha:
 * the brush divides by how often it stamps a pixel, so brightness is independent
 * of width, speed and frame rate. Crossing branches still add on top.
 */
export const PATH_BRIGHTNESS = 0.8;

/** Glow reach, as a multiple of branch width. Smooth falloff, so no edge appears. */
export const GLOW_SPREAD = 5.5;
