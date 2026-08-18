/**
 * What a character is, and what makes one valid.
 *
 * Imported by both the creation form and the Server Action, so the browser and
 * the server cannot disagree about what is allowed. The browser's copy is for
 * speed; this one is the check that counts.
 *
 * Nothing here knows how any of it looks. Colours are slugs, not CSS — the
 * backend decides which colours exist, the frontend decides what they look
 * like.
 */

import { countCharacters, readProse } from "./text.js";

export { countCharacters };

export const MAX_CHARACTERS = 3;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 40;
export const MAX_PROSE_LENGTH = 2000;

/*
 * No MIN_LEVEL / MAX_LEVEL here. There were two such constants, exported and
 * imported by nobody: `level` is never read off the form, never written by
 * insertCharacter and never checked by validateCharacter — it is set by the
 * column default and bounded by `characters_level_check` in the migrations, and
 * the app only ever displays it. A rule this file does not apply does not
 * belong in this file, whose header promises the opposite. When level becomes
 * editable, the bound comes back beside the validation that enforces it.
 */

/** Human first by request; the rest of the Player's Handbook set follows. */
export const RACES = [
  "Human",
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Halfling",
  "Tiefling",
];

/**
 * The class catalogue, two levels deep: five archetypes, each holding the paths
 * that belong to it. What gets stored is both — the archetype because it is
 * what the character *is* at a glance, the path because it is the actual class.
 *
 * Two steps rather than one flat list of thirteen. The archetype is the choice
 * most people have already made before they open the sheet ("something that
 * hits things"), and answering it first turns a wall of thirteen into a row of
 * five and then a row of two or three.
 *
 * No colours and no shapes here, per this file's contract: which archetypes
 * exist is a rule, what a Warrior's emblem looks like is not.
 */
export const ARCHETYPES = [
  {
    id: "warrior",
    name: "Warrior",
    blurb:
      "Defender of the front line. Heavy armour, heavier weapons, no retreat.",
    paths: [
      {
        id: "barbarian",
        name: "Barbarian",
        blurb: "Raw damage, rage, and a two-handed weapon.",
      },
      {
        id: "fighter",
        name: "Fighter",
        blurb: "The classic soldier: shield up, line held.",
      },
      {
        id: "paladin",
        name: "Paladin",
        blurb: "A holy warrior who heals as readily as they smite.",
      },
    ],
  },
  {
    id: "mage",
    name: "Mage",
    blurb:
      "Master of the arcane. Elemental ruin, delivered from across the field.",
    paths: [
      {
        id: "wizard",
        name: "Wizard",
        blurb:
          "A versatile tactician who learns from books, and breaks easily.",
      },
      {
        id: "sorcerer",
        name: "Sorcerer",
        blurb: "Pure destruction — the magic is already in their blood.",
      },
      {
        id: "warlock",
        name: "Warlock",
        blurb: "A dark bargainer, bound by an otherworldly pact.",
      },
    ],
  },
  {
    id: "archer",
    name: "Archer",
    blurb:
      "Hunter of the wild. Lethal precision from a safe distance, every shot.",
    paths: [
      {
        id: "ranger",
        name: "Ranger",
        blurb: "Master of the wilds: bow, traps and an animal companion.",
      },
      {
        id: "arcane_archer",
        name: "Arcane Archer",
        blurb: "A magical archer, with elemental and trick arrows.",
      },
    ],
  },
  {
    id: "assassin",
    name: "Assassin",
    blurb:
      "A killer out of the shadows. Stealth, misdirection, and sudden ends.",
    paths: [
      {
        id: "rogue",
        name: "Thief / Rogue",
        blurb: "A cunning thief who strikes hardest from behind.",
      },
      {
        id: "monk",
        name: "Monk",
        blurb: "Fast and unarmed, moving where armour cannot.",
      },
    ],
  },
  {
    id: "priest",
    name: "Priest",
    blurb:
      "Herald of the gods. Holy light, healing, and the party kept upright.",
    paths: [
      {
        id: "cleric",
        name: "Cleric",
        blurb: "An armoured healer with holy magic and a mace.",
      },
      {
        id: "druid",
        name: "Druid",
        blurb: "Keeper of nature, who becomes the beast.",
      },
      {
        id: "bard",
        name: "Bard",
        blurb: "The heart of the party, working through song.",
      },
    ],
  },
];

