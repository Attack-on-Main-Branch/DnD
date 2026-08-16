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
    blurb: "Defender of the front line. Heavy armour, heavier weapons.",
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
    blurb: "Master of the arcane. Elemental ruin, delivered from range.",
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
    blurb: "Hunter of the wild. Lethal precision from a safe distance.",
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
    blurb: "A killer out of the shadows. Stealth, tricks and sudden ends.",
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
function readProse(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * Length in code points rather than UTF-16 units, matching Postgres's
 * `char_length` — which is what the table's CHECK constraints use.
 *
 * `.length` would count a single astral character such as 🐉 as two, so a
 * one-character name would pass a "at least 2" check here and be rejected by
 * the database, where it counts as one.
 */
export function countCharacters(value) {
  return Array.from(value).length;
}

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

export function readCharacterValues(formData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    discriminator: String(formData.get("discriminator") ?? "").trim(),
    race: String(formData.get("race") ?? ""),
    archetype: String(formData.get("archetype") ?? ""),
    classId: String(formData.get("classId") ?? ""),
    alignment: String(formData.get("alignment") ?? ""),
    colorTheme: String(formData.get("colorTheme") ?? ""),
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
