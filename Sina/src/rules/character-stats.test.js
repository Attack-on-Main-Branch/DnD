import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ARCHETYPES, RACES } from "./character.js";
import { hitDie } from "./hp.js";
import { proficiencyBonus } from "./skills.js";
import {
  DEFAULT_SPEED,
  SIZES,
  characterSize,
  characterVitals,
  hitDiceLabel,
  hitDicePool,
  hitDiceRegained,
  initiativeBonus,
  movementSpeed,
  passivePerception,
  proficienciesFor,
  readCustomProficiencies,
} from "./character-stats.js";

const PATHS = ARCHETYPES.flatMap((archetype) =>
  archetype.paths.map((path) => path.id),
);

describe("initiativeBonus", () => {
  it("is the dexterity modifier and nothing else", () => {
    assert.equal(initiativeBonus(16), 3);
    assert.equal(initiativeBonus(10), 0);
    assert.equal(initiativeBonus(7), -2);
  });

  it("reads a score it cannot make sense of as an unmodified ten", () => {
    for (const value of [null, undefined, "", "quick"]) {
      assert.equal(initiativeBonus(value), 0);
    }
  });
});

describe("movementSpeed", () => {
  it("is twenty-five for the stout and the small", () => {
    for (const slow of ["Dwarf", "Halfling", "Gnome"]) {
      assert.equal(movementSpeed(slow), 25);
    }
  });

  it("is thirty for everybody else, and for a race it has never heard of", () => {
    for (const quick of ["Human", "Elf", "Tiefling", "Dragonborn", "Goliath"]) {
      assert.equal(movementSpeed(quick), DEFAULT_SPEED);
    }
  });

  it("answers for every race the app offers", () => {
    for (const one of RACES) {
      assert.ok([25, 30].includes(movementSpeed(one)), one);
    }
  });
});

describe("characterSize", () => {
  it("is Small for the Halfling and the Gnome alone", () => {
    assert.equal(characterSize("Halfling"), "Small");
    assert.equal(characterSize("Gnome"), "Small");
  });

  it("answers Medium for every other race the app offers", () => {
    for (const one of RACES) {
      const size = characterSize(one);

      assert.ok(SIZES.includes(size), one);
      assert.equal(
        size,
        ["Halfling", "Gnome"].includes(one) ? "Small" : "Medium",
      );
    }
  });
});

describe("passivePerception", () => {
  it("is ten and wisdom for somebody untrained", () => {
    assert.equal(passivePerception({ wisTotal: 14, level: 5, skills: {} }), 12);
  });

  it("adds the proficiency bonus for somebody trained", () => {
    for (const level of [1, 5, 17]) {
      assert.equal(
        passivePerception({
          wisTotal: 14,
          level,
          skills: { perception: { proficient: true } },
        }),
        12 + proficiencyBonus(level),
      );
    }
  });

  it("counts no other skill's training", () => {
    assert.equal(
      passivePerception({
        wisTotal: 10,
        level: 20,
        skills: { stealth: { proficient: true } },
      }),
      10,
    );
  });
});

describe("hitDicePool", () => {
  it("is one die per rung, of the path's own size", () => {
    const pool = hitDicePool({ classId: "fighter", level: 3, spent: 1 });

    assert.deepEqual(pool, {
      die: "d10",
      faces: 10,
      max: 3,
      spent: 1,
      remaining: 2,
    });

    assert.equal(hitDiceLabel(pool), "2 / 3 d10");
  });

  it("takes its die from the same table max HP does", () => {
    for (const path of PATHS) {
      const pool = hitDicePool({ classId: path, level: 1 });

      assert.equal(pool.faces, hitDie(path), path);
    }
  });

  it("has no pool for a path the catalogue does not hold", () => {
    const pool = hitDicePool({ classId: "artificer", level: 4 });

    assert.equal(pool.die, null);
    assert.equal(hitDiceLabel(pool), null);
  });

  it("cannot spend more dice than there are rungs", () => {
    const pool = hitDicePool({ classId: "wizard", level: 2, spent: 9 });

    assert.equal(pool.spent, 2);
    assert.equal(pool.remaining, 0);
  });
});

