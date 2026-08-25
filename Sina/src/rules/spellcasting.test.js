import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ARCHETYPES } from "./character.js";
import { MAX_LEVEL } from "./level.js";
import {
  CASTER_KINDS,
  SLOT_LEVELS,
  SPELLCASTING_ABILITIES,
  availableSlotLevels,
  casterKind,
  castableSlots,
  getMaxSpellSlots,
  readSpellSlots,
  readSpellcasting,
  remainingSlots,
  spellcastingAbility,
} from "./spellcasting.js";

/** A wizard's row, as `characters` hands one over. */
function caster(over) {
  return {
    class_id: "wizard",
    level: 5,
    ability_int_total: 18,
    ability_wis_total: 12,
    ability_cha_total: 10,
    ...over,
  };
}

describe("the catalogue this table is keyed on", () => {
  const paths = ARCHETYPES.flatMap((archetype) =>
    archetype.paths.map((path) => path.id),
  );

  it("names only paths rules/character.js has", () => {
    // spellcasting.js does not import that catalogue on purpose — it would put
    // four hundred lines of RACES in the browser. This is what keeps the two
    // in step instead.
    for (const id of Object.keys(CASTER_KINDS)) {
      assert.ok(paths.includes(id), `${id} is not a path`);
    }

    for (const id of Object.keys(SPELLCASTING_ABILITIES)) {
      assert.ok(paths.includes(id), `${id} is not a path`);
    }
  });

  it("gives every caster an ability, and every ability a caster", () => {
    assert.deepEqual(
      Object.keys(CASTER_KINDS).sort(),
      Object.keys(SPELLCASTING_ABILITIES).sort(),
    );
  });

  it("leaves the four martial paths casting nothing", () => {
    for (const id of ["barbarian", "fighter", "rogue", "monk"]) {
      assert.equal(casterKind(id), null);
    }
  });
});

describe("getMaxSpellSlots, on a full caster", () => {
  it("answers the Player's Handbook table at both ends", () => {
    assert.deepEqual(getMaxSpellSlots("wizard", 1), {
      1: 2,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
    });

    assert.deepEqual(getMaxSpellSlots("wizard", 20), {
      1: 4,
      2: 3,
      3: 3,
      4: 3,
      5: 3,
      6: 2,
      7: 2,
      8: 1,
      9: 1,
    });
  });

  it("opens a shelf at the level 5e opens it", () => {
    assert.equal(getMaxSpellSlots("cleric", 4)[3], 0);
    assert.equal(getMaxSpellSlots("cleric", 5)[3], 2);
    assert.equal(getMaxSpellSlots("bard", 16)[9], 0);
    assert.equal(getMaxSpellSlots("bard", 17)[9], 1);
  });
});

describe("getMaxSpellSlots, on the other three progressions", () => {
  it("starts a half caster at level 2 and stops at 5th-level slots", () => {
    assert.equal(getMaxSpellSlots("paladin", 1)[1], 0);
    assert.equal(getMaxSpellSlots("paladin", 2)[1], 2);
    assert.deepEqual(availableSlotLevels("ranger", 20), [1, 2, 3, 4, 5]);
    assert.equal(getMaxSpellSlots("ranger", 20)[6], 0);
  });

  it("starts a third caster at level 3 and stops at 4th-level slots", () => {
    assert.equal(getMaxSpellSlots("arcane_archer", 2)[1], 0);
    assert.equal(getMaxSpellSlots("arcane_archer", 3)[1], 2);
    assert.deepEqual(availableSlotLevels("arcane_archer", 20), [1, 2, 3, 4]);
  });

  it("gives a warlock every slot at one level, climbing to 5th", () => {
    // Pact Magic is the shape the other three are not: one shelf, one to four
    // slots on it.
    assert.deepEqual(availableSlotLevels("warlock", 1), [1]);
    assert.equal(getMaxSpellSlots("warlock", 1)[1], 1);

    assert.deepEqual(availableSlotLevels("warlock", 11), [5]);
    assert.equal(getMaxSpellSlots("warlock", 11)[5], 3);
    assert.equal(getMaxSpellSlots("warlock", 20)[5], 4);
    assert.equal(getMaxSpellSlots("warlock", 20)[4], 0);
  });

  it("answers a class that casts nothing with every shelf empty", () => {
    assert.deepEqual(availableSlotLevels("fighter", 20), []);
  });

  it("has a row for every level a character can reach", () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      for (const id of Object.keys(CASTER_KINDS)) {
        const slots = getMaxSpellSlots(id, level);

        assert.deepEqual(Object.keys(slots).map(Number), SLOT_LEVELS);
        assert.ok(SLOT_LEVELS.every((slot) => Number.isInteger(slots[slot])));
      }
    }
  });

  it("clamps a level outside the sheet rather than reading off the end", () => {
    // `parseLevel` clamps, so 40 is 20 and 0 is 1 — never an undefined row.
    assert.deepEqual(
      getMaxSpellSlots("wizard", 40),
      getMaxSpellSlots("wizard", 20),
    );
    assert.deepEqual(
      getMaxSpellSlots("wizard", 0),
      getMaxSpellSlots("wizard", 1),
    );
    assert.equal(getMaxSpellSlots("wizard", "x")[1], 0);
  });
});

