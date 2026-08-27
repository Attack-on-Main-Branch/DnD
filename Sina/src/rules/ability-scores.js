/**
 * What a table may set a score to, as opposed to what a player may buy.
 *
 * `rules/character` owns the purchase: 7..15 under a fifteen-point budget, both
 * mirrored by CHECK constraints because `update_character` is an RPC anyone
 * authenticated can call. Neither has anything to say about a Dungeon Master
 * handing somebody a belt of giant strength, so the award is its own column and
 * these are its own ends — 5e's outer range for a score, 1 to 30.
 *
 * Mirrors the bounds in 20260917090000_a_score_the_table_sets.sql. Its own
 * module, and free of the catalogues, because the field that types one runs in
 * the browser; ability-scores.test.js keeps ABILITY_IDS in step with ABILITIES.
 */

export const ABILITY_IDS = ["str", "dex", "con", "int", "wis", "cha"];

export const MIN_ABILITY_TOTAL = 1;
export const MAX_ABILITY_TOTAL = 30;

export function isAbilityId(value) {
  return ABILITY_IDS.includes(String(value ?? ""));
}

/** Clamped rather than refused, the way `parseArmorClass` is: a 300 is a stuck
    key. Null for anything that is not a figure at all. */
export function parseAbilityTotal(value) {
  const typed = String(value ?? "").trim();
  const number = typed === "" ? Number.NaN : Number(typed);

  return Number.isFinite(number)
    ? Math.min(
        MAX_ABILITY_TOTAL,
        Math.max(MIN_ABILITY_TOTAL, Math.round(number)),
      )
    : null;
}
