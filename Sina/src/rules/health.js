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

/**
 * The ends a maximum falls between. Both come from hp.js, which DERIVES the
 * ceiling from the hit dice rather than choosing it — nobody types a maximum
 * any more, so the only figures that exist are ones that arithmetic produced.
 * Re-exported here because this is where the bar has always read them from.
 */
import { MAX_HP as CEILING } from "./hp.js";

export { MAX_HP, MIN_MAX_HP } from "./hp.js";

/** Worst first, so a reader sees the thresholds in the order they are tested. */
export const HEALTH_TIERS = ["critical", "wounded", "healthy"];

// Fractions rather than hit points: 40 of 200 is the same trouble as 20 of 100.
const WOUNDED_AT = 0.5;
const CRITICAL_AT = 0.2;

/** Clamped, so a corrupt row cannot draw a bar past its track. */
export function healthFraction(current, max = CEILING) {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, current / max));
}

export function healthTier(current, max = CEILING) {
  const fraction = healthFraction(current, max);

  if (fraction > WOUNDED_AT) {
    return "healthy";
  }

  return fraction > CRITICAL_AT ? "wounded" : "critical";
}

/**
 * A typed hit-point figure, or null when it is not a number at all. Clamped
 * rather than refused: the controls that produce it work over one fixed range,
 * so anything outside it is a rounding artefact or a paste. Mirrors
 * `characters_current_hp_check`, which is the check that counts.
 */
export function parseHitPoints(value, max = CEILING) {
  const number = Number(String(value ?? "").trim());

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(max, Math.max(0, Math.round(number)));
}
