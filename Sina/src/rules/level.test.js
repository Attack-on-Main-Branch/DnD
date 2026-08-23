import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_LEVEL, MIN_LEVEL, parseLevel, steppedLevel } from "./level.js";

describe("the bounds", () => {
  it("holds the two ends characters_level_check keeps", () => {
    assert.equal(MIN_LEVEL, 1);
    assert.equal(MAX_LEVEL, 20);
  });
});

describe("parseLevel", () => {
  it("reads a number typed as a string", () => {
    assert.equal(parseLevel("7"), 7);
  });

  it("clamps rather than refusing either end", () => {
    assert.equal(parseLevel(0), MIN_LEVEL);
    assert.equal(parseLevel(-4), MIN_LEVEL);
    assert.equal(parseLevel(21), MAX_LEVEL);
  });

  it("rounds a fraction to a whole level", () => {
    assert.equal(parseLevel(6.4), 6);
    assert.equal(parseLevel(6.5), 7);
  });

  it("answers null for anything that is not a number at all", () => {
    assert.equal(parseLevel("nine"), null);
    assert.equal(parseLevel({}), null);
  });

  it("reads nothing at all as the floor, the way parseHitPoints does", () => {
    // `?? ""` makes both of these the empty string, and `Number("")` is 0 —
    // a number, and therefore clamped rather than refused. Stated here because
    // the two parsers have to agree: nothing in this app types a level, but the
    // control that types hit points has behaved this way since it shipped.
    assert.equal(parseLevel(""), MIN_LEVEL);
    assert.equal(parseLevel(null), MIN_LEVEL);
    assert.equal(parseLevel(undefined), MIN_LEVEL);
  });
});

describe("steppedLevel", () => {
  it("moves one in either direction", () => {
    assert.equal(steppedLevel(5, 1), 6);
    assert.equal(steppedLevel(5, -1), 4);
  });

  it("answers null at the end a press cannot move past", () => {
    // What the rail reads to decide whether to draw the arrow at all.
    assert.equal(steppedLevel(MAX_LEVEL, 1), null);
    assert.equal(steppedLevel(MIN_LEVEL, -1), null);
  });

  it("still moves at the end it is stepping away from", () => {
    assert.equal(steppedLevel(MAX_LEVEL, -1), 19);
    assert.equal(steppedLevel(MIN_LEVEL, 1), 2);
  });

  it("answers null for a level or a step it cannot read", () => {
    assert.equal(steppedLevel("nine", 1), null);
    assert.equal(steppedLevel(5, 0), null);
    assert.equal(steppedLevel(5, 1.5), null);
  });
});
