/**
 * The numbers a sheet carries that are not scores, not skills and not hit
 * points: what a character rolls for initiative, how far they walk, what they
 * notice without looking, how big they are, and what they are trained to hold.
 *
 * ALL OF IT IS DERIVED. Nothing here has a column — the six scores, the level,
 * the race and the path decide every figure below, which is why this is a rules
 * module and not a table. The one exception is the hit dice a rest has spent,
 * which is a tally and does have one.
 *
 * NOTHING HERE ROLLS ANYTHING. Initiative is a bonus printed on a card; the
 * dice rail beside the map is where a table throws it, with the same handful
 * everybody else can see land.
 *
 * Its own module for the reason skills.js and hp.js are: the drawer renders in
 * the browser, and `rules/character.js` would bring four hundred lines of
 * catalogue with it. RACES is mirrored below rather than imported for exactly
 * that, and character-stats.test.js is what keeps the two in step.
 */

import { hitDie } from "./hp.js";
import { abilityModifier, proficiencyBonus, skillState } from "./skills.js";

/** 5e's own two speeds among the races this app offers. Feet. */
export const DEFAULT_SPEED = 30;
const SLOW_SPEED = 25;

/** The stout and the small. Everybody else walks thirty. */
const SLOW_RACES = ["Dwarf", "Halfling", "Gnome"];

/** And the small. Everybody else is Medium. */
const SMALL_RACES = ["Halfling", "Gnome"];

export const SIZES = ["Small", "Medium"];

/** What passive anything starts from before the ability is counted. */
const PASSIVE_BASE = 10;

/** The skill a passive perception is read off. Mirrors SKILLS in skills.js. */
const PERCEPTION = "perception";