/**
 * Listed in reading order for a 3×3 grid: lawful/neutral/chaotic across,
 * good/neutral/evil down.
 *
 * The film characters are conversation starters, not doctrine — half of them
 * are argued about endlessly, which is rather the point.
 */
export const ALIGNMENTS = [
  {
    value: "lawful_good",
    label: "Lawful Good",
    description:
      "Acts as a good crusader. Follows a strict moral and social code to help people.",
    examples: ["Superman", "Captain America", "Wonder Woman"],
  },
  {
    value: "neutral_good",
    label: "Neutral Good",
    description:
      "Acts as a benefactor. Does the right thing without strict adherence to rules.",
    examples: ["Luke Skywalker", "Spider-Man", "Gandalf"],
  },
  {
    value: "chaotic_good",
    label: "Chaotic Good",
    description:
      "Acts as a rebel. Follows a good heart and personal freedom, fighting unfair authority.",
    examples: ["Han Solo", "Robin Hood", "Sonic"],
  },
  {
    value: "lawful_neutral",
    label: "Lawful Neutral",
    description:
      "Acts as a judge. Values order, law, and traditions above specific moral debates.",
    examples: ["Judge Dredd", "RoboCop", "Agent K"],
  },
  {
    value: "true_neutral",
    label: "True Neutral",
    description:
      "Acts as an unaligned or balanced observer. Avoids taking strong moral sides.",
    examples: ["Treebeard", "The Oracle", "Bilbo Baggins"],
  },
  {
    value: "chaotic_neutral",
    label: "Chaotic Neutral",
    description:
      "Acts as a free spirit. Follows whims and personal liberty with no grand moral plan.",
    examples: ["Jack Sparrow", "The Dude", "Deadpool"],
  },
  {
    value: "lawful_evil",
    label: "Lawful Evil",
    description:
      "Acts as a tyrant or dominator. Uses rules, hierarchy, and codes of conduct to exploit others.",
    examples: ["Darth Vader", "Hans Landa", "Dolores Umbridge"],
  },
  {
    value: "neutral_evil",
    label: "Neutral Evil",
    description:
      "Acts as a pure malfactor. Does whatever works best for personal survival and gain.",
    examples: ["Lord Voldemort", "Gordon Gekko", "Scar"],
  },
  {
    value: "chaotic_evil",
    label: "Chaotic Evil",
    description:
      "Acts as a destroyer. Driven by unbridled greed, hatred, and random violence.",
    examples: ["The Joker", "Bellatrix Lestrange", "Freddy Krueger"],
  },
];

/**
 * The twelve avatar colours, as stored. Must stay in step with the
 * `characters_color_theme_check` constraint in the migrations.
 */
export const AVATAR_COLOR_VALUES = [
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "violet",
  "fuchsia",
  "pink",
];

export const DEFAULT_AVATAR_COLOR = "violet";

const DISCRIMINATOR_PATTERN = /^[0-9]{4}$/;

/**
 * Undoes the line-break rewrite that form submission applies, so what gets
 * measured is what the user typed.
 *
 * A textarea keeps two versions of its contents. The API value — what
 * `.value` returns, what the on-screen counter reads, and what `maxlength`
 * counts — normalises every line break to a single LF. The submission value,
 * which is what lands in FormData, normalises them to CRLF instead. So each
 * time the user pressed Enter, the string this function receives is one
 * character longer than the one the browser let them type.
 *
 * That is the whole of the "2000 characters, or a bit less, is rejected as
 * over 2000" bug: the real ceiling was 2000 minus the number of paragraph
 * breaks, while the counter above the box cheerfully read 1985/2000.
 *
 * `\r\n?` rather than `\r\n`, because this also runs on the server against a
 * request nobody has to have built with a browser, and a lone CR should not
 * survive into the database either.
 */
