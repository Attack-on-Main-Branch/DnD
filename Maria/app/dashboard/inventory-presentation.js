/**
 * How an item looks, in one place, so the pack at the table, the Dungeon
 * Master's drawer and the Inventory tab on a sheet cannot drift.
 *
 * The class strings are LITERAL and must stay so: Tailwind's scanner reads the
 * source rather than the running app, and a class built from a template is one
 * it never sees. Same rule character-presentation.js is written under.
 */

const RISE_STEP_MS = 45;

/** Capped: a whole party's packs at once would otherwise take a second to land. */
const RISE_CAP_MS = 360;

export const ITEM_CARD_CLASSES =
  "motion-safe:animate-[rise_0.32s_var(--ease-tray)_both]";

export function itemEntrance(index) {
  return { animationDelay: `${Math.min(RISE_CAP_MS, index * RISE_STEP_MS)}ms` };
}

/**
 * Magic reads violet, everything a party merely carries reads gold.
 *
 * Matched on words rather than an enumeration because the categories come from
 * an external API: `equipment_category.name` and `rarity.name` between them
 * produce "Wondrous Items", "Very Rare", "Adventuring Gear" and many more.
 */
const ARCANE_WORDS =
  /wondrous|rare|legendary|artifact|uncommon|common|potion|scroll|wand|staff|rod|ring|magic/i;

const TAG_BASE =
  "inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 " +
  "font-mono text-[10px] tracking-[0.14em] uppercase";

const TAG_ARCANE = "border-arcane/35 bg-arcane/10 text-arcane/90";
const TAG_GOLD = "border-gold/25 bg-gold/10 text-gold/80";

export function categoryTagClasses(category) {
  return `${TAG_BASE} ${ARCANE_WORDS.test(category ?? "") ? TAG_ARCANE : TAG_GOLD}`;
}

/** The count on a row and on the panel it opens, the spell's level tag's twin. */
export const STACK_TAG_CLASSES =
  "inline-flex items-center rounded-full border border-gold/30 bg-gold/15 " +
  "px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-gold tabular-nums";

/** Null for a catalogue entry, which is a description of a thing, not an amount. */
export function stackLabel(quantity) {
  return Number.isFinite(quantity) ? `×${quantity}` : null;
}

/** A database row as the Server Actions want an item. */
export function rowItem(row) {
  return {
    slug: row.item_slug,
    name: row.name,
    category: row.category,
    description: row.description,
    isCustom: row.is_custom,
    facts: row.facts ?? {},
  };
}

/** The party's rows split back up by who is carrying them, in the party's order. */
export function packsByCharacter(members, rows) {
  const packs = new Map(members.map((member) => [member.id, []]));

  for (const row of rows) {
    packs.get(row.character_id)?.push(row);
  }

  return packs;
}

/**
 * What each fact is called, in the order a table asks for them. A list rather
 * than a map, because the order IS the design: the dice first, the price and
 * the weight last.
 */
const FACT_LABELS = [
  ["damage", "Damage"],
  ["versatile", "Versatile"],
  ["armorClass", "Armour class"],
  ["range", "Range"],
  ["thrown", "Thrown"],
  ["properties", "Properties"],
  ["strength", "Strength"],
  ["stealth", "Stealth"],
  ["cost", "Cost"],
  ["weight", "Weight"],
];

/** Only the facts an item has. A rope prints two cells, a longsword five. */
export function itemFactList(facts) {
  if (!facts) {
    return [];
  }

  return FACT_LABELS.filter(([name]) => facts[name]).map(([name, label]) => ({
    name,
    label,
    value: facts[name],
  }));
}

/**
 * A `campaign_items` row as the same facts an SRD entry arrives with. The
 * Create form writes these one to a box, which is where an item is WRITTEN;
 * this is the shape it is read in, at the table and back on the campaign page.
 */
export function catalogueFacts(row) {
  const facts = {};

  if (row.damage_dice) {
    facts.damage = `${row.damage_dice} ${row.damage_type ?? ""}`.trim();
  }

  if (row.armor_class > 0) {
    facts.armorClass = String(row.armor_class);
  }

  if (row.properties) {
    facts.properties = row.properties;
  }

  if (row.cost_quantity > 0) {
    facts.cost = `${row.cost_quantity} ${row.cost_unit || "gp"}`;
  }

  if (Number(row.weight) > 0) {
    facts.weight = `${row.weight} lb`;
  }

  return facts;
}
