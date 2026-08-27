import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ABILITY_IDS,
  isAbilityId,
  MAX_ABILITY_TOTAL,
  MIN_ABILITY_TOTAL,
  parseAbilityTotal,
} from "./ability-scores.js";
import { ABILITIES, MAX_ABILITY, MIN_ABILITY } from "./character.js";

describe("the six ids", () => {
  it("is the catalogue's own list, in its own order", () => {
    // This module does not import the catalogue — it would carry RACES and the
    // artwork into the browser with it — so this is what keeps them in step.
    assert.deepEqual(
      ABILITY_IDS,
      ABILITIES.map((ability) => ability.id),
    );
  });

  it("knows an ability from anything else", () => {
    assert.equal(isAbilityId("con"), true);
    assert.equal(isAbilityId("luck"), false);
    assert.equal(isAbilityId(""), false);
    assert.equal(isAbilityId(null), false);
    assert.equal(isAbilityId("CON"), false);
  });
});

describe("a total somebody types", () => {
  it("reads a whole number", () => {
    assert.equal(parseAbilityTotal("18"), 18);
    assert.equal(parseAbilityTotal(18), 18);
    assert.equal(parseAbilityTotal(" 18 "), 18);
  });

  it("rounds rather than refusing a fraction", () => {
    assert.equal(parseAbilityTotal("17.6"), 18);
  });

  it("holds the ends rather than refusing them", () => {
    assert.equal(parseAbilityTotal("300"), MAX_ABILITY_TOTAL);
    assert.equal(parseAbilityTotal("-4"), MIN_ABILITY_TOTAL);
    assert.equal(parseAbilityTotal("0"), MIN_ABILITY_TOTAL);
  });

  it("is null for anything that is not a figure", () => {
    assert.equal(parseAbilityTotal(""), null);
    assert.equal(parseAbilityTotal("   "), null);
    assert.equal(parseAbilityTotal("eighteen"), null);
    assert.equal(parseAbilityTotal(null), null);
  });

  it("reaches past what a player may buy, which is the point of it", () => {
    assert.ok(MAX_ABILITY_TOTAL > MAX_ABILITY);
    assert.ok(MIN_ABILITY_TOTAL < MIN_ABILITY);
  });
});
