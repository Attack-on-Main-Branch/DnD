/**
 * The 5e spellcasting matrix: how many slots a class has at a level, which
 * ability it casts with, and the two numbers at the top of a caster's sheet.
 *
 * The four tables below are mirrored by `spell_slot_maximum` in
 * 20260826090000_spell_slots.sql. Changing one means changing both — the
 * database derives a maximum for itself on every write, and a table that
 * disagreed would refuse casts the bar was still offering.
 */

import { parseLevel } from "./level.js";
import { abilityModifier, proficiencyBonus } from "./skills.js";
import { CANTRIP_LEVEL, MAX_SPELL_LEVEL } from "./spells.js";

/** A slot is 1st through 9th. A cantrip costs none, which is why 0 is absent. */
export const SLOT_LEVELS = Array.from(
  { length: MAX_SPELL_LEVEL },
  (_, index) => index + 1,
);

/**
 * Rows are character levels 1 to 20; each row is how many slots that level has
 * at spell levels 1, 2, 3… A short row is the rest zero.
 */
const FULL_CASTER = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Paladin and Ranger: nothing at 1st, and never past 5th-level slots. */
const HALF_CASTER = [
  [],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

/** Nothing until 3rd, and never past 4th-level slots. */
const THIRD_CASTER = [
  [],
  [],
  [2],
  [3],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
];

/**
 * Pact Magic is a different shape from the other three: a Warlock's slots are
 * all at one level. `[how many, at what level]` per character level.
 */
const PACT_MAGIC = [
  [1, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 3],
  [2, 3],
  [2, 4],
  [2, 4],
  [2, 5],
  [2, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [4, 5],
  [4, 5],
  [4, 5],
  [4, 5],
];

/**
 * Which table a path reads from. The ids are `rules/character.js`'s own; this
 * module does not import that catalogue — it would put four hundred lines of
 * RACES in the browser — so `spellcasting.test.js` keeps the two in step.
 *
 * `arcane_archer` is the third caster: 5e gives that table to the Eldritch
 * Knight and the Arcane Trickster, and this app's paths carry neither.
 * Barbarian, Fighter, Rogue and Monk are absent on purpose and cast nothing.
 */
export const CASTER_KINDS = {
  wizard: "full",
  sorcerer: "full",
  cleric: "full",
  druid: "full",
  bard: "full",
  paladin: "half",
  ranger: "half",
  arcane_archer: "third",
  warlock: "pact",
};

const TABLES = {
  full: FULL_CASTER,
  half: HALF_CASTER,
  third: THIRD_CASTER,
};

export const SPELLCASTING_ABILITIES = {
  wizard: "int",
  arcane_archer: "int",
  cleric: "wis",
  druid: "wis",
  ranger: "wis",
  sorcerer: "cha",
  bard: "cha",
  warlock: "cha",
  paladin: "cha",
};

export function casterKind(classId) {
  return CASTER_KINDS[classId] ?? null;
}

export function spellcastingAbility(classId) {
  return SPELLCASTING_ABILITIES[classId] ?? null;
}

const NO_SLOTS = Object.freeze(
  Object.fromEntries(SLOT_LEVELS.map((slot) => [slot, 0])),
);

/**
 * `{ 1: 4, 2: 3, … 9: 0 }` — every slot level, so a caller can read one without
 * asking whether it is there. A class that casts nothing is all zeros rather
 * than null: one fewer branch at every call site.
 */
export function getMaxSpellSlots(className, level) {
  const kind = casterKind(className);
  const rung = parseLevel(level);

  if (!kind || rung === null) {
    return { ...NO_SLOTS };
  }

  if (kind === "pact") {
    const [count, slot] = PACT_MAGIC[rung - 1];

    return { ...NO_SLOTS, [slot]: count };
  }

  const row = TABLES[kind][rung - 1] ?? [];
  const slots = { ...NO_SLOTS };

  row.forEach((count, index) => {
    slots[index + 1] = count;
  });

  return slots;
}

/** The slot levels this character actually has, in reading order. */
export function availableSlotLevels(className, level) {
  const maxima = getMaxSpellSlots(className, level);

  return SLOT_LEVELS.filter((slot) => maxima[slot] > 0);
}

/**
 *   Spell Save DC        = 8 + proficiency bonus + spellcasting modifier
 *   Spell Attack Modifier =     proficiency bonus + spellcasting modifier
 *
 * The `_total` ability column and not the base one: it is the score after the
 * racial bonus, which is what the rest of the sheet prints a modifier from.
 * Null for anybody who casts nothing — the header draws neither rather than
 * "DC 8".
 */
export function readSpellcasting(character) {
  const ability = spellcastingAbility(character?.class_id);
  const score = ability ? character?.[`ability_${ability}_total`] : null;
  const rung = parseLevel(character?.level);

  if (!ability || rung === null || typeof score !== "number") {
    return null;
  }

  const proficiency = proficiencyBonus(rung);
  const modifier = abilityModifier(score);

  return {
    ability,
    score,
    modifier,
    proficiency,
    saveDC: 8 + proficiency + modifier,
    attackBonus: proficiency + modifier,
  };
}

/**
 * The stored `spell_slots` column, read against what this class and level
 * actually grant.
 *
 * The maximum is DERIVED and the stored one is not believed: a character who
 * levelled up since their last cast has a snapshot one row behind, and the bar
 * has to show the slot they just gained. `used` is clamped for the opposite
 * case, a level taken back.
 */
export function readSpellSlots(stored, className, level) {
  const maxima = getMaxSpellSlots(className, level);
  const held = stored && typeof stored === "object" ? stored : {};

  return availableSlotLevels(className, level).map((slot) => {
    const max = maxima[slot];
    const raw = Number(held[slot]?.used ?? 0);
    const used = Number.isFinite(raw) ? Math.min(max, Math.max(0, raw)) : 0;

    return { level: slot, used, max, remaining: max - used };
  });
}

/** How many slots are left, over the whole sheet. What the mark counts. */
export function remainingSlots(stored, className, level) {
  return readSpellSlots(stored, className, level).reduce(
    (left, slot) => left + slot.remaining,
    0,
  );
}

/**
 * Which slots a spell may be cast from: its own level and every one above it
 * this character has. A spent level is kept in the list so the control can show
 * it disabled — it is what the caster is looking for. A cantrip gets an empty
 * list: it is not cast from a slot at all.
 */
export function castableSlots(spellLevel, stored, className, level) {
  const spell = Number(spellLevel);

  if (!Number.isInteger(spell) || spell <= CANTRIP_LEVEL) {
    return [];
  }

  return readSpellSlots(stored, className, level).filter(
    (slot) => slot.level >= spell,
  );
}
