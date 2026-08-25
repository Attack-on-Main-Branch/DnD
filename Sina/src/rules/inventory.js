/**
 * What an item is, and the bounds every one of them is held to.
 *
 * Its own module rather than a corner of `rules/character.js`, for the reason
 * `health.js` is one: this runs in the browser, and that neighbour would bring
 * four hundred lines of RACES and ARCHETYPES along with it.
 *
 * Every bound here is mirrored by a CHECK constraint in
 * 20260822120000_character_inventory.sql. Changing one means changing both.
 */

export const MAX_ITEM_NAME_LENGTH = 80;
export const MAX_ITEM_CATEGORY_LENGTH = 40;
export const MAX_ITEM_DESCRIPTION_LENGTH = 500;
export const MAX_ITEM_SLUG_LENGTH = 100;
export const MAX_ITEM_QUANTITY = 999;

/** Mirrors the trigger in 20260822160000_campaign_items.sql. */
export const MAX_CAMPAIGN_ITEMS = 60;

export const DEFAULT_ITEM_CATEGORY = "Equipment";

/**
 * The rest of what the SRD says about a thing, mirrored by
 * `campaign_items_detail_check`. Zero is "not priced", "weightless", "no
 * armour" — a nullable field for each is three more states to answer for.
 */
export const MAX_ITEM_COST = 999999;
export const MAX_ITEM_WEIGHT = 9999;
export const MAX_ITEM_ARMOR_CLASS = 30;
export const MAX_ITEM_DICE_LENGTH = 40;
export const MAX_ITEM_DAMAGE_TYPE_LENGTH = 40;
export const MAX_ITEM_PROPERTIES_LENGTH = 120;

/** The five coins, as the SRD writes a price in them. */
export const COST_UNITS = ["cp", "sp", "ep", "gp", "pp"];

export function isCostUnit(value) {
  return COST_UNITS.includes(String(value ?? "").toLowerCase());
}

function trimmed(value, limit) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/**
 * What the SRD says about a thing besides its name — the facts a panel prints
 * beside the description, in the order a table asks for them.
 *
 * A fixed list, so nothing an external index invents can reach the column, and
 * the panel has an order to draw in without deciding one. Mirrored by
 * `valid_item_facts` in 20260829090000.
 */
export const ITEM_FACTS = [
  "damage",
  "versatile",
  "armorClass",
  "range",
  "thrown",
  "properties",
  "strength",
  "stealth",
  "cost",
  "weight",
];

/** Two more that are a badge rather than a figure. */
export const ITEM_MARKS = ["kind", "rarity"];

export const MAX_ITEM_FACT_LENGTH = 60;

/**
 * The facts, bounded and keyed only on what this list knows. `attunement` is
 * the one boolean: 5e writes it into the prose, and a chip is what a table
 * wants to see rather than a sentence to find it in.
 */
export function readItemFacts(facts) {
  if (!facts || typeof facts !== "object") {
    return {};
  }

  const kept = {};

  for (const name of [...ITEM_FACTS, ...ITEM_MARKS]) {
    const value = trimmed(facts[name], MAX_ITEM_FACT_LENGTH);

    if (value) {
      kept[name] = value;
    }
  }

  if (facts.attunement) {
    kept.attunement = true;
  }

  return kept;
}

/** The prefix that tells a homebrew item from one the SRD knows about. */
export const CUSTOM_SLUG_PREFIX = "custom:";

/**
 * Clamped rather than refused, the way `parseHitPoints` is: the controls that
 * produce it work over one fixed range, so anything outside it is a paste or a
 * rounding artefact. The CHECK constraint is the check that counts.
 */
export function parseQuantity(value) {
  const typed = String(value ?? "").trim();
  const number = Number(typed);

  // An empty field is nothing typed, not zero — and zero is a real answer here,
  // being the stack that has just been used up. `Number("")` is 0, so emptiness
  // is tested first.
  if (typed === "" || !Number.isFinite(number)) {
    return null;
  }

  return Math.min(MAX_ITEM_QUANTITY, Math.max(0, Math.round(number)));
}

/**
 * A name reduced to the key a stack is kept under.
 *
 * `\p{L}` and `\p{N}` rather than `a-z0-9`: a party playing in Cyrillic or
 * Japanese would otherwise have every slug reduced to nothing and every one of
 * them collide. Null when there is no letter or digit to key on at all.
 */
