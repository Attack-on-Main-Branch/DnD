/**
 * What a character's hit points come to, from the three facts that decide them:
 * the path they walk, the rung they are on, and their Constitution.
 *
 * Nobody types a maximum any more — it was a box on the sheet and it drifted —
 * so every door that can move one of the three recomputes through
 * `max_hp_for` in 20260907090000, which is the run that counts.
 *
 * THE AVERAGE AND NOT THE ROLL: one bad roll carried for twenty levels is why
 * 5e offers the average, and it is the only one a shared sheet can hold.
 */

import { MAX_LEVEL, parseLevel } from "./level.js";
import { abilityModifier } from "./skills.js";

/**
 * Every path, under the die its archetype rolls. The ids are
 * `rules/character.js`'s own and this module must not import that catalogue —
 * it would bring the RACES — so hp.test.js keeps the two in step, as
 * spellcasting.test.js does for `CASTER_KINDS`.
 */
const HIT_DICE = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  wizard: 6,
  sorcerer: 6,
  warlock: 8,
  ranger: 10,
  arcane_archer: 10,
  rogue: 8,
  monk: 8,
  cleric: 8,
  druid: 8,
  bard: 8,
};

/** Spellings that are not ids: the labels a card prints, and the SRD's words. */
const ALSO_KNOWN_AS = {
  "arcane archer": "arcane_archer",
  thief: "rogue",
  "thief / rogue": "rogue",
  "thief/rogue": "rogue",
};

/** How many faces this path's die has, or null for one nobody walks. */
export function hitDie(className) {
  const named = String(className ?? "")
    .toLowerCase()
    .trim();

  return HIT_DICE[ALSO_KNOWN_AS[named] ?? named] ?? null;
}

/**
 * Half the die rounded up, plus the modifier — and never less than one: a d6
 * caster with a poor Constitution would otherwise lose hit points by climbing,
 * which 5e's own errata is about.
 */
function gainPerLevel(faces, conMod) {
  return Math.max(1, faces / 2 + 1 + conMod);
}

/**
 * The whole figure, from scratch, every time — which is what makes Constitution
 * RETROACTIVE: a score raised at 8th is worth its modifier on all eight rungs,
 * because none of them was ever banked.
 *
 * `conScore` is the TOTAL, after the racial bonus, as the rest of the sheet
 * prints modifiers from. Null for a path this app does not offer.
 */
export function calculateMaxHP({ className, level, conScore }) {
  const faces = hitDie(className);
  const rung = parseLevel(level);
  const con = Number(conScore);

  if (faces === null || rung === null || !Number.isInteger(con)) {
    return null;
  }

  const conMod = abilityModifier(con);

  return Math.max(1, faces + conMod + (rung - 1) * gainPerLevel(faces, conMod));
}

/** 15 bought and 2 for a Dwarf. hp.test.js keeps it in step with the catalogue. */
const MAX_CON_TOTAL = 17;

/** A character with none is a body, not a character. */
export const MIN_MAX_HP = 1;

/**
 * The ceiling, DERIVED rather than chosen: a Barbarian at 20th with that
 * Constitution, which is 205. Mirrored by `characters_max_hp_check` — a bigger
 * die moves this number and the migration with it.
 */
export const MAX_HP = calculateMaxHP({
  className: "barbarian",
  level: MAX_LEVEL,
  conScore: MAX_CON_TOTAL,
});
