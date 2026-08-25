/**
 * What a spell is, and the bounds every one of them is held to.
 *
 * Every bound is mirrored by a CHECK constraint in
 * 20260825090000_character_spells.sql. Changing one means changing both.
 */

/** A cantrip is a spell of level zero, everywhere in D&D and here. */
export const CANTRIP_LEVEL = 0;
export const MAX_SPELL_LEVEL = 9;

/** Cantrip first, then first through ninth. */
export const SPELL_LEVELS = Array.from(
  { length: MAX_SPELL_LEVEL + 1 },
  (_, level) => level,
);

export const MAX_SPELL_NAME_LENGTH = 80;
export const MAX_SPELL_SLUG_LENGTH = 100;
export const MAX_SPELL_SCHOOL_LENGTH = 40;

/** Casting time, range, components, duration. */
export const MAX_SPELL_FIELD_LENGTH = 80;

/** The material component's own sentence. */
export const MAX_SPELL_MATERIAL_LENGTH = 300;

/** "8d6 Fire", "DEX save" — a phrase, never a sentence. */
export const MAX_SPELL_EFFECT_LENGTH = 120;

/** An item's description is flavour; a spell's IS the rule, so it needs room. */
export const MAX_SPELL_DESCRIPTION_LENGTH = 2000;

/** "At Higher Levels". */
export const MAX_SPELL_HIGHER_LEVEL_LENGTH = 600;

/** "Wizard, Sorcerer". */
export const MAX_SPELL_CLASSES_LENGTH = 120;

/** One entry of the scaling table: "8d6". */
export const MAX_SPELL_DICE_LENGTH = 40;

/** Mirrors the trigger in 20260825090000_character_spells.sql. */
export const MAX_CHARACTER_SPELLS = 60;

/** And the one in 20260828090000_the_dm_writes_both.sql. */
export const MAX_CAMPAIGN_SPELLS = 60;

/** The prefix that tells a homebrew spell from one the SRD knows about. */
export const CUSTOM_SLUG_PREFIX = "custom:";

/** The eight schools, in the SRD's own order. A menu, not a free field. */
export const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

/** Refused rather than clamped: a spell on the wrong shelf is a wrong spell. */
export function parseSpellLevel(value) {
  const typed = String(value ?? "").trim();
  const number = Number(typed);

  if (typed === "" || !Number.isInteger(number)) {
    return null;
  }

  return number >= CANTRIP_LEVEL && number <= MAX_SPELL_LEVEL ? number : null;
}

export function isSpellLevel(value) {
  return parseSpellLevel(value) !== null;
}

/**
 * A name reduced to the key a spellbook is kept under. `\p{L}` and `\p{N}`
 * rather than `a-z0-9`, or a party playing in Cyrillic would have every slug
 * reduced to nothing and every one of them collide.
 */
export function spellSlug(name) {
  const slug = String(name ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? slug.slice(0, MAX_SPELL_SLUG_LENGTH) : null;
}

/**
 * Derived from the name and prefixed, as `customItemSlug` is. A uuid would put
 * one "Frost Lash" taught twice on a shelf twice, and the prefix is what lets a
 * homebrew spell sit beside an SRD one of the same name.
 */
function customSpellSlug(name) {
  const slug = spellSlug(name);

  return slug
    ? `${CUSTOM_SLUG_PREFIX}${slug}`.slice(0, MAX_SPELL_SLUG_LENGTH)
    : null;
}

/** One line, whitespace collapsed: everything but the two prose fields. */
function line(value, limit) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/** The two fields that are paragraphs, so line breaks survive. */
function prose(value, limit) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, limit);
}

/**
 * A spell arriving from the search route, as it will be written. Null when the
 * slug, name or level is unusable — the route builds all three out of an
 * external index. The slug is re-derived and never taken at face value: it is
 * the key the spellbook is unique on.
 */
export function readCatalogueSpell(spell) {
  const slug = spellSlug(spell?.slug);
  const name = line(spell?.name, MAX_SPELL_NAME_LENGTH);
  const level = parseSpellLevel(spell?.level);

  if (!slug || !name || level === null) {
    return null;
  }

  return {
    slug,
    name,
    level,
    school: line(spell?.school, MAX_SPELL_SCHOOL_LENGTH),
    castingTime: line(spell?.castingTime, MAX_SPELL_FIELD_LENGTH),
    range: line(spell?.range, MAX_SPELL_FIELD_LENGTH),
    components: line(spell?.components, MAX_SPELL_FIELD_LENGTH),
    material: line(spell?.material, MAX_SPELL_MATERIAL_LENGTH),
    duration: line(spell?.duration, MAX_SPELL_FIELD_LENGTH),
    concentration: Boolean(spell?.concentration),
    ritual: Boolean(spell?.ritual),
    attackSave: line(spell?.attackSave, MAX_SPELL_EFFECT_LENGTH),
    damage: line(spell?.damage, MAX_SPELL_EFFECT_LENGTH),
    description: prose(spell?.description, MAX_SPELL_DESCRIPTION_LENGTH),
    higherLevel: prose(spell?.higherLevel, MAX_SPELL_HIGHER_LEVEL_LENGTH),
    classes: line(spell?.classes, MAX_SPELL_CLASSES_LENGTH),
    damageByLevel: readScaling(spell?.damageByLevel),
    healByLevel: readScaling(spell?.healByLevel),
  };
}

