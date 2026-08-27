import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEATH_SAVE_TARGET,
  DEFAULT_ARMOR_CLASS,
  baseArmorClass,
  MAX_ARMOR_CLASS,
  MIN_ARMOR_CLASS,
  deathSaveOutcome,
  isDying,
  isMassiveDamage,
  parseArmorClass,
  readDeathSaves,
  steppedDeathSaves,
} from "./death.js";

describe("parseArmorClass", () => {
  it("rounds and clamps to the column's ends", () => {
    assert.equal(parseArmorClass("16"), 16);
    assert.equal(parseArmorClass(15.6), 16);
    assert.equal(parseArmorClass(-4), MIN_ARMOR_CLASS);
    assert.equal(parseArmorClass(500), MAX_ARMOR_CLASS);
  });

  it("is null for anything that is not a number", () => {
    for (const value of ["", null, undefined, "plate"]) {
      assert.equal(parseArmorClass(value), null);
    }
  });

  it("takes the default the column carries", () => {
    assert.equal(parseArmorClass(DEFAULT_ARMOR_CLASS), DEFAULT_ARMOR_CLASS);
  });
});

describe("readDeathSaves", () => {
  it("reads the column", () => {
    assert.deepEqual(readDeathSaves({ successes: 2, failures: 1 }), {
      successes: 2,
      failures: 1,
    });
  });

  it("answers none for a row that has never had any", () => {
    for (const value of [null, undefined, "", 4, {}]) {
      assert.deepEqual(readDeathSaves(value), { successes: 0, failures: 0 });
    }
  });

  it("clamps a figure the functions could not have written", () => {
    assert.deepEqual(readDeathSaves({ successes: 9, failures: -2 }), {
      successes: DEATH_SAVE_TARGET,
      failures: 0,
    });
  });
});

describe("isDying", () => {
  it("is true at zero, and only while there is still somebody there", () => {
    assert.equal(isDying(0, false), true);
    assert.equal(isDying(0, true), false);
    assert.equal(isDying(1, false), false);
  });
});

describe("isMassiveDamage", () => {
  // 5e: the overflow past zero is what is measured, not the blow.
  it("kills outright only once the overflow reaches the maximum", () => {
    assert.equal(
      isMassiveDamage({ hitPoints: 3, maxHp: 20, damage: 22 }),
      false,
    );
    assert.equal(
      isMassiveDamage({ hitPoints: 3, maxHp: 20, damage: 23 }),
      true,
    );
    assert.equal(
      isMassiveDamage({ hitPoints: 20, maxHp: 20, damage: 40 }),
      true,
    );
  });

  it("is false for a heal, a zero, or a row it cannot read", () => {
    assert.equal(
      isMassiveDamage({ hitPoints: 3, maxHp: 20, damage: 0 }),
      false,
    );
    assert.equal(
      isMassiveDamage({ hitPoints: 3, maxHp: 20, damage: -9 }),
      false,
    );
    assert.equal(
      isMassiveDamage({ hitPoints: null, maxHp: 20, damage: 30 }),
      false,
    );
  });
});

describe("deathSaveOutcome", () => {
  it("reads the die the way the rulebook does", () => {
    assert.equal(deathSaveOutcome(20), "revived");
    assert.equal(deathSaveOutcome(1), "critical_failure");

    for (const face of [10, 11, 15, 19]) {
      assert.equal(deathSaveOutcome(face), "success");
    }

    for (const face of [2, 5, 9]) {
      assert.equal(deathSaveOutcome(face), "failure");
    }
  });
});

describe("steppedDeathSaves", () => {
  it("banks a success short of the third", () => {
    assert.deepEqual(
      steppedDeathSaves({ successes: 0, failures: 1, roll: 14 }),
      {
        successes: 1,
        failures: 1,
        outcome: "success",
        revived: false,
        dead: false,
      },
    );
  });

  it("stands them up on the third success, tallies wiped", () => {
    const landed = steppedDeathSaves({ successes: 2, failures: 2, roll: 10 });

    assert.deepEqual(landed, {
      successes: 0,
      failures: 0,
      outcome: "success",
      revived: true,
      dead: false,
    });
  });

  it("stands them up on a natural 20 whatever they were holding", () => {
    const landed = steppedDeathSaves({ successes: 0, failures: 2, roll: 20 });

    assert.equal(landed.revived, true);
    assert.equal(landed.dead, false);
    assert.deepEqual(
      { successes: landed.successes, failures: landed.failures },
      { successes: 0, failures: 0 },
    );
  });

  it("kills on the third failure", () => {
    const landed = steppedDeathSaves({ successes: 1, failures: 2, roll: 7 });

    assert.equal(landed.dead, true);
    assert.equal(landed.revived, false);
  });

  it("costs two failures for a natural 1", () => {
    assert.deepEqual(
      steppedDeathSaves({ successes: 0, failures: 0, roll: 1 }),
      {
        successes: 0,
        failures: 2,
        outcome: "critical_failure",
        revived: false,
        dead: false,
      },
    );

    // One already banked and a natural 1 is three, which is the end of it.
    assert.equal(
      steppedDeathSaves({ successes: 2, failures: 1, roll: 1 }).dead,
      true,
    );
  });

  it("starts from nothing for a character with no tallies written down", () => {
    assert.deepEqual(
      steppedDeathSaves({ successes: null, failures: undefined, roll: 12 }),
      {
        successes: 1,
        failures: 0,
        outcome: "success",
        revived: false,
        dead: false,
      },
    );
  });
});

describe("baseArmorClass", () => {
  it("is ten and dexterity for everybody else", () => {
    assert.equal(baseArmorClass({ className: "wizard", dexTotal: 16 }), 13);
    assert.equal(baseArmorClass({ className: "fighter", dexTotal: 10 }), 10);
    // A modifier goes down as readily as up.
    assert.equal(baseArmorClass({ className: "cleric", dexTotal: 7 }), 8);
  });

  it("adds Constitution for a Barbarian and Wisdom for a Monk", () => {
    assert.equal(
      baseArmorClass({
        className: "barbarian",
        dexTotal: 16,
        conTotal: 14,
        wisTotal: 20,
      }),
      15,
    );

    assert.equal(
      baseArmorClass({
        className: "monk",
        dexTotal: 16,
        conTotal: 20,
        wisTotal: 14,
      }),
      15,
    );
  });

  it("counts nobody else's second ability", () => {
    assert.equal(
      baseArmorClass({
        className: "ranger",
        dexTotal: 14,
        conTotal: 20,
        wisTotal: 20,
      }),
      12,
    );
  });

  it("reads a path under the name the sheet prints", () => {
    for (const spelling of ["Barbarian", "BARBARIAN"]) {
      assert.equal(
        baseArmorClass({ className: spelling, dexTotal: 10, conTotal: 16 }),
        13,
      );
    }
  });

  it("treats a score it cannot read as an unmodified ten", () => {
    assert.equal(baseArmorClass({ className: "wizard" }), DEFAULT_ARMOR_CLASS);
    assert.equal(
      baseArmorClass({ className: "barbarian", dexTotal: 14 }),
      DEFAULT_ARMOR_CLASS + 2,
    );
  });
});
