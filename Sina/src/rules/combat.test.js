import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  initiativeOrder,
  MAX_INITIATIVE,
  MIN_COMBAT_ROUND,
  MIN_INITIATIVE,
  parseInitiative,
  readCombat,
} from "./combat.js";

const TOKEN = "6f1c3d2e-0000-4000-8000-0000000000t1";

function piece(over = {}) {
  return {
    id: TOKEN,
    initiative: 12,
    isDead: false,
    placedAt: "2026-09-26T09:00:00.000Z",
    ...over,
  };
}

describe("parseInitiative", () => {
  it("takes a whole number inside the bounds", () => {
    assert.equal(parseInitiative(17), 17);
    assert.equal(parseInitiative("17"), 17);
    assert.equal(parseInitiative(MIN_INITIATIVE), MIN_INITIATIVE);
    assert.equal(parseInitiative(MAX_INITIATIVE), MAX_INITIATIVE);
  });

  it("reads zero as zero and not as absent", () => {
    assert.equal(parseInitiative(0), 0);
    assert.equal(parseInitiative("0"), 0);
  });

  it("reads an empty box as out of the fight rather than as zero", () => {
    assert.equal(parseInitiative(""), null);
    assert.equal(parseInitiative(null), null);
    assert.equal(parseInitiative(undefined), null);
  });

  it("refuses anything that is not a whole number in range", () => {
    assert.equal(parseInitiative("12abc"), null);
    assert.equal(parseInitiative(12.5), null);
    assert.equal(parseInitiative(MAX_INITIATIVE + 1), null);
    assert.equal(parseInitiative(MIN_INITIATIVE - 1), null);
    assert.equal(parseInitiative(Number.NaN), null);
  });
});

describe("readCombat", () => {
  it("reads a row as the table's own state", () => {
    assert.deepEqual(
      readCombat({
        is_in_combat: true,
        active_turn_token_id: TOKEN,
        combat_round: 4,
      }),
      { inCombat: true, activeTokenId: TOKEN, round: 4 },
    );
  });

  it("reads a message off the wire the same way", () => {
    assert.deepEqual(
      readCombat({ inCombat: true, activeTokenId: TOKEN, round: 2 }),
      { inCombat: true, activeTokenId: TOKEN, round: 2 },
    );
  });

  it("rests at the first round when the number is one nothing wrote", () => {
    assert.equal(readCombat({ combat_round: 0 }).round, MIN_COMBAT_ROUND);
    assert.equal(readCombat({ combat_round: "many" }).round, MIN_COMBAT_ROUND);
    assert.equal(readCombat(null).round, MIN_COMBAT_ROUND);
  });

  it("holds no cursor for a token id that is not one", () => {
    assert.equal(readCombat({ active_turn_token_id: "" }).activeTokenId, null);
    assert.equal(readCombat({ active_turn_token_id: 7 }).activeTokenId, null);
  });
});

describe("initiativeOrder", () => {
  it("puts the highest first", () => {
    const order = initiativeOrder([
      piece({ id: "a", initiative: 4 }),
      piece({ id: "b", initiative: 20 }),
      piece({ id: "c", initiative: 11 }),
    ]);

    assert.deepEqual(
      order.map((one) => one.id),
      ["b", "c", "a"],
    );
  });

  it("leaves out anything that has not rolled or is dead", () => {
    const order = initiativeOrder([
      piece({ id: "a", initiative: null }),
      piece({ id: "b", initiative: 8, isDead: true }),
      piece({ id: "c", initiative: 3 }),
    ]);

    assert.deepEqual(
      order.map((one) => one.id),
      ["c"],
    );
  });

  it("breaks a tie by when the piece was put down, then by id", () => {
    const early = "2026-09-26T09:00:00.000Z";
    const late = "2026-09-26T09:30:00.000Z";

    const order = initiativeOrder([
      piece({ id: "z", placedAt: early }),
      piece({ id: "a", placedAt: late }),
      piece({ id: "b", placedAt: early }),
    ]);

    assert.deepEqual(
      order.map((one) => one.id),
      ["b", "z", "a"],
    );
  });

  it("does not reorder the list it was handed", () => {
    const given = [piece({ id: "a", initiative: 1 }), piece({ id: "b" })];

    initiativeOrder(given);

    assert.deepEqual(
      given.map((one) => one.id),
      ["a", "b"],
    );
  });

  it("answers with nothing for anything that is not a list", () => {
    assert.deepEqual(initiativeOrder(null), []);
    assert.deepEqual(initiativeOrder(undefined), []);
  });
});
