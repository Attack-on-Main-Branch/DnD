/**
 * What a character is, and what makes one valid.
 *
 * Imported by both the creation form and the Server Action; the browser's copy
 * is for speed, this one is the check that counts. Colours are slugs, not CSS —
 * the frontend decides what they look like.
 */

import { countCharacters, readProse } from "./text.js";

export { countCharacters };

export const MAX_CHARACTERS = 3;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 40;
export const MAX_PROSE_LENGTH = 2000;

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

/** Five archetypes, each holding its paths. Both halves are stored. */
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

/** Reading order for a 3×3 grid: lawful/neutral/chaotic across, good/evil down. */
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

export function archetypeDetails(id) {
  return ARCHETYPES.find((entry) => entry.id === id) ?? null;
}

/** Path ids are unique across the catalogue, so `class_id` stands on its own. */
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

/** Name#0451 — the handle a DM uses to invite this character to a party. */
export function characterHandle({ name, discriminator }) {
  return `${name}#${discriminator}`;
}

/** The six scores, in the order every sheet prints them. */
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
 * Cumulative cost from the baseline, not per step: the spend is a lookup and a
 * step's price is the difference between two neighbours. Negatives are refunds.
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

export function defaultAbilityScores() {
  return Object.fromEntries(
    ABILITIES.map((ability) => [ability.id, ABILITY_BASELINE]),
  );
}

/** Unknown scores count as nothing. */
export function abilitySpend(scores) {
  return ABILITIES.reduce(
    (total, ability) => total + (ABILITY_COST[scores?.[ability.id]] ?? 0),
    0,
  );
}

export function abilityPointsRemaining(scores) {
  return ABILITY_BUDGET - abilitySpend(scores);
}

/** Null at the ceiling. */
export function abilityRaiseCost(score) {
  if (!Number.isInteger(score) || score >= MAX_ABILITY) {
    return null;
  }

  return ABILITY_COST[score + 1] - ABILITY_COST[score];
}

/** Null at the floor. */
export function abilityLowerRefund(score) {
  if (!Number.isInteger(score) || score <= MIN_ABILITY) {
    return null;
  }

  return ABILITY_COST[score] - ABILITY_COST[score - 1];
}

/** Takes the whole set: affordability depends on what the other five spent. */
export function canRaiseAbility(scores, id) {
  const cost = abilityRaiseCost(scores?.[id]);

  return cost !== null && cost <= abilityPointsRemaining(scores);
}

export function canLowerAbility(scores, id) {
  return abilityLowerRefund(scores?.[id]) !== null;
}

/**
 * Mirrored by the generated total columns in 20260817090000_ability_scores.sql
 * — changing a line here means a migration. No race grants Wisdom.
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

export function abilityTotal(race, abilityId, score) {
  return (score ?? ABILITY_BASELINE) + raceAbilityBonus(race, abilityId);
}

/** The D&D modifier: every two points above 10 is worth one. */
export function abilityModifier(total) {
  return Math.floor((total - 10) / 2);
}

export function formatModifier(modifier) {
  return `${modifier >= 0 ? "+" : ""}${modifier}`;
}

/** Base, racial bonus, total and modifier, in printing order. */
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
      // Not defaulted: a mangled field must reach validation as NaN and be
      // refused, not become a 10 the budget never charged for.
      Number.parseInt(String(formData.get(`ability_${ability.id}`) ?? ""), 10),
    ]),
  );
}

/** Leftover points are allowed; the stepper lets you stop early. */
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
 * `null` when well-formed. Says nothing about whether the handle is still free
 * — only the database can answer that.
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
  // Counted the way the CHECK constraint counts, so it cannot reject what
  // this accepts.
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

  // Against the chosen archetype's own paths, not the whole catalogue, so a
  // hand-crafted post cannot pair Warrior with Wizard.
  if (!chosenArchetype.paths.some((entry) => entry.id === classId)) {
    return {
      field: "classId",
      message: `Choose a path for the ${chosenArchetype.name}.`,
    };
  }

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

  // Code points, not UTF-16 units — the count the CHECK constraint uses.
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