/*
 * Both moved to ./text.js when campaigns arrived and needed the same two rules.
 * `countCharacters` is re-exported above rather than re-homed, so the form that
 * imports it from `sina/rules/character` keeps working — it counts a character
 * sheet's fields, and that is still where it belongs in the reader's head.
 */

export function archetypeDetails(id) {
  return ARCHETYPES.find((entry) => entry.id === id) ?? null;
}

/**
 * Finds a path by its own id, without needing to be told the archetype.
 *
 * Path ids are unique across the whole catalogue, which is what lets a stored
 * `class_id` stand on its own — the archetype is stored too, but as a
 * convenience for reading rather than as part of the key.
 *
 * @returns {{archetype: object, path: object} | null}
 */
export function classDetails(classId) {
  for (const archetype of ARCHETYPES) {
    const path = archetype.paths.find((entry) => entry.id === classId);

    if (path) {
      return { archetype, path };
    }
  }

  return null;
}

/** "Thief / Rogue", or null for the characters made before classes existed. */
export function classLabel(classId) {
  return classDetails(classId)?.path.name ?? null;
}

export function alignmentLabel(value) {
  return ALIGNMENTS.find((entry) => entry.value === value)?.label ?? value;
}

export function alignmentDetails(value) {
  return ALIGNMENTS.find((entry) => entry.value === value) ?? null;
}

/** Name#0451 — the handle a DM will use to invite this character to a party. */
export function characterHandle({ name, discriminator }) {
  return `${name}#${discriminator}`;
}

/**
 * The six ability scores, in the order every character sheet prints them.
 *
 * `id` is what the column and the form field are called; `abbr` is what the
 * card shows. No colours and no glyphs here, per this file's contract — which
 * ability exists is a rule, what Strength's emblem looks like is not.
 */
export const ABILITIES = [
  { id: "str", name: "Strength", abbr: "STR" },
  { id: "dex", name: "Dexterity", abbr: "DEX" },
  { id: "con", name: "Constitution", abbr: "CON" },
  { id: "int", name: "Intelligence", abbr: "INT" },
  { id: "wis", name: "Wisdom", abbr: "WIS" },
  { id: "cha", name: "Charisma", abbr: "CHA" },
];

export const ABILITY_BASELINE = 10;
export const MIN_ABILITY = 7;
export const MAX_ABILITY = 15;
export const ABILITY_BUDGET = 15;

/**
 * What each score costs, counted from the baseline rather than per step.
 *
 * Cumulative on purpose. A per-step table has to be summed to answer "how much
 * has this character spent", and summing a stepwise cost is where an
 * off-by-one lives; here the spend is a lookup and the step price is the
 * difference between two neighbours. The curve steepens above 13 — the last
 * two points cost 2 each — which is what stops every character being a 15 in
 * their favourite score and a 7 in everything else.
 *
 * Negative entries are refunds: dropping to 7 hands back 3 points to spend
 * elsewhere.
 */
const ABILITY_COST = {
  7: -3,
  8: -2,
  9: -1,
  10: 0,
  11: 1,
  12: 2,
  13: 3,
  14: 5,
  15: 7,
};

/** Every score at the baseline, which is what an untouched sheet starts as. */
export function defaultAbilityScores() {
  return Object.fromEntries(
    ABILITIES.map((ability) => [ability.id, ABILITY_BASELINE]),
  );
}

/** Points spent across all six. Unknown scores count as nothing. */
export function abilitySpend(scores) {
  return ABILITIES.reduce(
    (total, ability) => total + (ABILITY_COST[scores?.[ability.id]] ?? 0),
    0,
  );
}

export function abilityPointsRemaining(scores) {
  return ABILITY_BUDGET - abilitySpend(scores);
}

