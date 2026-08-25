/**
 * How a spell looks and how a spellbook is ordered, in one place, so the
 * search, the shelves and both drawers cannot drift.
 *
 * The class strings are LITERAL and must stay so: Tailwind's scanner reads the
 * source rather than the running app, and a class built from a template is one
 * it never sees. Same rule character-presentation.js is written under.
 */

import { formatModifier } from "sina/rules/skills";
import { CANTRIP_LEVEL, SPELL_LEVELS, spellDiceAt } from "sina/rules/spells";

/** 0 is not "0th". Every other shelf is the ordinal a table already says. */
const ORDINALS = [
  "",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
];

/** The heading over a shelf: "Cantrips", "3rd Level". */
function shelfLabel(level) {
  return level === CANTRIP_LEVEL ? "Cantrips" : `${ORDINALS[level]} Level`;
}

/** The chip on a row, where there is room for a word and not for two. */
export function levelBadge(level) {
  return level === CANTRIP_LEVEL ? "Cantrip" : ORDINALS[level];
}

/** The whole phrase, for a sentence — the activity log's, and a label's. */
export function spellLevelLabel(level) {
  return level === CANTRIP_LEVEL ? "Cantrip" : `${ORDINALS[level]} Level`;
}

/** The heading over one cluster of pips. "Cantrip" never appears here. */
export function slotClusterLabel(level) {
  return ORDINALS[level];
}

const TAG_BASE =
  "inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 " +
  "font-mono text-[10px] tracking-[0.14em] uppercase";

/** Every spell is magic, so the school wears the arcane violet a wand does. */
export const SCHOOL_TAG_CLASSES = `${TAG_BASE} border-arcane/35 bg-arcane/10 text-arcane/90`;

export const LEVEL_TAG_CLASSES = `${TAG_BASE} border-gold/30 bg-gold/15 text-gold`;

/**
 * The two facts that change how a spell is PLAYED rather than what it does, so
 * the two with a colour of their own: amber for a thing being held, sky for a
 * way of casting it for free.
 */
export const CONCENTRATION_CHIP_CLASSES =
  "inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-amber-200/90 uppercase";

export const RITUAL_CHIP_CLASSES =
  "inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-sky-200/90 uppercase";

/**
 * A slot: the gold a lit die wears, or the socket it came out of. `block`
 * because most of these are spans — only the head of the table gets a button —
 * and an inline element takes no height from `size-*`.
 */
const PIP_BASE =
  "block size-3.5 shrink-0 rounded-full transition duration-300 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const PIP_AVAILABLE = "bg-gold shadow-[0_0_6px_rgba(255,223,156,0.5)]";

const PIP_EXPENDED = "border border-gold/30 bg-black/40";

/**
 * The lift under a pointer, and only where the pointer can do something: a
 * player reads the bar and cannot move it, so a pip that brightened under them
 * would be offering a press that is refused in the database.
 */
const PIP_AVAILABLE_HOVER = "hover:shadow-[0_0_10px_rgba(255,223,156,0.75)]";

const PIP_EXPENDED_HOVER = "hover:border-gold/60";

export function slotPipClasses(available, interactive = false) {
  const face = available ? PIP_AVAILABLE : PIP_EXPENDED;

  if (!interactive) {
    return `${PIP_BASE} ${face}`;
  }

  return `${PIP_BASE} ${face} ${
    available ? PIP_AVAILABLE_HOVER : PIP_EXPENDED_HOVER
  }`;
}

/** A database row as the cards and the Server Actions want a spell. */
function rowSpell(row) {
  return {
    slug: row.spell_slug,
    name: row.name,
    level: row.level,
    school: row.school,
    castingTime: row.casting_time,
    range: row.range_text,
    components: row.components,
    material: row.material,
    duration: row.duration,
    concentration: row.concentration,
    ritual: row.ritual,
    attackSave: row.attack_save,
    damage: row.damage,
    description: row.description,
    higherLevel: row.higher_level,
    classes: row.classes,
    damageByLevel: row.damage_by_level ?? {},
    healByLevel: row.heal_by_level ?? {},
  };
}

/**
 * A spellbook split onto its shelves, cantrips first. Empty shelves are left
 * out: a heading over nothing has to be read before it can be skipped.
 */
export function spellsByShelf(rows) {
  const shelves = new Map(SPELL_LEVELS.map((level) => [level, []]));

  for (const row of rows) {
    shelves.get(row.level)?.push(rowSpell(row));
  }

  return SPELL_LEVELS.filter((level) => shelves.get(level).length > 0).map(
    (level) => ({
      level,
      label: shelfLabel(level),
      spells: shelves.get(level),
    }),
  );
}

/** The party's rows split back up by who knows them, in the party's order. */
export function spellsByCharacter(members, rows) {
  const books = new Map(members.map((member) => [member.id, []]));

  for (const row of rows) {
    books.get(row.character_id)?.push(row);
  }

  return books;
}

/**
 * What the table is told a spell threw: "10d6 Fire", the dice for the slot it
 * was cast from. The type comes off the card's own line — the scaling table
 * carries dice and nothing else.
 */
export function castDamageLine(spell, slotLevel) {
  const dice = spellDiceAt(spell, slotLevel);

  if (!dice) {
    return "";
  }

  const type = String(spell.damage ?? "")
    .replace(/\d+d\d+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return type ? `${dice} ${type}` : dice;
}

/**
 * What the spell asks of whoever is on the wrong end: "DC 15 DEX save", or
 * "+7 Ranged spell attack". The SRD gives at most one; the number is the
 * caster's.
 */
export function castSaveLine(spell, casting) {
  const asks = spell?.attackSave ?? "";

  if (!asks || !casting) {
    return asks;
  }

  return /save/i.test(asks)
    ? `DC ${casting.saveDC} ${asks}`
    : `${formatModifier(casting.attackBonus)} ${asks}`;
}
