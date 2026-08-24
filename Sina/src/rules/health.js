/**
 * Hit points: the bounds, the tiers, and the arithmetic between them.
 *
 * Its own module, the way text.js is, for a reason that shows up in the bundle
 * rather than the source: `rules/character.js` carries four hundred lines of
 * RACES and ARCHETYPES, and a Client Component importing one function from it
 * retains the lot. The health bar is edited in the browser.
 *
 * `rules/character.js` re-exports everything here.
 */

/** The ceiling a character's own maximum may be set to. */
export const MAX_HP = 100;

/** What a new character is worth before anybody has fought anything. */
export const DEFAULT_MAX_HP = 20;

/** A character with no hit points at all is a body, not a character. */
export const MIN_MAX_HP = 1;

/** Worst first, so a reader sees the thresholds in the order they are tested. */
export const HEALTH_TIERS = ["critical", "wounded", "healthy"];

// Fractions rather than hit points: 40 of 200 is the same trouble as 20 of 100.
const WOUNDED_AT = 0.5;
const CRITICAL_AT = 0.2;

/** Clamped, so a corrupt row cannot draw a bar past its track. */
export function healthFraction(current, max = MAX_HP) {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, current / max));
}

export function healthTier(current, max = MAX_HP) {
  const fraction = healthFraction(current, max);

  if (fraction > WOUNDED_AT) {
    return "healthy";
  }

  return fraction > CRITICAL_AT ? "wounded" : "critical";
}

/**
 * A typed hit-point figure, or null when it is not a number at all. Clamped
 * rather than refused: the controls that produce it work over one fixed range,
 * so anything outside it is a rounding artefact or a paste. Mirrors the CHECK
 * in 20260821140000_health_and_notes.sql, which is the check that counts.
 */
export function parseHitPoints(value, max = MAX_HP) {
  const number = Number(String(value ?? "").trim());

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(max, Math.max(0, Math.round(number)));
}

/**
 * The maximum typed into the sheet. An empty field is the placeholder taken at
 * its word; anything that is not a plain run of digits stays NaN, so validation
 * refuses it rather than inventing a number nobody chose.
 */
const MAX_HP_PATTERN = /^[0-9]{1,4}$/;

export function readMaxHitPoints(value) {
  const typed = String(value ?? "").trim();

  if (typed === "") {
    return DEFAULT_MAX_HP;
  }

  return MAX_HP_PATTERN.test(typed) ? Number.parseInt(typed, 10) : Number.NaN;
}

/**
 * `null` when it is a maximum the database will also accept. Mirrors the
 * `characters_max_hp_check` constraint, which is the check that counts.
 */
export function validateMaxHitPoints(maxHp) {
  if (!Number.isInteger(maxHp) || maxHp < MIN_MAX_HP || maxHp > MAX_HP) {
    return {
      field: "maxHp",
      message: `Max HP must be a whole number between ${MIN_MAX_HP} and ${MAX_HP}.`,
    };
  }

  return null;
}
