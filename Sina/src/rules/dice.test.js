import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DICE, dieSides, isDie, readDieResult, rollDie } from "./dice.js";

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

  it("has no sides for a die it does not hold", () => {
    assert.equal(dieSides("d20"), 20);
    assert.equal(dieSides("d7"), null);
  });
});

describe("rolling", () => {
  it("refuses a die that is not in the catalogue", () => {
    assert.equal(rollDie("d7"), null);
  });

  it("stays within the die's own faces", () => {
    for (const die of DICE) {
      for (let attempt = 0; attempt < 500; attempt++) {
        const value = rollDie(die.id);

        assert.ok(Number.isInteger(value));
        assert.ok(value >= 1 && value <= die.sides);
      }
    }
  });

  /* Not a fairness proof — 20,000 draws cannot be one — but a modulo bias bad
     enough to matter would leave whole faces empty over this many. */
  it("reaches every face of a d20", () => {
    const seen = new Set();

    for (let attempt = 0; attempt < 20000; attempt++) {
      seen.add(rollDie("d20"));
    }

    assert.equal(seen.size, 20);
  });
});

describe("reading a result back", () => {
  it("takes a face the die actually has", () => {
    assert.equal(readDieResult("d20", 18), 18);
    assert.equal(readDieResult("d20", "18"), 18);
    assert.equal(readDieResult("d4", 1), 1);
  });

  it("refuses a face outside the die", () => {
    assert.equal(readDieResult("d20", 21), null);
    assert.equal(readDieResult("d20", 0), null);
    assert.equal(readDieResult("d20", -3), null);
  });

  it("refuses anything that is not a whole number", () => {
    assert.equal(readDieResult("d20", 4.5), null);
    assert.equal(readDieResult("d20", null), null);
    assert.equal(readDieResult("d20", undefined), null);
    assert.equal(readDieResult("d20", "eighteen"), null);
  });

  it("refuses a die it does not hold", () => {
    assert.equal(readDieResult("d7", 3), null);
  });
});
