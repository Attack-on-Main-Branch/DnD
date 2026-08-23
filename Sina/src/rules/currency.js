/**
 * The five coins, the bounds they are held to, and the arithmetic between them.
 *
 * Its own module rather than a corner of `rules/character.js`, for the reason
 * `health.js`, `level.js` and `inventory.js` are: both pack drawers edit a
 * purse in the browser, and that neighbour would bring four hundred lines of
 * RACES and ARCHETYPES along with it.
 *
 * NO COPY HERE, the way `rules/activity.js` has none. This layer knows that
 * `gp` is a denomination and that a purse cannot go below zero; that it is
 * written "GP" and read aloud as "gold" is Maria's, in currency-presentation.js.
 *
 * Every bound here is mirrored by a CHECK constraint in
 * 20260823160000_character_currency.sql. Changing one means changing both.
 */

/**
 * In ascending value, which is the order a character sheet prints them and the
 * order the row is drawn in. Mirrors `is_coin` in the migration.
 */
export const COIN_TYPES = ["cp", "sp", "ep", "gp", "pp"];

/**
 * Mirrors `characters_currency_check`. Well inside int4, with room above it for
 * the sums `move_campaign_currency` adds, and short enough to read at a glance
 * in a capsule — which is what a purse is for.
 */
export const MAX_COINS = 9999999;

export function isCoin(value) {
  return COIN_TYPES.includes(value);
}

/**
 * Clamped rather than refused, the way `parseQuantity` and `parseHitPoints`
 * are: the controls that produce it work over one fixed range, so anything
 * outside it is a paste or a rounding artefact. The CHECK constraint and the
 * functions above it are the checks that count.
 *
 * An empty field is nothing typed, not zero — and zero is a real answer here,
 * being the purse that has just been emptied. `Number("")` is 0, so emptiness
 * is tested first.
 */
export function parseCoins(value) {
  const typed = String(value ?? "").trim();
  const number = Number(typed);

  if (typed === "" || !Number.isFinite(number)) {
    return null;
  }

  return Math.min(MAX_COINS, Math.max(0, Math.round(number)));
}

/** A purse with nothing in it, which is every character's until told otherwise. */
export function emptyPurse() {
  return Object.fromEntries(COIN_TYPES.map((coin) => [coin, 0]));
}

/**
 * A database row reduced to the five numbers the badges draw.
 *
 * Anything unreadable becomes zero rather than `undefined`. It should never
 * happen — the columns are `not null default 0` — and it stands for the case
 * the database is a migration behind the app, where a row without them would
 * otherwise render as "GP undefined".
 */
export function readPurse(row) {
  const purse = emptyPurse();

  for (const coin of COIN_TYPES) {
    const number = Number(row?.[coin]);

    if (Number.isFinite(number)) {
      purse[coin] = Math.min(MAX_COINS, Math.max(0, Math.round(number)));
    }
  }

  return purse;
}

/**
 * Five typed fields at once — the row of capsules a Dungeon Master types a
 * hoard into. `total` is what says a press is a move at all: nothing in every
 * column is not one, and `move_campaign_currency` refuses it for the same
 * reason.
 */
export function parsePurse(input) {
  const coins = emptyPurse();
  let total = 0;

  for (const coin of COIN_TYPES) {
    coins[coin] = parseCoins(input?.[coin]) ?? 0;
    total += coins[coin];
  }

  return { coins, total };
}
