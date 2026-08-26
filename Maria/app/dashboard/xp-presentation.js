import { MAX_LEVEL } from "sina/rules/level";
import { xpThreshold } from "sina/rules/xp";

/**
 * What experience looks like, and what it is called. Sina decides where a level
 * ends; this decides that the bar is emerald and that the top of the ladder
 * reads "Maxed" rather than a fraction of nothing.
 *
 * Its own module rather than a corner of character-presentation.js, for the
 * reason health-presentation.js is one: the bar is adjusted in the browser, and
 * that neighbour reaches into the RACES and ARCHETYPES catalogues and imports
 * six pieces of race artwork.
 *
 * The class string must stay literal for Tailwind's scanner to find it.
 */

/** The fourth palette on the plasma bar. See `.hp-verdant` in globals.css. */
export const XP_BAR_CLASS = "hp-verdant";

/**
 * The readout: `150 / 200 XP`, and one word at the top of the ladder. A 20th
 * level character has nothing left to progress towards, and `12700 / 12700`
 * would be a sentence about a threshold nobody can spend.
 */
export function xpReadout(xp, level) {
  const target = xpThreshold(level);

  return target === null ? null : { held: xp, target };
}

/** The same, for a screen reader — one sentence rather than three numbers. */
export function xpValueText(xp, level) {
  const readout = xpReadout(xp, level);

  return readout
    ? `${readout.held} of ${readout.target} experience towards level ${level + 1}`
    : `Level ${MAX_LEVEL}, the top of the ladder`;
}
