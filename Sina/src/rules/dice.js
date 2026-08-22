/**
 * The dice, and the one place their sides are written down.
 *
 * Its own module for the reason health.js is: `rules/character.js` carries four
 * hundred lines of RACES and ARCHETYPES, and a Client Component importing one
 * function from it retains the lot. The table rolls in the browser.
 *
 * A die's `sides` is the only fact here the rest of the app cannot derive —
 * notation, glyphs and copy are all built from `id` and `sides` by whoever
 * needs them.
 */

/** In the order they are stacked down the rail: smallest face count first. */
export const DICE = [
  { id: "d4", sides: 4 },
  { id: "d6", sides: 6 },
  { id: "d8", sides: 8 },
  { id: "d10", sides: 10 },
  { id: "d12", sides: 12 },
  { id: "d20", sides: 20 },
  { id: "d100", sides: 100 },
];

const BY_ID = new Map(DICE.map((die) => [die.id, die]));

export function isDie(id) {
  return BY_ID.has(id);
}

export function dieSides(id) {
  return BY_ID.get(id)?.sides ?? null;
}

const DRAW_RANGE = 2 ** 32;

/**
 * One die, from the platform's cryptographic source rather than `Math.random`.
 *
 * The modulo is guarded because 2^32 is not a multiple of 6, 10, 12 or 100: the
 * final short block of draws would otherwise land only on the low faces, and a
 * loaded d20 is exactly the thing a dice roller may not ship. Values inside
 * that block are drawn again — the loop runs a second time about once in fifty
 * million rolls for a d100, and never at all for d4, d8 or d16-alikes.
 */
export function rollDie(id) {
  const sides = dieSides(id);

  if (sides === null) {
    return null;
  }

  const ceiling = DRAW_RANGE - (DRAW_RANGE % sides);
  const draw = new Uint32Array(1);

  do {
    crypto.getRandomValues(draw);
  } while (draw[0] >= ceiling);

  return (draw[0] % sides) + 1;
}

/**
 * A result that came from somewhere other than `rollDie` — the physics
 * simulation reads the face a die settled on — put to the same bounds. Null for
 * anything that is not a face this die has, so a caller can fall back rather
 * than print a d20 showing 34.
 */
export function readDieResult(id, value) {
  const sides = dieSides(id);
  const face = Number(value);

  if (sides === null || !Number.isInteger(face) || face < 1 || face > sides) {
    return null;
  }

  return face;
}
