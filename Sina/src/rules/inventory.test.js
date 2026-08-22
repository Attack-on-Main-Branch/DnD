import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOM_SLUG_PREFIX,
  customItemSlug,
  DEFAULT_ITEM_CATEGORY,
  itemSlug,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_QUANTITY,
  MAX_ITEM_SLUG_LENGTH,
  parseQuantity,
  readCatalogueItem,
  validateItem,
} from "./inventory.js";

describe("parseQuantity", () => {
  it("rounds a typed figure to a whole number", () => {
    assert.equal(parseQuantity("3.6"), 4);
  });

  it("clamps below zero and above the ceiling", () => {
    assert.equal(parseQuantity(-4), 0);
    assert.equal(parseQuantity(100000), MAX_ITEM_QUANTITY);
  });

  it("is null for something that is not a number at all", () => {
    assert.equal(parseQuantity("a few"), null);
    assert.equal(parseQuantity(""), null);
    assert.equal(parseQuantity(undefined), null);
  });
});

describe("itemSlug", () => {
  it("reduces a name to the key a stack is kept under", () => {
    assert.equal(itemSlug("  Potion of Healing! "), "potion-of-healing");
  });

  it("keeps letters outside the Latin alphabet", () => {
    // The regression this exists for: `[^a-z0-9]` would take a Cyrillic or
    // Japanese name down to nothing, and every item in that party would then
    // collide on the empty slug.
    assert.equal(itemSlug("Кинжал"), "кинжал");
    assert.equal(itemSlug("鋼の剣"), "鋼の剣");
  });

  it("is null when there is no letter or digit to key on", () => {
    assert.equal(itemSlug("!!! ???"), null);
    assert.equal(itemSlug(""), null);
  });

  it("never exceeds the column's bound", () => {
    assert.equal(itemSlug("x".repeat(400)).length, MAX_ITEM_SLUG_LENGTH);
  });
});

describe("customItemSlug", () => {
  it("derives the same slug from the same name, so homebrew stacks", () => {
    // A uuid per grant would read as unique and behave as a bug: the same bag
    // handed out twice would be two rows of one each.
    assert.equal(customItemSlug("Bag of Rats"), customItemSlug("bag of rats"));
  });

  it("is marked out from a catalogue slug", () => {
    assert.ok(customItemSlug("Bag of Rats").startsWith(CUSTOM_SLUG_PREFIX));
    assert.ok(!itemSlug("potion-of-healing").startsWith(CUSTOM_SLUG_PREFIX));
  });
});

describe("validateItem", () => {
  it("accepts an ordinary homebrew item", () => {
    const { values, errors } = validateItem({
      name: "  Rope  of Climbing ",
      description: "It climbs.",
      quantity: "2",
    });

    assert.equal(errors, null);
    assert.equal(values.name, "Rope of Climbing");
    assert.equal(values.slug, "custom:rope-of-climbing");
    assert.equal(values.quantity, 2);
    assert.equal(values.isCustom, true);
  });

  it("files an item with no category of its own under the default", () => {
    const { values } = validateItem({ name: "Lantern", quantity: 1 });
    assert.equal(values.category, DEFAULT_ITEM_CATEGORY);
  });

  it("refuses a name that cannot be slugged", () => {
    const { values, errors } = validateItem({ name: "???", quantity: 1 });
    assert.equal(values, null);
    assert.ok(errors.name);
  });

  it("refuses a quantity of zero, which is not a grant", () => {
    const { errors } = validateItem({ name: "Lantern", quantity: "0" });
    assert.ok(errors.quantity);
  });

  it("refuses a description past the column's bound", () => {
    const { errors } = validateItem({
      name: "Lantern",
      quantity: 1,
      description: "x".repeat(MAX_ITEM_DESCRIPTION_LENGTH + 1),
    });
    assert.ok(errors.description);
  });

  it("truncates an over-long name rather than refusing it", () => {
    const { values } = validateItem({
      name: "x".repeat(MAX_ITEM_NAME_LENGTH + 40),
      quantity: 1,
    });
    assert.equal(values.name.length, MAX_ITEM_NAME_LENGTH);
  });

  it("never returns a slug the caller chose", () => {
    // The stacking key is derived, never taken from the browser: a caller free
    // to choose it is a caller who can land a grant on another stack.
    const { values } = validateItem({
      name: "Lantern",
      quantity: 1,
      slug: "potion-of-healing",
    });
    assert.equal(values.slug, "custom:lantern");
  });
});

describe("readCatalogueItem", () => {
  it("keeps what the search route found", () => {
    const item = readCatalogueItem({
      slug: "potion-of-healing",
      name: "Potion of Healing",
      category: "Potion",
      description: "You regain hit points.",
    });

    assert.equal(item.slug, "potion-of-healing");
    assert.equal(item.isCustom, false);
  });

  it("is null without a usable slug or name", () => {
    assert.equal(readCatalogueItem({ slug: "!!", name: "Thing" }), null);
    assert.equal(readCatalogueItem({ slug: "thing", name: "  " }), null);
  });

  it("truncates a description the external API made no promises about", () => {
    const item = readCatalogueItem({
      slug: "thing",
      name: "Thing",
      description: "x".repeat(MAX_ITEM_DESCRIPTION_LENGTH + 500),
    });

    assert.equal(item.description.length, MAX_ITEM_DESCRIPTION_LENGTH);
  });
});
