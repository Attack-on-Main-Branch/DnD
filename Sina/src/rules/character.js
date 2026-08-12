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

export const MAX_CHARACTERS = 3;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 40;
export const MAX_PROSE_LENGTH = 2000;

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 20;

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

export function readCharacterValues(formData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    discriminator: String(formData.get("discriminator") ?? "").trim(),
    race: String(formData.get("race") ?? ""),
    alignment: String(formData.get("alignment") ?? ""),
    colorTheme: String(formData.get("colorTheme") ?? ""),
    backstory: String(formData.get("backstory") ?? "").trim(),
    personality: String(formData.get("personality") ?? "").trim(),
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
  alignment,
  colorTheme,
  backstory,
  personality,
}) {
  if (name.length < MIN_NAME_LENGTH) {
    return {
      field: "name",
      message: `Name must be at least ${MIN_NAME_LENGTH} characters.`,
    };
  }

  if (name.length > MAX_NAME_LENGTH) {
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

  if (!ALIGNMENTS.some((entry) => entry.value === alignment)) {
    return { field: "alignment", message: "Choose an alignment." };
  }

  if (!AVATAR_COLOR_VALUES.includes(colorTheme)) {
    return { field: "colorTheme", message: "Choose an avatar colour." };
  }

  if (backstory.length > MAX_PROSE_LENGTH) {
    return {
      field: "backstory",
      message: `Backstory must be at most ${MAX_PROSE_LENGTH} characters.`,
    };
  }

  if (personality.length > MAX_PROSE_LENGTH) {
    return {
      field: "personality",
      message: `Personality must be at most ${MAX_PROSE_LENGTH} characters.`,
    };
  }

  return null;
}
