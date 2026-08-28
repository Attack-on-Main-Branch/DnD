import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DICE,
  DICE_CORNERS,
  diceCorner,
  isDie,
  MAX_DICE_COUNT,
  parseDiceCount,
  readDiceResult,
  rollDice,
} from "./dice.js";

describe("diceCorner", () => {
  it("gives the same corner for the same seed", () => {
    // The whole point: every chair works this out for itself and has to agree.
    assert.equal(diceCorner(1234567), diceCorner(1234567));
  });

  it("stays inside the corners the arena has places for", () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const corner = diceCorner(seed * 7919);

      assert.ok(Number.isInteger(corner));
      assert.ok(corner >= 0 && corner < DICE_CORNERS);
    }
  });

  it("uses every corner", () => {
    const seen = new Set();

    for (let seed = 0; seed < DICE_CORNERS; seed += 1) {
      seen.add(diceCorner(seed));
    }

    assert.equal(seen.size, DICE_CORNERS);
  });

  it("does not fall off the end of a negative seed", () => {
    // Nothing sends one, but a number off the wire is a number off the wire,
    // and a negative index would throw the dice from nowhere at all.
    assert.equal(diceCorner(-1), DICE_CORNERS - 1);
  });

  it("falls back to the first corner for anything that is not a seed", () => {
    for (const value of [null, undefined, "3", 1.5, Number.NaN]) {
      assert.equal(diceCorner(value), 0);
    }
  });
});

describe("the catalogue", () => {
  it("holds the seven dice a table uses", () => {
    assert.deepEqual(
      DICE.map((die) => die.id),
      ["d4", "d6", "d8", "d10", "d12", "d20", "d100"],
    );
  });

  it("names each die after its own face count", () => {
    for (const die of DICE) {
      assert.equal(die.id, `d${die.sides}`);
    }
  });

  it("knows a die from anything else", () => {
    assert.equal(isDie("d20"), true);
    assert.equal(isDie("d3"), false);
    assert.equal(isDie(""), false);
    assert.equal(isDie(undefined), false);
  });
});

describe("how many dice a throw is", () => {
  it("takes a whole number of dice", () => {
    assert.equal(parseDiceCount(1), 1);
    assert.equal(parseDiceCount("3"), 3);
    assert.equal(parseDiceCount(MAX_DICE_COUNT), MAX_DICE_COUNT);
  });

  it("clamps at the ceiling rather than refusing", () => {
    assert.equal(parseDiceCount(MAX_DICE_COUNT + 1), MAX_DICE_COUNT);
    assert.equal(parseDiceCount(9999), MAX_DICE_COUNT);
  });

  it("has no count for anything that is not one", () => {
    assert.equal(parseDiceCount(0), null);
    assert.equal(parseDiceCount(-2), null);
    assert.equal(parseDiceCount(1.5), null);
    assert.equal(parseDiceCount(""), null);
    assert.equal(parseDiceCount(null), null);
    assert.equal(parseDiceCount(undefined), null);
    assert.equal(parseDiceCount("three"), null);
  });
});

describe("rolling", () => {
  it("refuses a die that is not in the catalogue", () => {
    assert.equal(rollDice("d7"), null);
  });

  it("refuses a count that is not one", () => {
    assert.equal(rollDice("d20", 0), null);
    assert.equal(rollDice("d20", 2.5), null);
  });

  it("stays within the die's own faces", () => {
    for (const die of DICE) {
      for (let attempt = 0; attempt < 500; attempt++) {
        const value = rollDice(die.id);

        assert.ok(Number.isInteger(value));
        assert.ok(value >= 1 && value <= die.sides);
      }
    }
  });

  it("stays between one and all faces for a handful", () => {
    for (let attempt = 0; attempt < 2000; attempt++) {
      const total = rollDice("d6", 4);

      assert.ok(Number.isInteger(total));
      assert.ok(total >= 4 && total <= 24);
    }
  });

  it("throws no more than the ceiling, however many are asked for", () => {
    for (let attempt = 0; attempt < 500; attempt++) {
      assert.ok(rollDice("d4", 500) <= MAX_DICE_COUNT * 4);
    }
  });

  /* Not a fairness proof — 20,000 draws cannot be one — but a modulo bias bad
     enough to matter would leave whole faces empty over this many. */
  it("reaches every face of a d20", () => {
    const seen = new Set();

    for (let attempt = 0; attempt < 20000; attempt++) {
      seen.add(rollDice("d20"));
    }

    assert.equal(seen.size, 20);
  });
});

describe("reading a result back", () => {
  it("takes a face the die actually has", () => {
    assert.equal(readDiceResult("d20", 1, 18), 18);
    assert.equal(readDiceResult("d20", 1, "18"), 18);
    assert.equal(readDiceResult("d4", 1, 1), 1);
  });

  it("takes a total a handful could have come to", () => {
    assert.equal(readDiceResult("d6", 3, 3), 3);
    assert.equal(readDiceResult("d6", 3, 14), 14);
    assert.equal(readDiceResult("d6", 3, 18), 18);
  });

  it("refuses a total outside the dice", () => {
    assert.equal(readDiceResult("d20", 1, 21), null);
    assert.equal(readDiceResult("d20", 1, 0), null);
    assert.equal(readDiceResult("d20", 1, -3), null);
    assert.equal(readDiceResult("d6", 3, 2), null);
    assert.equal(readDiceResult("d6", 3, 19), null);
  });

  it("refuses anything that is not a whole number", () => {
    assert.equal(readDiceResult("d20", 1, 4.5), null);
    assert.equal(readDiceResult("d20", 1, null), null);
    assert.equal(readDiceResult("d20", 1, undefined), null);
    assert.equal(readDiceResult("d20", 1, "eighteen"), null);
  });

  it("refuses a die it does not hold, and a count it cannot read", () => {
    assert.equal(readDiceResult("d7", 1, 3), null);
    assert.equal(readDiceResult("d20", 0, 3), null);
    assert.equal(readDiceResult("d20", null, 3), null);
  });
});
