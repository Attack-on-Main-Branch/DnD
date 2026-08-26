import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isRestType,
  longRestSlotLevels,
  REST_TYPES,
  shortRestSlotLevels,
} from "./rest.js";

describe("the two rests", () => {
  it("knows a rest from anything else", () => {
    assert.deepEqual(REST_TYPES, ["short", "long"]);
    assert.equal(isRestType("long"), true);
    assert.equal(isRestType("nap"), false);
    assert.equal(isRestType(undefined), false);
  });
});

describe("what a short rest reaches", () => {
  it("hands a Warlock their pact slots back", () => {
    assert.deepEqual(shortRestSlotLevels("warlock", 5), [3]);
  });

  it("reaches nothing a full caster holds", () => {
    assert.deepEqual(shortRestSlotLevels("wizard", 5), []);
  });

  it("reaches nothing at all for a class that casts nothing", () => {
    assert.deepEqual(shortRestSlotLevels("fighter", 5), []);
  });
});

describe("what a long rest reaches", () => {
  it("takes every slot the class and level grant", () => {
    assert.deepEqual(longRestSlotLevels("wizard", 5), [1, 2, 3]);
    assert.deepEqual(longRestSlotLevels("warlock", 5), [3]);
  });

  it("takes nothing from somebody who casts nothing", () => {
    assert.deepEqual(longRestSlotLevels("fighter", 20), []);
  });
});