/** What the next point up costs, or null at the ceiling. */
export function abilityRaiseCost(score) {
  if (!Number.isInteger(score) || score >= MAX_ABILITY) {
    return null;
  }

  return ABILITY_COST[score + 1] - ABILITY_COST[score];
}

/** What giving a point back hands over, or null at the floor. */
export function abilityLowerRefund(score) {
  if (!Number.isInteger(score) || score <= MIN_ABILITY) {
    return null;
  }

  return ABILITY_COST[score] - ABILITY_COST[score - 1];
}

/**
 * Whether the stepper's buttons are live.
 *
 * Raising asks two questions — is there room, and is there budget — and the
 * second is why this takes the whole set rather than one score: the price of a
 * point depends on where that score already is, and whether it is affordable
 * depends on what the other five have spent.
 */
export function canRaiseAbility(scores, id) {
  const cost = abilityRaiseCost(scores?.[id]);

  return cost !== null && cost <= abilityPointsRemaining(scores);
}

export function canLowerAbility(scores, id) {
  return abilityLowerRefund(scores?.[id]) !== null;
}

/**
 * What each race adds, applied on top of the bought score.
 *
 * Mirrored by the generated total columns in
 * 20260817090000_ability_scores.sql, the same pairing `race` itself already
 * has with `characters_race_check` — changing a line here means a migration.
 *
 * Wisdom deliberately appears nowhere: none of the nine grants it. It still
 * gets a total column and a card, because a sheet with five abilities on it
 * is not a sheet.
 */
export const RACE_ABILITY_BONUSES = {
  Human: { str: 1, dex: 1, con: 1 },
  Dragonborn: { str: 2, cha: 1 },
  Dwarf: { con: 2, str: 1 },
  Elf: { dex: 2, int: 1 },
  Gnome: { int: 2, dex: 1 },
  "Half-Elf": { cha: 2, dex: 1 },
  "Half-Orc": { str: 2, con: 1 },
  Halfling: { dex: 2, cha: 1 },
  Tiefling: { cha: 2, int: 1 },
};

export function raceAbilityBonus(race, abilityId) {
  return RACE_ABILITY_BONUSES[race]?.[abilityId] ?? 0;
}

/** Base plus race — the number the character actually plays with. */
export function abilityTotal(race, abilityId, score) {
  return (score ?? ABILITY_BASELINE) + raceAbilityBonus(race, abilityId);
}

/** The D&D modifier: every two points above 10 is worth one. */
export function abilityModifier(total) {
  return Math.floor((total - 10) / 2);
}

/** Modifiers are always written signed, `+0` included. */
export function formatModifier(modifier) {
  return `${modifier >= 0 ? "+" : ""}${modifier}`;
}

/**
 * The six as the sheet wants them: base, what the race added, the total and
 * its modifier, in printing order.
 */
export function abilityBreakdown(race, scores) {
  return ABILITIES.map((ability) => {
    const base = scores?.[ability.id] ?? ABILITY_BASELINE;
    const bonus = raceAbilityBonus(race, ability.id);
    const total = base + bonus;

    return {
      ...ability,
      base,
      bonus,
      total,
      modifier: abilityModifier(total),
    };
  });
}

export function readAbilityScores(formData) {
  return Object.fromEntries(
    ABILITIES.map((ability) => [
      ability.id,
      // Deliberately not defaulted. A missing or mangled field has to reach
      // validation as NaN and be refused, rather than quietly becoming a 10
      // that the user never chose and the budget never charged for.
      Number.parseInt(String(formData.get(`ability_${ability.id}`) ?? ""), 10),
    ]),
  );
}

/**
 * @returns {{field: string, message: string} | null}
 *
 * Two separate refusals, because they are two different mistakes: a score out
 * of range is a broken payload, while an overspend is a sheet somebody could
 * plausibly have built by hand. Leftover points are allowed — the stepper lets
 * you stop early, and nothing downstream cares.
 */