describe("readSpellcasting", () => {
  it("computes the two numbers at the top of the sheet", () => {
    // Level 5 is +3 proficiency; 18 Intelligence is +4.
    const casting = readSpellcasting(caster());

    assert.equal(casting.ability, "int");
    assert.equal(casting.proficiency, 3);
    assert.equal(casting.modifier, 4);
    assert.equal(casting.saveDC, 15);
    assert.equal(casting.attackBonus, 7);
  });

  it("reads each class off its own ability", () => {
    assert.equal(spellcastingAbility("cleric"), "wis");
    assert.equal(spellcastingAbility("warlock"), "cha");
    assert.equal(spellcastingAbility("arcane_archer"), "int");

    const cleric = readSpellcasting(
      caster({ class_id: "cleric", ability_wis_total: 16 }),
    );

    assert.equal(cleric.modifier, 3);
    assert.equal(cleric.saveDC, 14);
  });

  it("reads the total column, which carries the racial bonus", () => {
    const casting = readSpellcasting(
      caster({ ability_int: 10, ability_int_total: 20 }),
    );

    assert.equal(casting.score, 20);
  });

  it("is null for anybody who casts nothing", () => {
    assert.equal(readSpellcasting(caster({ class_id: "fighter" })), null);
    assert.equal(readSpellcasting(caster({ ability_int_total: null })), null);
    assert.equal(readSpellcasting(null), null);
  });
});

describe("readSpellSlots", () => {
  const stored = { 1: { used: 3, max: 4 }, 3: { used: 1, max: 2 } };

  it("derives the maximum rather than believing the stored one", () => {
    // A wizard who levelled up since their last cast has a snapshot one row
    // behind, and the bar has to show the slot they just gained.
    const slots = readSpellSlots({ 1: { used: 0, max: 2 } }, "wizard", 5);

    assert.equal(slots[0].max, 4);
  });

  it("keeps what has been spent, clamped to what is there now", () => {
    const slots = readSpellSlots(stored, "wizard", 5);

    assert.deepEqual(slots, [
      { level: 1, used: 3, max: 4, remaining: 1 },
      { level: 2, used: 0, max: 3, remaining: 3 },
      { level: 3, used: 1, max: 2, remaining: 1 },
    ]);
  });

  it("clamps a count left above a maximum that has shrunk", () => {
    const slots = readSpellSlots({ 1: { used: 9, max: 9 } }, "wizard", 1);

    assert.deepEqual(slots, [{ level: 1, used: 2, max: 2, remaining: 0 }]);
  });

  it("survives a column that is empty, junk, or missing", () => {
    for (const held of [null, undefined, {}, "nonsense", 4]) {
      const slots = readSpellSlots(held, "wizard", 1);

      assert.deepEqual(slots, [{ level: 1, used: 0, max: 2, remaining: 2 }]);
    }
  });

  it("counts what is left over the whole sheet", () => {
    assert.equal(remainingSlots(stored, "wizard", 5), 1 + 3 + 1);
  });
});

describe("castableSlots", () => {
  const stored = { 1: { used: 4, max: 4 }, 3: { used: 1, max: 2 } };

  it("offers the spell's own level and every one above it", () => {
    const offered = castableSlots(2, stored, "wizard", 5);

    assert.deepEqual(
      offered.map((slot) => slot.level),
      [2, 3],
    );
  });

  it("keeps a spent level in the list rather than hiding it", () => {
    // It is what the caster is looking for; the flyout greys it out.
    const offered = castableSlots(1, stored, "wizard", 5);

    assert.equal(offered[0].level, 1);
    assert.equal(offered[0].remaining, 0);
  });

  it("offers a cantrip nothing: it is not cast from a slot", () => {
    assert.deepEqual(castableSlots(0, stored, "wizard", 5), []);
  });

  it("offers nothing above the highest slot on the sheet", () => {
    assert.deepEqual(castableSlots(9, stored, "wizard", 5), []);
  });
});
