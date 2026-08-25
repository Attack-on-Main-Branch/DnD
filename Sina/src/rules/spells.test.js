import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CANTRIP_LEVEL,
  MAX_CHARACTER_SPELLS,
  MAX_SPELL_DESCRIPTION_LENGTH,
  MAX_SPELL_LEVEL,
  MAX_SPELL_NAME_LENGTH,
  SPELL_LEVELS,
  isSpellLevel,
  parseSpellLevel,
  readCatalogueSpell,
  SPELL_SCHOOLS,
  spellDiceAt,
  spellSlug,
  validateSpell,
} from "./spells.js";

const FIREBALL = {
  slug: "fireball",
  name: "Fireball",
  level: 3,
  school: "Evocation",
  castingTime: "1 action",
  range: "150 feet",
  components: "V, S, M",
  material: "A tiny ball of bat guano and sulfur.",
  duration: "Instantaneous",
  concentration: false,
  ritual: false,
  attackSave: "DEX save",
  damage: "8d6 Fire",
  description: "A bright streak flashes from your pointing finger.",
  higherLevel: "The damage increases by 1d6 for each slot above 3rd.",
  classes: "Sorcerer, Wizard",
  damageByLevel: { 3: "8d6", 4: "9d6" },
  healByLevel: {},
};

