/**
 * Tuning dials.
 *
 * The knobs worth reaching for first, in one place. Everything else lives next
 * to the code that uses it — the brush profile in `brush.js`, sway / taper /
 * fork behaviour in `paths.js`.
 *
 * A path runs on this loop:
 *
 *   grow  →  hold (FADE_DELAY)  →  dissolve (FADE_DURATION)
 *                                  └─ next path launches at NEXT_PATH_DELAY
 *
 * Nothing fades while a path is growing: the tree builds to full brightness,
 * sits, then dissolves all the way to nothing. NEXT_PATH_DELAY decides whether
 * the frame goes fully black in between or the next path is already on its way
 * up while the last one is still dissolving.
 */

/**
 * Width of the trunk a path starts with, in *design pixels*: these are scaled to
 * the viewport before use (×1 at a ~820px viewport, ×1.3 at 1080p), so a path
 * keeps its proportions on a phone and on an ultrawide.
 *
 * Branches taper down from here as they grow, and each fork hands its children
 * roughly half to three quarters of the parent's current width.
 */
export const TRUNK_WIDTH_MIN = 10;
export const TRUNK_WIDTH_MAX = 20;

/**
 * Width at which a branch gives up and burns out into a bead, in design pixels.
 *
 * This is the far end of the taper — the finest twig the tree can draw. Lower it
 * for wispier, longer-lived tips (branches keep going until they thin to this,
 * so it also lengthens a path's life); raise it for a blunter, stubbier tree
 * that finishes sooner.
 */
export const BRANCH_MIN_WIDTH = 1.0;

/**
 * Most branches a single path may have growing at once, trunk included.
 *
 * Forking stops at this ceiling and resumes as tips burn out, so it is the main
 * dial for how dense a tree gets — and the main cost dial too, since every live
 * branch paints four strokes per frame. This is a flat count, not scaled to
 * viewport area: a small window gets just as many branches.
 */
export const MAX_BRANCHES_PER_PATH = 150;

/**
 * Overall time multiplier for the whole animation — growth, sway, the hold, the
 * dissolve and the gap all scale together.
 *
 * 1 is normal, 2 runs the loop twice as fast, 0.5 half speed. Every other
 * duration here is in *simulation* seconds, so they keep their relative timing
 * whatever this is set to. Pushing it much above ~3 starts to show, because a
 * branch then advances far enough per frame for its curve to go faceted.
 */
export const SPEED = 1;

/**
 * Seconds the finished tree sits at full brightness before it starts to
 * dissolve, measured from the moment its last branch burns out.
 */
export const FADE_DELAY = 0.0;

/**
 * Seconds the tree takes to dissolve from full brightness to *completely* gone.
 *
 * This is a genuine ramp to zero, not a half-life: at the end the layer is
 * cleared outright, so no faint residue is left behind on the black.
 */
export const FADE_DURATION = 6;

/**
 * When the next path launches, in seconds measured from the moment the previous
 * one *starts* dissolving.
 *
 *   < FADE_DURATION  the paths overlap. At FADE_DURATION = 4 and this = 3, the
 *                    new path starts coming out 1 s before the old one has
 *                    finished fading away.
 *   = FADE_DURATION  the new path starts exactly as the frame reaches black.
 *   > FADE_DURATION  the frame sits empty for the difference before the next.
 *
 * The two generations get a trail layer each, so an overlapping launch dissolves
 * only the old path — the new one comes up at full brightness over it.
 */
export const NEXT_PATH_DELAY = 2.5;

/**
 * Peak brightness along the middle of a path, 0..1.
 *
 * This is an *accumulated* target, not a raw alpha: the brush divides by how
 * many times it stamps over a given pixel, so brightness stays put whatever the
 * width, speed or frame rate. Crossing branches still add on top, so a dense
 * crown clips to white well before this reaches 1.
 */
export const PATH_BRIGHTNESS = 0.8;

/**
 * How far the glow reaches, as a multiple of a branch's own width.
 *
 * The falloff is smooth all the way out, so this widens the soft surround
 * without putting an edge anywhere. Larger is hazier and costs a little more
 * fill; smaller is a harder, more wire-like line.
 */
export const GLOW_SPREAD = 5.5;
