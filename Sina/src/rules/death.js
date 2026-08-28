/**
 * What happens at zero hit points: the three saves, the two ways out, and the
 * blow that skips all of it.
 *
 * Its own module for the reason health.js is one — the party card edits this in
 * the browser, and `rules/character.js` would bring four hundred lines of
 * catalogue with it.
 *
 * EVERY RULE HERE IS MIRRORED BY `roll_death_save`, `apply_damage`,
 * `apply_heal` and `base_armor_class` in 20260909090000 and 20260910090000. This copy is what the card paints with before
 * the answer lands; that one is the run that counts. Changing one means changing
 * both, and death.test.js is what notices when they drift.
 */

import { abilityModifier } from "./skills.js";

/** Three of either ends it. 5e's own numbers. */
export const DEATH_SAVE_TARGET = 3;

/** A natural 20 is back on your feet; a natural 1 costs two failures. */
export const NATURAL_TWENTY = 20;
export const NATURAL_ONE = 1;

/** 10 or better is a success, 2–9 a failure. */
export const DEATH_SAVE_DC = 10;

/** The faces of the die this is rolled on. */
export const DEATH_SAVE_DIE = "d20";

/**
 * The ends an armour class falls between. The floor is 5e's own — nothing is
 * easier to hit than nothing — and the ceiling exists so the column has one:
 * mirrors `characters_armor_class_check`.
 */
export const MIN_ARMOR_CLASS = 0;
export const MAX_ARMOR_CLASS = 99;

/** What everybody starts from before dexterity is counted. 5e's own floor. */
export const DEFAULT_ARMOR_CLASS = 10;

/**
 * The two paths that are harder to hit for wearing nothing. 5e calls it
 * Unarmored Defense and gives each of them a different second ability: a
 * Barbarian's is Constitution, a Monk's is Wisdom.
 */
const UNARMORED_DEFENSE = {
  barbarian: "con",
  monk: "wis",
};

/**
 * What a character is wearing before anybody buys armour: ten, plus dexterity,
 * plus whichever second modifier their path adds.
 *
 * The scores are TOTALS — race counted in — because that is what the sheet
 * prints a modifier from, and counting the racial bonus twice is the mistake
 * `AbilityScores` was already written around.
 *
 * A BASE AND NOT A VALUE. It is what a new row starts at, and what every row
 * goes on being measured from: a figure set by hand is this plus an offset, and
 * `sync_armor_class` carries that offset across every change to the sheet. So a
 * chosen twelve over a base of ten becomes fourteen when the base does — the
 * table said what they are WEARING, not that dexterity stopped counting. See
 * 20260925090000.
 */
export function baseArmorClass({ className, dexTotal, conTotal, wisTotal }) {
  const path = String(className ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const second = { con: conTotal, wis: wisTotal }[UNARMORED_DEFENSE[path]];

  const total =
    DEFAULT_ARMOR_CLASS +
    score(dexTotal) +
    (second === undefined ? 0 : score(second));

  return Math.min(MAX_ARMOR_CLASS, Math.max(MIN_ARMOR_CLASS, total));
}

/** `abilityModifier`, and a score that never arrived is an unmodified ten. */
function score(total) {
  return abilityModifier(figure(total) ?? 10);
}

/**
 * A number, or null — and an EMPTY field is null rather than zero. `Number("")`
 * is 0, and `Number(null)` is 0 as well, so both would otherwise read as an
 * armour class of nothing rather than as a figure that never arrived. The same
 * trap `parseXp` is written around.
 */
function figure(value) {
  const typed = String(value ?? "").trim();
  const number = typed === "" ? Number.NaN : Number(typed);

  return Number.isFinite(number) ? number : null;
}

export function parseArmorClass(value) {
  const number = figure(value);

  return number === null
    ? null
    : Math.min(MAX_ARMOR_CLASS, Math.max(MIN_ARMOR_CLASS, Math.round(number)));
}

const NONE = { successes: 0, failures: 0 };

function tally(value) {
  const number = Number(value);

  return Number.isInteger(number)
    ? Math.min(DEATH_SAVE_TARGET, Math.max(0, number))
    : 0;
}

/**
 * The jsonb column as the card reads it. Clamped rather than refused: the
 * column is written by the four functions above and by nothing else, so a
 * figure outside 0–3 is a database a migration behind rather than an input.
 */
export function readDeathSaves(value) {
  if (!value || typeof value !== "object") {
    return { ...NONE };
  }

  return {
    successes: tally(value.successes),
    failures: tally(value.failures),
  };
}

/** Down but not gone: the one state in which the saves are rolled at all. */
export function isDying(hitPoints, isDead) {
  return !isDead && Number(hitPoints) === 0;
}

/**
 * A blow that carries past the far end of the bar. 5e calls it massive damage:
 * the overflow, not the blow, is measured against the maximum, so a character
 * on 3 of 20 is killed outright by 23 and knocked out by 22.
 */
export function isMassiveDamage({ hitPoints, maxHp, damage }) {
  const from = figure(hitPoints);
  const ceiling = figure(maxHp);
  const blow = figure(damage);

  if (from === null || ceiling === null || blow === null || blow <= 0) {
    return false;
  }

  return from - blow <= -ceiling;
}

/** What one face of the die is worth, before the tallies are counted. */
export function deathSaveOutcome(roll) {
  const face = Number(roll);

  if (face === NATURAL_TWENTY) {
    return "revived";
  }

  if (face === NATURAL_ONE) {
    return "critical_failure";
  }

  return face >= DEATH_SAVE_DC ? "success" : "failure";
}

/**
 * Where a roll leaves a dying character: the two tallies, and whether this was
 * the one that ended it either way.
 *
 * A natural 20 is not a third success — it is a character back on their feet
 * with one hit point, tallies wiped, and it does not matter what they had
 * standing before it.
 */
export function steppedDeathSaves({ successes, failures, roll }) {
  const held = readDeathSaves({ successes, failures });
  const outcome = deathSaveOutcome(roll);

  if (outcome === "revived") {
    return { ...NONE, outcome, revived: true, dead: false };
  }

  if (outcome === "success") {
    const won = held.successes + 1;

    return won >= DEATH_SAVE_TARGET
      ? { ...NONE, outcome, revived: true, dead: false }
      : { ...held, successes: won, outcome, revived: false, dead: false };
  }

  const lost = Math.min(
    DEATH_SAVE_TARGET,
    held.failures + (outcome === "critical_failure" ? 2 : 1),
  );

  return lost >= DEATH_SAVE_TARGET
    ? { ...NONE, outcome, revived: false, dead: true }
    : { ...held, failures: lost, outcome, revived: false, dead: false };
}