describe("the shelves", () => {
  it("runs from cantrip to ninth, in reading order", () => {
    assert.equal(CANTRIP_LEVEL, 0);
    assert.equal(MAX_SPELL_LEVEL, 9);
    assert.deepEqual(SPELL_LEVELS, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("holds the ceiling the trigger keeps", () => {
    assert.equal(MAX_CHARACTER_SPELLS, 60);
  });
});

describe("parseSpellLevel", () => {
  it("keeps zero, which is a cantrip and not an empty field", () => {
    assert.equal(parseSpellLevel(0), 0);
    assert.equal(parseSpellLevel("0"), 0);
  });

  it("refuses rather than clamps: a wrong shelf is a wrong spell", () => {
    assert.equal(parseSpellLevel(10), null);
    assert.equal(parseSpellLevel(-1), null);
  });

  it("refuses anything that is not a whole number of levels", () => {
    assert.equal(parseSpellLevel(""), null);
    assert.equal(parseSpellLevel(null), null);
    assert.equal(parseSpellLevel(undefined), null);
    assert.equal(parseSpellLevel("three"), null);
    assert.equal(parseSpellLevel(2.5), null);
  });

  it("answers isSpellLevel the same way", () => {
    assert.equal(isSpellLevel(0), true);
    assert.equal(isSpellLevel(9), true);
    assert.equal(isSpellLevel(10), false);
    assert.equal(isSpellLevel(null), false);
  });
});

describe("spellSlug", () => {
  it("reduces a name to the key a shelf is kept under", () => {
    assert.equal(spellSlug("Melf's Acid Arrow"), "melf-s-acid-arrow");
    assert.equal(spellSlug("  Fire Bolt  "), "fire-bolt");
  });

  it("keeps letters no ASCII range covers", () => {
    assert.equal(spellSlug("Огненный шар"), "огненный-шар");
  });

  it("is null when there is nothing to key on", () => {
    assert.equal(spellSlug("///"), null);
    assert.equal(spellSlug(""), null);
    assert.equal(spellSlug(null), null);
  });
});

describe("readCatalogueSpell", () => {
  it("keeps every field the card draws", () => {
    assert.deepEqual(readCatalogueSpell(FIREBALL), FIREBALL);
  });

  it("re-derives the slug rather than believing it", () => {
    const spell = readCatalogueSpell({ ...FIREBALL, slug: "Fire BALL!!" });

    assert.equal(spell.slug, "fire-ball");
  });

  it("refuses a spell it cannot key or shelve", () => {
    assert.equal(readCatalogueSpell({ ...FIREBALL, slug: "///" }), null);
    assert.equal(readCatalogueSpell({ ...FIREBALL, name: "  " }), null);
    assert.equal(readCatalogueSpell({ ...FIREBALL, level: 11 }), null);
    assert.equal(readCatalogueSpell({ ...FIREBALL, level: null }), null);
  });

  it("keeps a cantrip, whose level is zero and not missing", () => {
    const spell = readCatalogueSpell({ ...FIREBALL, level: 0 });

    assert.equal(spell.level, 0);
  });

  it("holds a name and a description to the columns' bounds", () => {
    const spell = readCatalogueSpell({
      ...FIREBALL,
      name: "x".repeat(400),
      description: "y".repeat(4000),
    });

    assert.equal(spell.name.length, MAX_SPELL_NAME_LENGTH);
    assert.equal(spell.description.length, MAX_SPELL_DESCRIPTION_LENGTH);
  });

  it("keeps the paragraphs a rule is written in", () => {
    const spell = readCatalogueSpell({
      ...FIREBALL,
      description: "One paragraph.\r\n\r\nAnd another.",
    });

    assert.equal(spell.description, "One paragraph.\n\nAnd another.");
  });

  it("collapses the one-line fields, which are never paragraphs", () => {
    const spell = readCatalogueSpell({ ...FIREBALL, range: "150\n  feet" });

    assert.equal(spell.range, "150 feet");
  });

  it("answers a missing field with an empty string, never undefined", () => {
    const spell = readCatalogueSpell({
      slug: "fireball",
      name: "Fireball",
      level: 3,
    });

    assert.equal(spell.school, "");
    assert.equal(spell.material, "");
    assert.equal(spell.concentration, false);
    assert.equal(spell.ritual, false);
  });
});

describe("spellDiceAt", () => {
  it("throws the dice for the slot it was cast from", () => {
    // The whole of upcasting: a Fireball at 5th is 10d6 and not 8d6.
    const spell = readCatalogueSpell({
      ...FIREBALL,
      damageByLevel: { 3: "8d6", 4: "9d6", 5: "10d6" },
    });

    assert.equal(spellDiceAt(spell, 3), "8d6");
    assert.equal(spellDiceAt(spell, 5), "10d6");
  });

  it("holds at the nearest row below, where the table skips levels", () => {
    const cantrip = readCatalogueSpell({
      ...FIREBALL,
      level: 0,
      damage: "1d10 Fire",
      damageByLevel: { 1: "1d10", 5: "2d10", 11: "3d10", 17: "4d10" },
    });

    assert.equal(spellDiceAt(cantrip, 4), "1d10");
    assert.equal(spellDiceAt(cantrip, 12), "3d10");
    assert.equal(spellDiceAt(cantrip, 20), "4d10");
  });

  it("reads a healing table when there is no damage one", () => {
    const cure = readCatalogueSpell({
      ...FIREBALL,
      name: "Cure Wounds",
      damage: "",
      damageByLevel: {},
      healByLevel: { 1: "1d8 + MOD", 2: "2d8 + MOD" },
    });

    // The modifier is the caster's own and is added by whoever knows it.
    assert.equal(spellDiceAt(cure, 2), "2d8");
  });

  it("falls back to the card's own damage line when nothing is tabulated", () => {
    const spell = readCatalogueSpell({
      ...FIREBALL,
      damageByLevel: {},
      healByLevel: {},
    });

    assert.equal(spellDiceAt(spell, 3), "8d6");
  });

  it("is null for a spell that rolls nothing at all", () => {
    const counterspell = readCatalogueSpell({
      ...FIREBALL,
      name: "Counterspell",
      damage: "",
      damageByLevel: {},
      healByLevel: {},
    });

    assert.equal(spellDiceAt(counterspell, 3), null);
  });
});

describe("validateSpell", () => {
  const FROST = {
    name: "Frost Lash",
    level: "2",
    school: "Evocation",
    castingTime: "1 action",
    range: "30 feet",
    components: "V, S",
    duration: "Instantaneous",
    damage: "3d6 Cold",
    attackSave: "DEX save",
    description: "A whip of ice.",
  };

  it("keeps every field a card draws", () => {
    const { values } = validateSpell(FROST);

    assert.equal(values.name, "Frost Lash");
    assert.equal(values.level, 2);
    assert.equal(values.school, "Evocation");
    assert.equal(values.castingTime, "1 action");
    assert.equal(values.duration, "Instantaneous");
    assert.equal(values.damage, "3d6 Cold");
    assert.equal(values.attackSave, "DEX save");
  });

  it("prefixes the slug, so homebrew and the SRD share a shelf", () => {
    // `character_spells` is unique on the slug, so a made-up Fireball and the
    // rulebook's have to key differently.
    assert.equal(validateSpell(FROST).values.slug, "custom:frost-lash");
    assert.equal(
      validateSpell({ ...FROST, name: "Fireball" }).values.slug,
      "custom:fireball",
    );
    assert.equal(validateSpell(FROST).values.isCustom, true);
  });

  it("refuses a spell with no name and no shelf", () => {
    assert.ok(validateSpell({ ...FROST, name: "  " }).errors.name);
    assert.ok(validateSpell({ ...FROST, name: "///" }).errors.name);
    assert.ok(validateSpell({ ...FROST, level: 12 }).errors.level);
    assert.ok(validateSpell({ ...FROST, level: "" }).errors.level);
  });

  it("keeps a cantrip, whose level is zero and not missing", () => {
    assert.equal(validateSpell({ ...FROST, level: 0 }).values.level, 0);
  });

  it("refuses a rule longer than the column", () => {
    const errors = validateSpell({
      ...FROST,
      description: "y".repeat(3000),
    }).errors;

    assert.ok(errors.description);
  });

  it("trims the phrases nothing branches on rather than judging them", () => {
    // "one deep breath" is a fair thing to invent.
    const { values, errors } = validateSpell({
      ...FROST,
      castingTime: "  one   deep breath  ",
      school: "",
    });

    assert.equal(errors, null);
    assert.equal(values.castingTime, "one deep breath");
    assert.equal(values.school, "");
  });

  it("carries no scaling table, so an upcast throws the card's own dice", () => {
    const { values } = validateSpell(FROST);

    assert.deepEqual(values.damageByLevel, {});
    assert.equal(spellDiceAt(values, 5), "3d6");
  });

  it("lists the eight schools, in the SRD's own order", () => {
    assert.equal(SPELL_SCHOOLS.length, 8);
    assert.equal(SPELL_SCHOOLS[0], "Abjuration");
    assert.equal(SPELL_SCHOOLS[7], "Transmutation");
  });
});
