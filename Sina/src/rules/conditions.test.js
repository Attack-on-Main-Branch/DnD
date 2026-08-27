import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONDITIONS,
  CONDITION_KEYS,
  conditionDetails,
  conditionName,
  isCondition,
  readConditions,
  toggledConditions,
} from "./conditions.js";

describe("the catalogue", () => {
  it("holds the fifteen 5e names it", () => {
    assert.equal(CONDITION_KEYS.length, 15);

    for (const key of [
      "blinded",
      "charmed",
      "deafened",
      "frightened",
      "grappled",
      "incapacitated",
      "invisible",
      "paralyzed",
      "petrified",
      "poisoned",
      "prone",
      "restrained",
      "stunned",
      "unconscious",
      "exhaustion",
    ]) {
      assert.ok(isCondition(key), key);
    }
  });

  it("names every one of them", () => {
    for (const key of CONDITION_KEYS) {
      assert.equal(typeof CONDITIONS[key].name, "string", key);
      assert.ok(CONDITIONS[key].name.length > 0, key);
    }
  });

  it("answers nothing for a key it has never heard of", () => {
    assert.equal(isCondition("cursed"), false);
    assert.equal(conditionDetails("cursed"), null);
    assert.equal(conditionName("cursed"), "cursed");
  });
});

describe("readConditions", () => {
  it("keeps the catalogue's order rather than the array's", () => {
    assert.deepEqual(readConditions(["prone", "blinded", "poisoned"]), [
      "blinded",
      "poisoned",
      "prone",
    ]);
  });

  it("drops what it does not know, and repeats", () => {
    assert.deepEqual(readConditions(["prone", "cursed", "prone", 4]), [
      "prone",
    ]);
  });

  it("answers an empty list for a row that has never had one", () => {
    for (const value of [null, undefined, "prone", {}]) {
      assert.deepEqual(readConditions(value), []);
    }
  });
});

describe("toggledConditions", () => {
  it("adds one that is not there", () => {
    assert.deepEqual(toggledConditions(["prone"], "blinded"), {
      applied: true,
      conditions: ["blinded", "prone"],
    });
  });

  it("takes away one that is", () => {
    assert.deepEqual(toggledConditions(["blinded", "prone"], "prone"), {
      applied: false,
      conditions: ["blinded"],
    });
  });

  it("is null for a key the catalogue has never heard of", () => {
    assert.equal(toggledConditions(["prone"], "cursed"), null);
  });
});
