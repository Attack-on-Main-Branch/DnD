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

function dieSides(id) {
  return BY_ID.get(id)?.sides ?? null;
}

/**
 * How many of one die a single throw may be. Mirrored in the log's own SQL,
 * where a total is bounded against it.
 */
export const MAX_DICE_COUNT = 20;

/**
 * How many dice a throw is. CLAMPED at the ceiling rather than refused: the
 * rail's own field does the same as it is typed into, and the two must agree
 * about what 40 means. Null for anything that is not a count at all.
 */
export function parseDiceCount(value) {
  const count = Number(value);

  return Number.isInteger(count) && count >= 1
    ? Math.min(count, MAX_DICE_COUNT)
    : null;
}

/**
 * How many places at the edge of a board a throw can come in from. A rule and
 * not a picture: where they are is the arena's business, but WHICH one a roll
 * uses must be the same answer on every screen, or two chairs are running two
 * different simulations of it.
 */
export const DICE_CORNERS = 4;

/** Which of them, from the seed the throw is already carrying. */
export function diceCorner(seed) {
  // Not coerced: a seed is a number or it is nothing.
  if (!Number.isInteger(seed)) {
    return 0;
  }

  return ((seed % DICE_CORNERS) + DICE_CORNERS) % DICE_CORNERS;
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
function face(sides) {
  const ceiling = DRAW_RANGE - (DRAW_RANGE % sides);
  const drawn = new Uint32Array(1);

  do {
    crypto.getRandomValues(drawn);
  } while (drawn[0] >= ceiling);

  return (drawn[0] % sides) + 1;
}

/**
 * A handful of one die, totalled the way a table totals them. Null for a die
 * this app does not carry or a count that is not one.
 */
export function rollDice(id, count = 1) {
  const sides = dieSides(id);
  const rolls = parseDiceCount(count);

  if (sides === null || rolls === null) {
    return null;
  }

  let total = 0;

  for (let roll = 0; roll < rolls; roll += 1) {
    total += face(sides);
  }

  return total;
}

/**
 * A total that came from somewhere other than `rollDice` — the physics
 * simulation reads the faces its dice settled on — put to the same bounds:
 * every die shows at least one and at most its own face count. Null for
 * anything else, so a caller can fall back rather than print 3d6 showing 34.
 */
export function readDiceResult(id, count, value) {
  const sides = dieSides(id);
  const rolls = parseDiceCount(count);
  const total = Number(value);

  if (
    sides === null ||
    rolls === null ||
    !Number.isInteger(total) ||
    total < rolls ||
    total > rolls * sides
  ) {
    return null;
  }

  return total;
}