export function itemSlug(name) {
  const slug = String(name ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? slug.slice(0, MAX_ITEM_SLUG_LENGTH) : null;
}

/**
 * Derived from the name rather than freshly generated. A uuid per grant would
 * read as unique and behave as a bug: the stack is keyed on
 * `(character_id, item_slug)`, so the same "Bag of Rats" handed out twice would
 * leave two rows of one each.
 */
export function customItemSlug(name) {
  const slug = itemSlug(name);

  return slug
    ? `${CUSTOM_SLUG_PREFIX}${slug}`.slice(0, MAX_ITEM_SLUG_LENGTH)
    : null;
}

/** Clamped rather than refused: outside the box is a paste or a slip. */
function measure(value, limit, { decimals = 0 } = {}) {
  const number = Number(String(value ?? "").trim());

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  const bounded = Math.min(limit, number);

  return decimals > 0
    ? Math.round(bounded * 10 ** decimals) / 10 ** decimals
    : Math.round(bounded);
}

/**
 * One item, as it will be written. `{ values }` or `{ errors }`, the shape
 * `validateCharacter` uses.
 *
 * Everything after `quantity` is optional: the same function validates a
 * catalogue entry typed into a form and a card handed over at the table, and
 * only the first has a price or a weight.
 *
 * The slug is derived here and never taken from the browser: it is the stacking
 * key, and a caller free to choose it is free to land a grant on another stack.
 */
export function validateItem({
  name,
  category,
  description,
  quantity,
  cost,
  costUnit,
  weight,
  damageDice,
  damageType,
  armorClass,
  properties,
  facts,
}) {
  const errors = {};

  const cleanName = trimmed(name, MAX_ITEM_NAME_LENGTH);
  const slug = customItemSlug(cleanName);

  if (cleanName.length === 0) {
    errors.name = "An item needs a name.";
  } else if (!slug) {
    errors.name = "An item's name needs a letter or a number in it.";
  }

  const cleanDescription = String(description ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (cleanDescription.length > MAX_ITEM_DESCRIPTION_LENGTH) {
    errors.description = `A description is at most ${MAX_ITEM_DESCRIPTION_LENGTH} characters.`;
  }

  const count = parseQuantity(quantity);

  if (count === null || count < 1) {
    errors.quantity = `A quantity is 1 to ${MAX_ITEM_QUANTITY}.`;
  }

  if (Object.keys(errors).length > 0) {
    return { values: null, errors };
  }

  return {
    values: {
      slug,
      name: cleanName,
      category:
        trimmed(category, MAX_ITEM_CATEGORY_LENGTH) || DEFAULT_ITEM_CATEGORY,
      description: cleanDescription,
      quantity: count,
      isCustom: true,
      // Absent from a grant off the table's search, which hands over a card
      // and not a catalogue row — hence zeroes rather than a refusal.
      cost: measure(cost, MAX_ITEM_COST),
      costUnit: isCostUnit(costUnit) ? String(costUnit).toLowerCase() : "",
      weight: measure(weight, MAX_ITEM_WEIGHT, { decimals: 2 }),
      damageDice: trimmed(damageDice, MAX_ITEM_DICE_LENGTH),
      damageType: trimmed(damageType, MAX_ITEM_DAMAGE_TYPE_LENGTH),
      armorClass: measure(armorClass, MAX_ITEM_ARMOR_CLASS),
      properties: trimmed(properties, MAX_ITEM_PROPERTIES_LENGTH),
      facts: readItemFacts(facts),
    },
    errors: null,
  };
}

/**
 * An item arriving from the search route rather than from a form. Its name and
 * category are the SRD's, so there is nothing to validate against a user's
 * typing — only the truncation the columns need.
 *
 * Null when the slug is unusable: the route builds it out of an external index,
 * and an item this app cannot key a stack on must not be written.
 */
export function readCatalogueItem({
  slug,
  name,
  category,
  description,
  facts,
}) {
  const cleanSlug = itemSlug(slug);
  const cleanName = trimmed(name, MAX_ITEM_NAME_LENGTH);

  if (!cleanSlug || !cleanName) {
    return null;
  }

  return {
    slug: cleanSlug,
    name: cleanName,
    category:
      trimmed(category, MAX_ITEM_CATEGORY_LENGTH) || DEFAULT_ITEM_CATEGORY,
    description: String(description ?? "")
      .trim()
      .slice(0, MAX_ITEM_DESCRIPTION_LENGTH),
    isCustom: false,
    facts: readItemFacts(facts),
  };
}
