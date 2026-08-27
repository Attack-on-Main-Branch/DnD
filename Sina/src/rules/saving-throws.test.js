import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ABILITIES, ARCHETYPES } from "./character.js";
import { proficiencyBonus } from "./skills.js";
import {
  abilityId,
  getSavingThrowBonus,
  isSavingThrowProficient,
  savingThrowsFor,
} from "./saving-throws.js";

/** The SRD's own table, path by path, as ability ids. */
const EXPECTED = {
  barbarian: ["str", "con"],
  fighter: ["str", "con"],
  paladin: ["wis", "cha"],
  wizard: ["int", "wis"],
  sorcerer: ["con", "cha"],
  warlock: ["wis", "cha"],
  ranger: ["str", "dex"],
  arcane_archer: ["str", "con"],
  rogue: ["dex", "int"],
  monk: ["str", "dex"],
  cleric: ["wis", "cha"],
  druid: ["int", "wis"],
  bard: ["dex", "cha"],
};

describe("abilityId", () => {
  it("takes the id, the long name and the printed name", () => {
    for (const ability of ABILITIES) {
      assert.equal(abilityId(ability.id), ability.id);
      assert.equal(abilityId(ability.name), ability.id);
      assert.equal(abilityId(ability.name.toLowerCase()), ability.id);
    }
  });

  it("answers null for anything else", () => {
    for (const value of ["", null, undefined, "luck", "STRENGTHS"]) {
      assert.equal(abilityId(value), null);
    }
  });
});

describe("savingThrowsFor", () => {
  for (const [path, saves] of Object.entries(EXPECTED)) {
    it(`gives ${path} ${saves.join(" and ")}`, () => {
      assert.deepEqual(savingThrowsFor(path), saves);
    });
  }

  it("covers every path the archetypes offer", () => {
    for (const archetype of ARCHETYPES) {
      for (const path of archetype.paths) {
        assert.equal(
          savingThrowsFor(path.id).length,
          2,
          `${path.id} has no saving throws`,
        );
      }
    }
  });

  it("reads a path under the name the sheet prints", () => {
    // `rogue` is printed "Thief / Rogue"; `arcane_archer` as two words.
    for (const spelling of ["Thief / Rogue", "thief/rogue", "thief", "Rogue"]) {
      assert.deepEqual(savingThrowsFor(spelling), ["dex", "int"]);
    }

    for (const spelling of [
      "Arcane Archer",
      "arcane archer",
      "ARCANE_ARCHER",
    ]) {
      assert.deepEqual(savingThrowsFor(spelling), ["str", "con"]);
    }
  });

  it("is empty for a path it has never heard of", () => {
    for (const value of [null, undefined, "", "artificer"]) {
      assert.deepEqual(savingThrowsFor(value), []);
    }
  });
});

describe("isSavingThrowProficient", () => {
  it("is true for both of a path's saves and false for the other four", () => {
    for (const [path, saves] of Object.entries(EXPECTED)) {
      for (const ability of ABILITIES) {
        assert.equal(
          isSavingThrowProficient(path, ability.id),
          saves.includes(ability.id),
          `${path} / ${ability.id}`,
        );
      }
    }
  });

  it("takes the long ability name too", () => {
    assert.equal(isSavingThrowProficient("wizard", "Intelligence"), true);
    assert.equal(isSavingThrowProficient("wizard", "Charisma"), false);
  });
});

describe("getSavingThrowBonus", () => {
  it("adds the proficiency bonus to the modifier", () => {
    assert.equal(
      getSavingThrowBonus({
        className: "wizard",
        abilityName: "int",
        abilityMod: 3,
        level: 1,
      }),
      5,
    );

    assert.equal(
      getSavingThrowBonus({
        className: "wizard",
        abilityName: "wis",
        abilityMod: -1,
        level: 9,
      }),
      3,
    );
  });

  it("moves with the level the way the proficiency bonus does", () => {
    for (const level of [1, 4, 5, 12, 17, 20]) {
      assert.equal(
        getSavingThrowBonus({
          className: "bard",
          abilityName: "cha",
          abilityMod: 2,
          level,
        }),
        2 + proficiencyBonus(level),
      );
    }
  });

  it("is null where the path has no proficiency", () => {
    assert.equal(
      getSavingThrowBonus({
        className: "wizard",
        abilityName: "str",
        abilityMod: 4,
        level: 20,
      }),
      null,
    );
  });

  it("is null for an unreadable modifier or an unknown path", () => {
    assert.equal(
      getSavingThrowBonus({
        className: "wizard",
        abilityName: "int",
        abilityMod: undefined,
        level: 1,
      }),
      null,
    );

    assert.equal(
      getSavingThrowBonus({
        className: null,
        abilityName: "int",
        abilityMod: 3,
        level: 1,
      }),
      null,
    );
  });
});
