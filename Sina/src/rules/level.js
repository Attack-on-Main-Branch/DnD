/**
 * A character's level: the two ends of it, and the arithmetic between them.
 *
 * Its own module for the reason health.js and dice.js are: the party rail steps
 * a level in the browser, and `rules/character.js` carries four hundred lines of
 * catalogues that a Client Component importing one constant would retain.
 *
 * Mirrors `characters_level_check` in
 * 20260811144707_character_color_and_level.sql. Changing one means changing
 * both.
 */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 20;

/**
 * A level, or null when it is not a number at all. Clamped rather than refused,
 * the way parseHitPoints is.
 */
export function parseLevel(value) {
  const number = Number(String(value ?? "").trim());

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(number)));
}

/** Where one press of an arrow lands, or null when it is already at that end. */
export function steppedLevel(level, by) {
  const from = parseLevel(level);

  if (from === null || !Number.isInteger(by) || by === 0) {
    return null;
  }

  const next = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, from + by));

  return next === from ? null : next;
}