export function validateAbilityScores(scores) {
  for (const ability of ABILITIES) {
    const score = scores?.[ability.id];

    if (
      !Number.isInteger(score) ||
      score < MIN_ABILITY ||
      score > MAX_ABILITY
    ) {
      return {
        field: `ability_${ability.id}`,
        message: `${ability.name} must be between ${MIN_ABILITY} and ${MAX_ABILITY}.`,
      };
    }
  }

  const overspent = -abilityPointsRemaining(scores);

  if (overspent > 0) {
    return {
      field: "abilities",
      message: `That is ${overspent} point${overspent === 1 ? "" : "s"} over the ${ABILITY_BUDGET} available.`,
    };
  }

  return null;
}

export function readCharacterValues(formData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    discriminator: String(formData.get("discriminator") ?? "").trim(),
    race: String(formData.get("race") ?? ""),
    archetype: String(formData.get("archetype") ?? ""),
    classId: String(formData.get("classId") ?? ""),
    alignment: String(formData.get("alignment") ?? ""),
    colorTheme: String(formData.get("colorTheme") ?? ""),
    abilities: readAbilityScores(formData),
    backstory: readProse(formData.get("backstory")),
    personality: readProse(formData.get("personality")),
  };
}

/**
 * @returns {{field: string, message: string} | null}
 *   `null` when the values are well-formed. Says nothing about whether the
 *   handle is still free — only the database can answer that.
 */
export function validateCharacter({
  name,
  discriminator,
  race,
  archetype,
  classId,
  alignment,
  colorTheme,
  abilities,
  backstory,
  personality,
}) {
  // Counted the way the database counts, so a name this accepts is never one
  // the CHECK constraint then rejects.
  const nameLength = countCharacters(name);

  if (nameLength < MIN_NAME_LENGTH) {
    return {
      field: "name",
      message: `Name must be at least ${MIN_NAME_LENGTH} characters.`,
    };
  }

  if (nameLength > MAX_NAME_LENGTH) {
    return {
      field: "name",
      message: `Name must be at most ${MAX_NAME_LENGTH} characters.`,
    };
  }

  if (!DISCRIMINATOR_PATTERN.test(discriminator)) {
    return {
      field: "discriminator",
      message: "The tag must be exactly 4 digits, for example 0451.",
    };
  }

  if (!RACES.includes(race)) {
    return { field: "race", message: "Choose a race." };
  }

  const chosenArchetype = archetypeDetails(archetype);

  if (!chosenArchetype) {
    return { field: "archetype", message: "Choose a class." };
  }

  // Checked against the chosen archetype's own paths rather than the whole
  // catalogue, so a hand-crafted post cannot pair Warrior with Wizard.
  if (!chosenArchetype.paths.some((entry) => entry.id === classId)) {
    return {
      field: "classId",
      message: `Choose a path for the ${chosenArchetype.name}.`,
    };
  }

  // Before alignment, because that is the order the sheet asks in — the first
  // complaint should point at the first thing that is wrong on the way down.
  const abilityProblem = validateAbilityScores(abilities);

  if (abilityProblem) {
    return abilityProblem;
  }

  if (!ALIGNMENTS.some((entry) => entry.value === alignment)) {
    return { field: "alignment", message: "Choose an alignment." };
  }

  if (!AVATAR_COLOR_VALUES.includes(colorTheme)) {
    return { field: "colorTheme", message: "Choose an avatar colour." };
  }

  // Code points, not UTF-16 units — the same count the CHECK constraint uses.
  // `.length` was here, which put the real ceiling below 2000 for anyone
  // writing emoji or astral script, in the one field most likely to contain
  // them.
  if (countCharacters(backstory) > MAX_PROSE_LENGTH) {
    return {
      field: "backstory",
      message: `Backstory must be at most ${MAX_PROSE_LENGTH} characters.`,
    };
  }

  if (countCharacters(personality) > MAX_PROSE_LENGTH) {
    return {
      field: "personality",
      message: `Personality must be at most ${MAX_PROSE_LENGTH} characters.`,
    };
  }

  return null;
}
