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

function trimmed(value, limit) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

/**
 * One item, as it will be written. `{ values }` or `{ errors }`, the shape
 * `validateCharacter` uses.
 *
 * The slug is derived here and never taken from the browser: it is the stacking
 * key, and a caller free to choose it is free to land a grant on another stack.
 */
export function validateItem({ name, category, description, quantity }) {
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
export function readCatalogueItem({ slug, name, category, description }) {
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
  };
}