/**
 * What a spell throws at each slot: `{ "3": "8d6", "4": "9d6", … }`. Keys are
 * slot levels for a levelled spell and CHARACTER levels for a cantrip, which is
 * `spellDiceAt`'s problem and not this one's. A broken row is dropped rather
 * than kept — a missing entry falls back to the base dice, a wrong one is
 * rolled.
 */
function readScaling(map) {
  if (!map || typeof map !== "object") {
    return {};
  }

  const scaling = {};

  for (const [at, dice] of Object.entries(map)) {
    const rung = Number(at);
    const notation = line(dice, MAX_SPELL_DICE_LENGTH);

    if (Number.isInteger(rung) && rung >= 1 && rung <= 20 && notation) {
      scaling[rung] = notation;
    }
  }

  return scaling;
}

/**
 * The dice a spell throws from a given slot — 8d6 for a Fireball at 3rd, 10d6
 * at 5th. Damage, then healing, then the card's own `damage` line; null for a
 * spell that rolls nothing. `at` is a slot level, or a character level for a
 * cantrip, and the nearest row at or below it wins.
 */
export function spellDiceAt(spell, at) {
  const table =
    Object.keys(spell?.damageByLevel ?? {}).length > 0
      ? spell.damageByLevel
      : (spell?.healByLevel ?? {});

  const rungs = Object.keys(table)
    .map(Number)
    .filter((rung) => Number.isInteger(rung))
    .sort((a, b) => a - b);

  if (rungs.length === 0) {
    return diceOf(spell?.damage) ?? null;
  }

  const wanted = Number(at);
  const found = rungs.filter((rung) => rung <= wanted).pop() ?? rungs[0];

  return diceOf(table[found]);
}

/**
 * The dice out of a phrase that carries more than dice: "8d6 Fire", or the
 * healing table's "1d8 + MOD". Null when there is no `NdM` in there at all.
 */
function diceOf(phrase) {
  const dice = String(phrase ?? "").match(/\d+d\d+/gi);

  return dice ? dice.join(" + ") : null;
}

/**
 * One spell as a Dungeon Master writes it down — the counterpart to
 * `readCatalogueSpell`, which truncates what an index said where this refuses
 * what a person typed. `{ values }` or `{ errors }`, as `validateItem` answers.
 *
 * Only three things can be wrong: no name, no shelf, a rule past the column.
 * The rest is trimmed rather than judged — a casting time of "one deep breath"
 * is a fair thing to invent.
 */
export function validateSpell({
  name,
  level,
  school,
  castingTime,
  range,
  components,
  material,
  duration,
  concentration,
  ritual,
  attackSave,
  damage,
  description,
  higherLevel,
  classes,
}) {
  const errors = {};

  const cleanName = line(name, MAX_SPELL_NAME_LENGTH);
  const slug = customSpellSlug(cleanName);

  if (cleanName.length === 0) {
    errors.name = "A spell needs a name.";
  } else if (!slug) {
    errors.name = "A spell's name needs a letter or a number in it.";
  }

  const shelf = parseSpellLevel(level);

  if (shelf === null) {
    errors.level = `A spell is a cantrip or level 1 to ${MAX_SPELL_LEVEL}.`;
  }

  const cleanDescription = prose(description, MAX_SPELL_DESCRIPTION_LENGTH + 1);

  if (cleanDescription.length > MAX_SPELL_DESCRIPTION_LENGTH) {
    errors.description = `A description is at most ${MAX_SPELL_DESCRIPTION_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { values: null, errors };
  }

  return {
    values: {
      slug,
      name: cleanName,
      level: shelf,
      school: line(school, MAX_SPELL_SCHOOL_LENGTH),
      castingTime: line(castingTime, MAX_SPELL_FIELD_LENGTH),
      range: line(range, MAX_SPELL_FIELD_LENGTH),
      components: line(components, MAX_SPELL_FIELD_LENGTH),
      material: line(material, MAX_SPELL_MATERIAL_LENGTH),
      duration: line(duration, MAX_SPELL_FIELD_LENGTH),
      concentration: Boolean(concentration),
      ritual: Boolean(ritual),
      attackSave: line(attackSave, MAX_SPELL_EFFECT_LENGTH),
      damage: line(damage, MAX_SPELL_EFFECT_LENGTH),
      description: cleanDescription,
      higherLevel: prose(higherLevel, MAX_SPELL_HIGHER_LEVEL_LENGTH),
      classes: line(classes, MAX_SPELL_CLASSES_LENGTH),
      isCustom: true,
      /* No scaling table: a form asking for nine rows of dice is one nobody
         fills in, so an upcast homebrew spell throws the dice on its card. */
      damageByLevel: {},
      healByLevel: {},
    },
    errors: null,
  };
}
