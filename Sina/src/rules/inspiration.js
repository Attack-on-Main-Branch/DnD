/**
 * Inspiration: three marks a character holds, and who may move them.
 *
 * WHO MAY IS NOT SYMMETRIC, and that asymmetry is the whole rule. A mark is
 * GIVEN by whoever runs the session and SPENT by whoever holds it, so a player
 * may press a lit pip and nothing else — handing one back to yourself is the
 * press this must never offer.
 *
 * Mirrors `move_character_inspiration` in 20260906090000.
 */

/** How many a character may hold, and what they start with. */
export const MAX_INSPIRATION = 3;

/**
 * A stored figure, or null — which is also what a character whose marks this
 * viewer may not read comes back as: an absent number is a permission, not a gap.
 */
export function parseInspiration(value) {
  // `Number(null)` is 0, and 0 is a character who has spent all three — the two
  // must not read alike, so an absent value is refused before the conversion.
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number) && number >= 0 && number <= MAX_INSPIRATION
    ? number
    : null;
}

/**
 * The same question the RPC asks, and the only reason to draw a button rather
 * than a dot. `spending` is which way the press goes.
 */
export function mayMoveInspiration({ head, own, spending }) {
  return Boolean(head || (own && spending));
}

/** Where a press lands, clamped at both ends. Null for one that moves nothing. */
export function steppedInspiration(held, by) {
  const from = parseInspiration(held);
  const delta = Number(by);

  if (from === null || !Number.isInteger(delta) || delta === 0) {
    return null;
  }

  const next = Math.min(MAX_INSPIRATION, Math.max(0, from + delta));

  return next === from ? null : next;
}
