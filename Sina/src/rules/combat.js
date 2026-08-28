/**
 * A fight at the table: whether one is happening, whose turn it is, and the
 * order the turn walks down. Bounds and shapes only — who may begin a fight is a
 * question about a chair, and no chair is knowable here.
 */

/** A d20 is the die, but the modifier is the character's — so the ceiling is not
    twenty. Mirrors `map_placed_tokens_initiative_check`. */
export const MIN_INITIATIVE = -20;
export const MAX_INITIATIVE = 99;

/** Mirrors `campaigns_combat_round_check`. */
export const MIN_COMBAT_ROUND = 1;

/**
 * A number as the box submits it, or null for a piece that has not rolled.
 *
 * NULL IS A VALUE: clearing the box takes a piece out of the fight. An empty
 * string is that same act — `Number("")` is 0, which would put the piece last in
 * the order rather than out of it.
 */
export function parseInitiative(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    return null;
  }

  return number >= MIN_INITIATIVE && number <= MAX_INITIATIVE ? number : null;
}

/** The table's combat state — the seam a `campaign_table` row crosses, and the
    one a message off the wire is put through before it is believed. */
export function readCombat(row) {
  const round = Number(row?.combat_round ?? row?.round);

  return {
    inCombat: Boolean(row?.is_in_combat ?? row?.inCombat),
    activeTokenId: tokenId(row?.active_turn_token_id ?? row?.activeTokenId),
    round:
      Number.isInteger(round) && round >= MIN_COMBAT_ROUND
        ? round
        : MIN_COMBAT_ROUND,
  };
}

/**
 * The pieces in the fight, highest first — the ladder the tracker draws.
 *
 * THE TIE-BREAKS ARE LOAD-BEARING. `combat_turn_order` breaks them the same way,
 * and if the two ever disagree `advance_combat_turn` walks a different order
 * than the one on screen and the glow skips somebody.
 *
 * A dead piece is out of it; the caller is expected to have merged the card's
 * death on already, which use-map-tokens.js does. Sorts a copy — the caller's
 * list is a render's.
 */
export function initiativeOrder(tokens) {
  return (Array.isArray(tokens) ? tokens : [])
    .filter(inFight)
    .slice()
    .sort(
      (a, b) =>
        b.initiative - a.initiative ||
        String(a.placedAt ?? "").localeCompare(String(b.placedAt ?? "")) ||
        String(a.id).localeCompare(String(b.id)),
    );
}

function inFight(token) {
  return Boolean(token && Number.isInteger(token.initiative) && !token.isDead);
}

function tokenId(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