function normalise(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Case and punctuation forgiven, so a label reads the same as a stored race. */
function race(value) {
  const key = normalise(value);

  return {
    slow: SLOW_RACES.some((one) => normalise(one) === key),
    small: SMALL_RACES.some((one) => normalise(one) === key),
  };
}

/** Dexterity, and nothing else. 5e is that simple about it. */
export function initiativeBonus(dexTotal) {
  return abilityModifier(figure(dexTotal) ?? 10);
}

export function movementSpeed(raceName) {
  return race(raceName).slow ? SLOW_SPEED : DEFAULT_SPEED;
}

export function characterSize(raceName) {
  return race(raceName).small ? "Small" : "Medium";
}

/**
 * Ten, plus Wisdom, plus the proficiency bonus for anybody trained in
 * Perception. `skills` is the row's own jsonb, read through `skillState` so
 * this and the skill list on the sheet cannot disagree about who is proficient.
 */
export function passivePerception({ wisTotal, level, skills }) {
  const trained = skillState(skills, PERCEPTION).proficient;

  return (
    PASSIVE_BASE +
    abilityModifier(figure(wisTotal) ?? 10) +
    (trained ? proficiencyBonus(level) : 0)
  );
}

/**
 * The pool a short rest is spent out of: one die per rung, of whatever size the
 * path rolls. `spent` is the tally on the row.
 *
 * `die` is null for a path the catalogue does not hold, and then there is no
 * pool to draw — the same answer `hitDie` gives, and the same one `max_hp_for`
 * reads as "leave this row alone".
 */
export function hitDicePool({ classId, level, spent = 0 }) {
  const faces = hitDie(classId);
  const max = Math.min(20, Math.max(0, Math.round(figure(level) ?? 1)));
  const used = Math.min(max, Math.max(0, Math.round(figure(spent) ?? 0)));

  return {
    die: faces === null ? null : `d${faces}`,
    faces,
    max,
    spent: used,
    remaining: max - used,
  };
}

/** `2 / 3 d10`, or null where the path rolls nothing this app knows about. */
export function hitDiceLabel(pool) {
  return pool.die === null
    ? null
    : `${pool.remaining} / ${pool.max} ${pool.die}`;
}

/**
 * How many hit dice a long rest hands back: half the rung, and never none.
 * Mirrors `trigger_rest`.
 */
export function hitDiceRegained(level) {
  const rung = Math.max(1, Math.round(figure(level) ?? 1));

  return Math.max(1, Math.floor(rung / 2));
}

/**
 * What every path is trained to wear, hold and use, split the three ways the
 * drawer prints them.
 *
 * Written out per path rather than composed from "martial" and "simple" sets:
 * the interesting half of this table is the exceptions — a Rogue's four named
 * blades, a Druid's refusal of metal — and a composed table would hide them
 * behind a spread. The ids are `rules/character.js`'s own.
 */
const PROFICIENCIES = {
  barbarian: {
    armor: ["Light Armor", "Medium Armor", "Shields"],
    weapons: ["Simple Weapons", "Martial Weapons"],
    tools: [],
  },
  fighter: {
    armor: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weapons: ["Simple Weapons", "Martial Weapons"],
    tools: [],
  },
  paladin: {
    armor: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weapons: ["Simple Weapons", "Martial Weapons"],
    tools: [],
  },
  arcane_archer: {
    armor: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    weapons: ["Simple Weapons", "Martial Weapons"],
    tools: [],
  },
  ranger: {
    armor: ["Light Armor", "Medium Armor", "Shields"],
    weapons: ["Simple Weapons", "Martial Weapons"],
    tools: [],
  },
  rogue: {
    armor: ["Light Armor"],
    weapons: [
      "Simple Weapons",
      "Hand Crossbows",
      "Longswords",
      "Rapiers",
      "Shortswords",
    ],
    tools: ["Thieves’ Tools"],
  },
  monk: {
    armor: [],
    weapons: ["Simple Weapons", "Shortswords"],
    tools: [],
  },
  cleric: {
    armor: ["Light Armor", "Medium Armor", "Shields"],
    weapons: ["Simple Weapons"],
    tools: [],
  },
  druid: {
    armor: ["Light Armor", "Medium Armor", "Shields"],
    weapons: [
      "Clubs",
      "Daggers",
      "Darts",
      "Javelins",
      "Maces",
      "Quarterstaffs",
      "Scimitars",
      "Sickles",
      "Slings",
      "Spears",
    ],
    tools: ["Herbalism Kit"],
  },
  bard: {
    armor: ["Light Armor"],
    weapons: [
      "Simple Weapons",
      "Hand Crossbows",
      "Longswords",
      "Rapiers",
      "Shortswords",
    ],
    tools: ["Three Musical Instruments"],
  },
  wizard: {
    armor: [],
    weapons: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
    tools: [],
  },
  sorcerer: {
    armor: [],
    weapons: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
    tools: [],
  },
  warlock: {
    armor: ["Light Armor"],
    weapons: ["Simple Weapons"],
    tools: [],
  },
};

/** The names a path is written under elsewhere. `hitDie` carries the same set. */
const ALIASES = {
  "arcane archer": "arcane_archer",
  thief: "rogue",
  thief_rogue: "rogue",
  rogue_thief: "rogue",
};

/**
 * A Druid's armour is the one entry in that table with a condition on it, and
 * the condition is the whole character of the class.
 */
const QUALIFIERS = {
  druid: { armor: "non-metal" },
};

const NONE = { armor: [], weapons: [], tools: [] };

/** Whatever a table has written down on top of what the path grants. */
export function readCustomProficiencies(value) {
  if (!value || typeof value !== "object") {
    return { ...NONE };
  }

  return {
    armor: list(value.armor),
    weapons: list(value.weapons),
    tools: list(value.tools),
  };
}

/**
 * Strings, deduplicated, bounded — and nothing that is not one. A number is
 * dropped rather than stringified: this is jsonb written from a browser, and a
 * `4` in the list is a bug somewhere rather than a proficiency called "4".
 */
function list(values) {
  const kept = [];

  for (const entry of Array.isArray(values) ? values : []) {
    if (typeof entry !== "string") {
      continue;
    }

    const text = entry.replace(/\s+/g, " ").trim().slice(0, 60);

    if (text && !kept.includes(text)) {
      kept.push(text);
    }
  }

  return kept.slice(0, 24);
}

/**
 * The three lists a drawer prints, the path's own plus anything written on top.
 *
 * `qualifier` rides beside the armour list rather than being folded into each
 * name: "Light Armor (non-metal)" three times is the same sentence said three
 * times, and the condition is about the whole line.
 */
export function proficienciesFor(classId, custom) {
  const key = normalise(classId);
  const path = PROFICIENCIES[ALIASES[key] ?? key] ?? NONE;
  const extra = readCustomProficiencies(custom);

  return {
    armor: merge(path.armor, extra.armor),
    weapons: merge(path.weapons, extra.weapons),
    tools: merge(path.tools, extra.tools),
    qualifier: QUALIFIERS[ALIASES[key] ?? key] ?? null,
  };
}

function merge(granted, written) {
  return list([...granted, ...written]);
}

/**
 * Everything above for one row, in one call. The drawer asks once and prints
 * five tiles and two lists from the answer.
 */
export function characterVitals(character) {
  const level = character?.level;

  return {
    initiative: initiativeBonus(character?.ability_dex_total),
    speed: movementSpeed(character?.race),
    passivePerception: passivePerception({
      wisTotal: character?.ability_wis_total,
      level,
      skills: character?.skills,
    }),
    size: characterSize(character?.race),
    hitDice: hitDicePool({
      classId: character?.class_id,
      level,
      spent: character?.hit_dice_spent,
    }),
    proficiencies: proficienciesFor(
      character?.class_id,
      character?.custom_proficiencies,
    ),
  };
}

/** A number, or null — and an empty field is null rather than zero. */
function figure(value) {
  const typed = String(value ?? "").trim();
  const number = typed === "" ? Number.NaN : Number(typed);

  return Number.isFinite(number) ? number : null;
}
