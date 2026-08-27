/**
 * The hex grid a map can be ruled with, as the database holds it. Bounds only —
 * the geometry is Maria/lib/hex-math.js. Mirrored by the CHECK constraints in
 * 20260921090000_a_grid_on_the_board.sql.
 */

/** A cell's radius, in the PICTURE'S OWN PIXELS: the board zooms, so a screen
    pixel means somewhere else on every chair. */
export const MIN_GRID_SIZE = 16;
export const MAX_GRID_SIZE = 200;
export const DEFAULT_GRID_SIZE = 48;

/** How far up the grey ramp the lines are drawn. A number and not a colour:
    the frontend decides what a line looks like. */
/** What one cell is worth on the ground, in whichever of the six directions
    the step is taken. */
export const FEET_PER_HEX = 5;

export const MIN_GRID_LUMINANCE = 0;
export const MAX_GRID_LUMINANCE = 1;
export const DEFAULT_GRID_LUMINANCE = 1;

/**
 * Clamped rather than refused: a slider produces these, so a value a hair
 * outside the bound is a rounding artefact.
 *
 * An ABSENT value is a different thing and takes the default. `Number` alone
 * reads null, undefined and "" as 0, which clamps to the MINIMUM — the same
 * trap `fraction` in rules/campaign.js is written around.
 */
function given(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function clampGridSize(value) {
  const size = given(value);

  if (size === null) {
    return DEFAULT_GRID_SIZE;
  }

  return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(size)));
}

export function clampGridLuminance(value) {
  const level = given(value);

  if (level === null) {
    return DEFAULT_GRID_LUMINANCE;
  }

  return Math.min(MAX_GRID_LUMINANCE, Math.max(MIN_GRID_LUMINANCE, level));
}

/** A map row's grid, bounded on the way out. The `??` belongs here and nowhere
    else: an older deploy wrote rows before these columns existed. */
export function readGridSettings(map) {
  return {
    enabled: Boolean(map?.grid_enabled),
    size: clampGridSize(map?.grid_size ?? DEFAULT_GRID_SIZE),
    luminance: clampGridLuminance(
      map?.grid_luminance ?? DEFAULT_GRID_LUMINANCE,
    ),
  };
}
