/**
 * The eighteen skills, and what a character's bonus in one comes to.
 *
 * Its own module for the reason health.js and level.js are: `rules/character.js`
 * carries four hundred lines of catalogues, and the creation sheet's skill grid
 * runs in the browser. `rules/character.js` re-exports what the sheet needs.
 *
 * Ability ids only, never ability names — ABILITIES in rules/character.js is the
 * one place those are written, and the grid groups by asking `skillsForAbility`
 * which skills belong to an id. Constitution has none, and that is the rule
 * rather than an omission.
 */

import { MAX_LEVEL, MIN_LEVEL } from "./level.js";

/** Levels 1–4 are worth +2, and every four levels after that one more. */
export const BASE_PROFICIENCY_BONUS = 2;
const LEVELS_PER_STEP = 4;

/**
 * Clamped rather than refused, the way parseLevel is: a level outside 1–20 is
 * a corrupt row, and a proficiency bonus is the wrong place to report it.
 */
export function proficiencyBonus(level) {
  const number = Math.round(Number(level));
  const clamped = Number.isFinite(number)
    ? Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, number))
    : MIN_LEVEL;

  return (
    Math.floor((clamped - MIN_LEVEL) / LEVELS_PER_STEP) + BASE_PROFICIENCY_BONUS
  );
}

/** In the order the sheet prints them: by ability, alphabetical within. */
export const SKILLS = [
  { id: "athletics", name: "Athletics", ability: "str" },
  { id: "acrobatics", name: "Acrobatics", ability: "dex" },
  { id: "sleight_of_hand", name: "Sleight of Hand", ability: "dex" },
  { id: "stealth", name: "Stealth", ability: "dex" },
  { id: "arcana", name: "Arcana", ability: "int" },
  { id: "history", name: "History", ability: "int" },
  { id: "investigation", name: "Investigation", ability: "int" },
  { id: "nature", name: "Nature", ability: "int" },
  { id: "religion", name: "Religion", ability: "int" },
  { id: "animal_handling", name: "Animal Handling", ability: "wis" },
  { id: "insight", name: "Insight", ability: "wis" },
  { id: "medicine", name: "Medicine", ability: "wis" },
  { id: "perception", name: "Perception", ability: "wis" },
  { id: "survival", name: "Survival", ability: "wis" },
  { id: "deception", name: "Deception", ability: "cha" },
  { id: "intimidation", name: "Intimidation", ability: "cha" },
  { id: "performance", name: "Performance", ability: "cha" },
  { id: "persuasion", name: "Persuasion", ability: "cha" },
];

/**
 * The range a typed-in bonus may hold. Mirrored by `skills_are_valid` in
 * 20260824180000_the_eighteen_skills.sql; changing one means changing both.
 */
export const MIN_SKILL_BONUS = -20;
export const MAX_SKILL_BONUS = 20;

export function skillDetails(id) {
  return SKILLS.find((skill) => skill.id === id) ?? null;
}

export function skillsForAbility(abilityId) {
  return SKILLS.filter((skill) => skill.ability === abilityId);
}

/** Nothing chosen. Skills are optional, so this is what most sheets store. */
export function defaultSkills() {
  return {};
}

/**
 * The field names the grid submits under, so the form and `readSkills` cannot
 * disagree about them.
 */
export function skillFieldName(id) {
  return `skill_${id}`;
}

export function skillBonusFieldName(id) {
  return `${skillFieldName(id)}_bonus`;
}

/**
 * A typed bonus, null for an empty box, NaN for anything that is not a small
 * whole number — refused by validation rather than quietly becoming a value
 * nobody typed, the way readMaxHitPoints refuses.
 */
const BONUS_PATTERN = /^[+-]?[0-9]{1,2}$/;

export function parseSkillBonus(value) {
  const typed = String(value ?? "").trim();

  if (typed === "") {
    return null;
  }

  return BONUS_PATTERN.test(typed) ? Number.parseInt(typed, 10) : Number.NaN;
}

/**
 * Only the skills somebody touched are stored: a proficiency, a bonus typed
 * over the calculated one, or both. An absent skill is the default — not
 * proficient, and worth whatever its ability is worth — so eighteen rows of
 * nothing never travel or persist.
 */
export function readSkills(formData) {
  const skills = {};

  for (const skill of SKILLS) {
    const proficient = formData.get(skillFieldName(skill.id)) !== null;
    const customBonus = parseSkillBonus(
      formData.get(skillBonusFieldName(skill.id)),
    );

    if (proficient || customBonus !== null) {
      skills[skill.id] = { proficient, custom_bonus: customBonus };
    }
  }

  return skills;
}

/**
 * The stored JSONB as the grid holds it, read off a row rather than a form —
 * the edit sheet's way in, the way `abilityScoresOf` is. Unknown keys and
 * malformed entries are dropped: this reads what is in the column, and the
 * column outlives any one version of the catalogue above.
 */
export function skillsOf(row) {
  const stored = row?.skills;

  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return {};
  }

  const skills = {};

  for (const skill of SKILLS) {
    const entry = stored[skill.id];

    if (!entry || typeof entry !== "object") {
      continue;
    }

    const proficient = entry.proficient === true;
    const customBonus = Number.isInteger(entry.custom_bonus)
      ? entry.custom_bonus
      : null;

    if (proficient || customBonus !== null) {
      skills[skill.id] = { proficient, custom_bonus: customBonus };
    }
  }

  return skills;
}

/** What one skill holds, whether or not the map has an entry for it. */
export function skillState(skills, id) {
  const entry = skills?.[id];

  return {
    proficient: entry?.proficient === true,
    custom_bonus: Number.isInteger(entry?.custom_bonus)
      ? entry.custom_bonus
      : null,
  };
}

/**
 * The number on the sheet: the ability, the proficiency bonus if the character
 * is trained, and whatever the player added on top.
 *
 * A typed bonus adds rather than replaces — the box on the creation sheet is
 * empty with a `0` behind it, so what goes in it is the extra a piece of gear
 * or a class feature is worth, and the arithmetic underneath still follows the
 * ability as it changes.
 */
export function skillTotal({
  modifier,
  level,
  proficient = false,
  customBonus = null,
}) {
  const base = Number.isFinite(modifier) ? modifier : 0;
  const extra = Number.isInteger(customBonus) ? customBonus : 0;

  return base + (proficient ? proficiencyBonus(level) : 0) + extra;
}

/**
 * `null` when the sheet may be saved. Skills are optional throughout, so an
 * empty map passes; the only refusals are a key that is not a skill and a bonus
 * outside the range the CHECK constraint also holds.
 *
 * The field is the group rather than one box: the grid highlights as a whole,
 * the way the ability scores do.
 */
export function validateSkills(skills) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
    return { field: "skills", message: "Those skills could not be read." };
  }

  for (const [id, entry] of Object.entries(skills)) {
    const skill = skillDetails(id);

    if (!skill || !entry || typeof entry !== "object") {
      return { field: "skills", message: "That is not a skill on the sheet." };
    }

    if (typeof entry.proficient !== "boolean") {
      return { field: "skills", message: `Choose ${skill.name} or leave it.` };
    }

    const bonus = entry.custom_bonus;

    if (bonus === null) {
      continue;
    }

    if (
      !Number.isInteger(bonus) ||
      bonus < MIN_SKILL_BONUS ||
      bonus > MAX_SKILL_BONUS
    ) {
      return {
        field: "skills",
        message: `${skill.name} must be a whole number between ${MIN_SKILL_BONUS} and ${MAX_SKILL_BONUS}, or empty.`,
      };
    }
  }

  return null;
}