describe("hitDiceRegained", () => {
  it("is half the rung and never none", () => {
    assert.equal(hitDiceRegained(1), 1);
    assert.equal(hitDiceRegained(2), 1);
    assert.equal(hitDiceRegained(5), 2);
    assert.equal(hitDiceRegained(20), 10);
  });
});

describe("proficienciesFor", () => {
  it("answers for every path the archetypes offer", () => {
    for (const path of PATHS) {
      const held = proficienciesFor(path);
      const everything = [...held.armor, ...held.weapons, ...held.tools];

      assert.ok(everything.length > 0, `${path} is trained in nothing`);
    }
  });

  it("gives a Fighter every armour and both weapon lists", () => {
    const held = proficienciesFor("fighter");

    assert.deepEqual(held.armor, [
      "Light Armor",
      "Medium Armor",
      "Heavy Armor",
      "Shields",
    ]);
    assert.deepEqual(held.weapons, ["Simple Weapons", "Martial Weapons"]);
  });

  it("gives a Wizard no armour at all", () => {
    assert.deepEqual(proficienciesFor("wizard").armor, []);
  });

  it("qualifies a Druid's armour and nobody else's", () => {
    assert.deepEqual(proficienciesFor("druid").qualifier, {
      armor: "non-metal",
    });
    assert.equal(proficienciesFor("cleric").qualifier, null);
  });

  it("names a Rogue's four blades and their tools", () => {
    const held = proficienciesFor("rogue");

    for (const blade of ["Longswords", "Rapiers", "Shortswords"]) {
      assert.ok(held.weapons.includes(blade), blade);
    }

    assert.deepEqual(held.tools, ["Thieves’ Tools"]);
  });

  it("reads a path under the name the sheet prints", () => {
    assert.deepEqual(
      proficienciesFor("Thief / Rogue").weapons,
      proficienciesFor("rogue").weapons,
    );

    assert.deepEqual(
      proficienciesFor("Arcane Archer").armor,
      proficienciesFor("arcane_archer").armor,
    );
  });

  it("adds what a table has written on top, without repeating it", () => {
    const held = proficienciesFor("wizard", {
      armor: ["Light Armor"],
      tools: ["Calligrapher’s Supplies", "Calligrapher’s Supplies"],
    });

    assert.deepEqual(held.armor, ["Light Armor"]);
    assert.deepEqual(held.tools, ["Calligrapher’s Supplies"]);
  });

  it("is empty for a path it has never heard of", () => {
    const held = proficienciesFor("artificer");

    assert.deepEqual([...held.armor, ...held.weapons, ...held.tools], []);
  });
});

describe("readCustomProficiencies", () => {
  it("answers three empty lists for a row that has never had any", () => {
    for (const value of [null, undefined, "", 7]) {
      assert.deepEqual(readCustomProficiencies(value), {
        armor: [],
        weapons: [],
        tools: [],
      });
    }
  });

  it("keeps only strings, and only once each", () => {
    assert.deepEqual(
      readCustomProficiencies({ weapons: ["Whips", 4, "Whips", null, ""] })
        .weapons,
      ["Whips"],
    );
  });
});

describe("characterVitals", () => {
  it("reads a whole row in one call", () => {
    const vitals = characterVitals({
      race: "Halfling",
      class_id: "rogue",
      level: 4,
      ability_dex_total: 18,
      ability_wis_total: 12,
      skills: { perception: { proficient: true } },
      hit_dice_spent: 1,
    });

    assert.equal(vitals.initiative, 4);
    assert.equal(vitals.speed, 25);
    assert.equal(vitals.size, "Small");
    assert.equal(vitals.passivePerception, 10 + 1 + proficiencyBonus(4));
    assert.equal(hitDiceLabel(vitals.hitDice), "3 / 4 d8");
    assert.deepEqual(vitals.proficiencies.armor, ["Light Armor"]);
  });

  it("holds together for a row that carries almost nothing", () => {
    const vitals = characterVitals({});

    assert.equal(vitals.initiative, 0);
    assert.equal(vitals.speed, DEFAULT_SPEED);
    assert.equal(vitals.size, "Medium");
    assert.equal(vitals.passivePerception, 10);
    assert.equal(vitals.hitDice.die, null);
  });
});
