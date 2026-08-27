/**
 * Which two saving throws a path is proficient in, and what one comes to.
 *
 * A path grants exactly two, they never change with a level, and nothing writes
 * them down — so this is derived on read and has no column, no CHECK constraint
 * and no migration behind it. Compare `skills`, which a player chooses and the
 * row therefore carries.
 *
 * THE BONUS IS THE ABILITY'S OWN MODIFIER PLUS THE PROFICIENCY BONUS, and that
 * second half is imported rather than restated: `proficiencyBonus` already
 * bands 1–20 the way the sheet prints it, and a second copy of
 * `floor((level - 1) / 4) + 2` here would be a table to keep in step for
 * nothing.
 *
 * The catalogue is written in the rulebook's own words — "strength", not "str" —
 * so it can be read against the SRD without a decoder beside it, and resolved to
 * this codebase's ability ids at load. A name that resolves to nothing, or a
 * path in ARCHETYPES with no entry, throws on import: a save silently missing
 * from a sheet is not something anybody would notice.
 */

import { ABILITIES, ARCHETYPES } from "./character.js";
import { proficiencyBonus } from "./skills.js";

/**
 * One spelling for a path or an ability, whatever case and punctuation it
 * arrived in: `class_id` holds `arcane_archer`, the sheet prints "Arcane
 * Archer", and "Thief / Rogue" is the name over what the row calls `rogue`.
 */
function key(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Both spellings of each of the six, pointing at the id the row uses. */
const ABILITY_IDS = new Map(
  ABILITIES.flatMap((ability) => [
    [ability.id, ability.id],
    [key(ability.name), ability.id],
  ]),
);

/** `"Wisdom"`, `"wisdom"` or `"wis"` — all three, or null for anything else. */
export function abilityId(value) {
  return ABILITY_IDS.get(key(value)) ?? null;
}

/** The thirteen paths of ARCHETYPES, in the order that file lists them. */
const PROFICIENCIES = {
  barbarian: ["strength", "constitution"],
  fighter: ["strength", "constitution"],
  paladin: ["wisdom", "charisma"],
  wizard: ["intelligence", "wisdom"],
  sorcerer: ["constitution", "charisma"],
  warlock: ["wisdom", "charisma"],
  ranger: ["strength", "dexterity"],
  arcane_archer: ["strength", "constitution"],
  rogue: ["dexterity", "intelligence"],
  monk: ["strength", "dexterity"],
  cleric: ["wisdom", "charisma"],
  druid: ["intelligence", "wisdom"],
  bard: ["dexterity", "charisma"],
};

/**
 * What a path is called where it is not called by its id. `rogue` is printed
 * "Thief / Rogue", so both halves of that name have to land on the same two
 * saves — a caller holding a label rather than a row must not read as a path
 * with no proficiencies at all.
 */
const ALIASES = {
  thief: "rogue",
  thief_rogue: "rogue",
  rogue_thief: "rogue",
};

const BY_PATH = new Map(
  Object.entries(PROFICIENCIES).map(([path, saves]) => [
    path,
    saves.map((name) => {
      const id = abilityId(name);

      if (!id) {
        throw new Error(
          `rules/saving-throws: the ${path} path names no ability "${name}".`,
        );
      }

      return id;
    }),
  ]),
);

/* Fails the import rather than a sheet: a path added to ARCHETYPES without a
   line above would print six abilities and no saves, which reads as a character
   who is proficient in none rather than as a table with a hole in it. */
for (const archetype of ARCHETYPES) {
  for (const path of archetype.paths) {
    if (!BY_PATH.has(path.id)) {
      throw new Error(
        `rules/saving-throws: no saving throws for the ${path.id} path.`,
      );
    }
  }
}

/** The two ability ids this path saves with, or none for an unknown path. */
export function savingThrowsFor(className) {
  const path = key(className);

  return BY_PATH.get(ALIASES[path] ?? path) ?? [];
}

export function isSavingThrowProficient(className, abilityName) {
  const id = abilityId(abilityName);

  return id !== null && savingThrowsFor(className).includes(id);
}

/**
 * The saving throw, or null where the path has no proficiency in it — null and
 * not the bare modifier, because "no bonus" and "the ability's own modifier" are
 * the same number half the time, and only one of them is worth printing.
 */
export function getSavingThrowBonus({
  className,
  abilityName,
  abilityMod,
  level,
}) {
  if (!isSavingThrowProficient(className, abilityName)) {
    return null;
  }

  const modifier = Number(abilityMod);

  return Number.isFinite(modifier)
    ? Math.round(modifier) + proficiencyBonus(level)
    : null;
}
