/**
 * Everything that defines what a character is: the option lists, the limits,
 * and the rules. Shared by the creation form and the Server Action, so the
 * browser and the server can never disagree about what is valid.
 *
 * Deliberately not a "use server" module — both sides import it.
 */

export const MAX_CHARACTERS = 3;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 40;
export const MAX_PROSE_LENGTH = 2000;

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
 */
export const ALIGNMENTS = [
  { value: "lawful_good", label: "Lawful Good" },
  { value: "neutral_good", label: "Neutral Good" },
  { value: "chaotic_good", label: "Chaotic Good" },
  { value: "lawful_neutral", label: "Lawful Neutral" },
  { value: "true_neutral", label: "True Neutral" },
  { value: "chaotic_neutral", label: "Chaotic Neutral" },
  { value: "lawful_evil", label: "Lawful Evil" },
  { value: "neutral_evil", label: "Neutral Evil" },
  { value: "chaotic_evil", label: "Chaotic Evil" },
];

const DISCRIMINATOR_PATTERN = /^[0-9]{4}$/;

export function alignmentLabel(value) {
  return ALIGNMENTS.find((entry) => entry.value === value)?.label ?? value;
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
