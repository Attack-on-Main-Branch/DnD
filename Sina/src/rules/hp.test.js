import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ARCHETYPES, MAX_ABILITY, RACE_ABILITY_BONUSES } from "./character.js";
import { calculateMaxHP, hitDie, MAX_HP, MIN_MAX_HP } from "./hp.js";
import { MAX_LEVEL } from "./level.js";

describe("the hit dice", () => {
  it("gives every path in the catalogue a die", () => {
    // hp.js does not import the catalogue — it would carry RACES and the
    // artwork with it — so this is what keeps the two lists in step.
    const missing = ARCHETYPES.flatMap((archetype) =>
      archetype.paths.map((path) => path.id),
    ).filter((id) => hitDie(id) === null);

    assert.deepEqual(missing, []);
  });

  it("rolls each archetype's own die", () => {
    assert.equal(hitDie("barbarian"), 12);
    assert.equal(hitDie("fighter"), 10);
    assert.equal(hitDie("paladin"), 10);
    assert.equal(hitDie("wizard"), 6);
    assert.equal(hitDie("sorcerer"), 6);
    assert.equal(hitDie("warlock"), 8);
    assert.equal(hitDie("ranger"), 10);
    assert.equal(hitDie("arcane_archer"), 10);
    assert.equal(hitDie("rogue"), 8);
    assert.equal(hitDie("monk"), 8);
    assert.equal(hitDie("cleric"), 8);
    assert.equal(hitDie("druid"), 8);
    assert.equal(hitDie("bard"), 8);
  });

  it("answers the spellings that are not ids", () => {
    assert.equal(hitDie("Arcane Archer"), 10);
    assert.equal(hitDie("arcane archer"), 10);
    assert.equal(hitDie("Thief / Rogue"), 8);
    assert.equal(hitDie("thief/rogue"), 8);
    assert.equal(hitDie("Thief"), 8);
  });

  it("normalises case and whitespace", () => {
    assert.equal(hitDie("  BARBARIAN  "), 12);
  });

  it("has no die for a path nobody walks", () => {
    assert.equal(hitDie("artificer"), null);
    assert.equal(hitDie(""), null);
    assert.equal(hitDie(null), null);
  });
});

describe("the first level", () => {
  it("is the whole die plus the Constitution modifier", () => {
    assert.equal(
      calculateMaxHP({ className: "barbarian", level: 1, conScore: 10 }),
      12,
    );
    assert.equal(
      calculateMaxHP({ className: "fighter", level: 1, conScore: 10 }),
      10,
    );
    assert.equal(
      calculateMaxHP({ className: "warlock", level: 1, conScore: 10 }),
      8,
    );
    assert.equal(
      calculateMaxHP({ className: "wizard", level: 1, conScore: 10 }),
      6,
    );
  });

  it("carries the modifier both ways", () => {
    assert.equal(
      calculateMaxHP({ className: "fighter", level: 1, conScore: 16 }),
      13,
    );
    assert.equal(
      calculateMaxHP({ className: "fighter", level: 1, conScore: 8 }),
      9,
    );
  });

  it("never lands below one, however poor the Constitution", () => {
    // A d6 at 7 Constitution is 6 − 2 = 4, and the floor still stands.
    assert.equal(
      calculateMaxHP({ className: "wizard", level: 1, conScore: 7 }),
      4,
    );
    assert.ok(
      calculateMaxHP({ className: "wizard", level: 1, conScore: 3 }) >=
        MIN_MAX_HP,
    );
  });
});

describe("every level after it", () => {
  it("adds half the die rounded up, plus the modifier", () => {
    // d10 at 5th with no modifier: 10 + 4 × 6.
    assert.equal(
      calculateMaxHP({ className: "fighter", level: 5, conScore: 10 }),
      34,
    );
    // d12 at 5th: 12 + 4 × 7.
    assert.equal(
      calculateMaxHP({ className: "barbarian", level: 5, conScore: 10 }),
      40,
    );
    // d6 at 5th: 6 + 4 × 4.
    assert.equal(
      calculateMaxHP({ className: "wizard", level: 5, conScore: 10 }),
      22,
    );
  });

  it("pays the modifier on every rung, not only the first", () => {
    // +2 at 5th is 5 × 2 more than the same character at 10 Constitution.
    const flat = calculateMaxHP({
      className: "fighter",
      level: 5,
      conScore: 10,
    });
    const hardy = calculateMaxHP({
      className: "fighter",
      level: 5,
      conScore: 14,
    });

    assert.equal(hardy - flat, 10);
  });

  it("is retroactive: a score raised at 8th pays for all eight", () => {
    const before = calculateMaxHP({
      className: "cleric",
      level: 8,
      conScore: 12,
    });
    const after = calculateMaxHP({
      className: "cleric",
      level: 8,
      conScore: 14,
    });

    assert.equal(after - before, 8);
  });

  it("never gains less than one a level", () => {
    // A d6 at 7 Constitution would gain 4 − 2 = 2; at 3 it would gain nothing,
    // and 5e's errata draws the floor at one.
    const low = calculateMaxHP({ className: "wizard", level: 20, conScore: 3 });
    const one = calculateMaxHP({ className: "wizard", level: 1, conScore: 3 });

    assert.equal(low - one, MAX_LEVEL - 1);
  });

  it("clamps a rung outside the ladder rather than refusing it", () => {
    assert.equal(
      calculateMaxHP({ className: "fighter", level: 99, conScore: 10 }),
      calculateMaxHP({ className: "fighter", level: MAX_LEVEL, conScore: 10 }),
    );
  });

  it("has no figure for a path or a score it cannot read", () => {
    assert.equal(
      calculateMaxHP({ className: "artificer", level: 1, conScore: 10 }),
      null,
    );
    assert.equal(
      calculateMaxHP({ className: "fighter", level: 1, conScore: "hardy" }),
      null,
    );
    assert.equal(
      calculateMaxHP({ className: "fighter", level: "five", conScore: 10 }),
      null,
    );
  });
});

describe("the ceiling", () => {
  it("is a Barbarian at 20th with the best Constitution a sheet can hold", () => {
    const best =
      MAX_ABILITY +
      Math.max(
        ...Object.values(RACE_ABILITY_BONUSES).map((bonus) => bonus.con ?? 0),
      );

    assert.equal(
      MAX_HP,
      calculateMaxHP({
        className: "barbarian",
        level: MAX_LEVEL,
        conScore: best,
      }),
    );
    assert.equal(MAX_HP, 205);
  });

  it("is above every figure the catalogue can produce", () => {
    const best =
      MAX_ABILITY +
      Math.max(
        ...Object.values(RACE_ABILITY_BONUSES).map((bonus) => bonus.con ?? 0),
      );

    for (const archetype of ARCHETYPES) {
      for (const path of archetype.paths) {
        assert.ok(
          calculateMaxHP({
            className: path.id,
            level: MAX_LEVEL,
            conScore: best,
          }) <= MAX_HP,
        );
      }
    }
  });
});
