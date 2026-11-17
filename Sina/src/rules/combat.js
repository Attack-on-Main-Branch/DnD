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
export const MAX_MOVEMENT_STEP = 1_000_000;

export function readTurnId(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

export function movementFeet(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function movementStep(value) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_MOVEMENT_STEP
    ? value
    : null;
}

export function turnMovement(combat, token) {
  return combat?.inCombat &&
    combat.turnId &&
    token?.movementTurnId === combat.turnId
    ? movementFeet(token.movementFt)
    : 0;
}

export function movementState(speed, moved) {
  const distance = movementFeet(moved);
  const allowance = movementFeet(speed);
  return distance > allowance * 2
    ? "out_of_range"
    : distance > allowance
      ? "dashing"
      : "walking";
}

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
    turnId: readTurnId(row?.combat_turn_id ?? row?.turnId),
    nextCharacterId: tokenId(
      row?.next_turn_character_id ?? row?.nextCharacterId,
    ),
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
    .sort((a, b) => b.initiative - a.initiative || compareTokenPlacement(a, b));
}

export function compareTokenPlacement(a, b) {
  return (
    placementTime(a.placedAt) - placementTime(b.placedAt) ||
    String(a.id).localeCompare(String(b.id))
  );
}

function placementTime(value) {
  const stamp = String(value ?? "");
  const milliseconds = Date.parse(stamp);
  if (!Number.isFinite(milliseconds)) return 0;

  // PostgreSQL keeps microseconds, which Date.parse truncates.
  const fraction = stamp.match(/\.(\d+)/)?.[1] ?? "";
  return milliseconds * 1000 + Number(fraction.padEnd(6, "0").slice(3, 6));
}

function inFight(token) {
  return Boolean(token && Number.isInteger(token.initiative) && !token.isDead);
}

function tokenId(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
