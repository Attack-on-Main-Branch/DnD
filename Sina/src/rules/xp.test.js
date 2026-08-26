import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_LEVEL } from "./level.js";
import {
  MAX_XP,
  MAX_XP_AWARD,
  parseXp,
  parseXpDelta,
  steppedXp,
  XP_THRESHOLDS,
  xpFraction,
  xpThreshold,
} from "./xp.js";

describe("the ladder", () => {
  it("costs what the table says at every rung", () => {
    assert.deepEqual(
      XP_THRESHOLDS,
      [
        200, 400, 500, 1100, 1400, 1700, 2100, 2400, 2800, 3600, 4500, 5100,
        5700, 6400, 7200, 8800, 9500, 10900, 12700,
      ],
    );
  });

  it("has a rung for every level but the last", () => {
    assert.equal(XP_THRESHOLDS.length, MAX_LEVEL - 1);
    assert.equal(xpThreshold(1), 200);
    assert.equal(xpThreshold(19), 12700);
  });

  it("has nothing left to reach at the top", () => {
    assert.equal(xpThreshold(MAX_LEVEL), null);
  });

  it("has no threshold for a level that is not one", () => {
    assert.equal(xpThreshold("nine"), null);
    assert.equal(xpThreshold(null), null);
  });
});

describe("reading a figure", () => {
  it("takes a whole number of experience", () => {
    assert.equal(parseXp(0), 0);
    assert.equal(parseXp("150"), 150);
    assert.equal(parseXp(12.4), 12);
  });

  it("clamps to the column's own ends", () => {
    assert.equal(parseXp(-40), 0);
    assert.equal(parseXp(MAX_XP + 1), MAX_XP);
  });

  it("has no figure for anything that is not one", () => {
    assert.equal(parseXp("some"), null);
    assert.equal(parseXp(undefined), null);
  });
});

describe("reading a press", () => {
  it("takes a whole award", () => {
    assert.equal(parseXpDelta("50"), 50);
    assert.equal(parseXpDelta(MAX_XP_AWARD), MAX_XP_AWARD);
  });

  it("refuses a press that is not one", () => {
    assert.equal(parseXpDelta(0), null);
    assert.equal(parseXpDelta(-10), null);
    assert.equal(parseXpDelta(2.5), null);
    assert.equal(parseXpDelta(""), null);
    assert.equal(parseXpDelta(MAX_XP_AWARD + 1), null);
  });
});

describe("how full the bar stands", () => {
  it("measures progress against this level's own cost", () => {
    assert.equal(xpFraction(100, 1), 0.5);
    assert.equal(xpFraction(0, 1), 0);
  });

  it("is full at the top of the ladder, whatever is stored", () => {
    assert.equal(xpFraction(0, MAX_LEVEL), 1);
  });

  it("cannot draw past its own track", () => {
    assert.equal(xpFraction(9999, 1), 1);
    assert.equal(xpFraction(-5, 1), 0);
  });
});

describe("a change", () => {
  it("banks a gain that does not reach the next rung", () => {
    assert.deepEqual(steppedXp(1, 150, 20), {
      level: 1,
      xp: 170,
      levelsGained: 0,
    });
  });

  it("spends the threshold and carries the remainder up", () => {
    assert.deepEqual(steppedXp(1, 150, 100), {
      level: 2,
      xp: 50,
      levelsGained: 1,
    });
  });

  it("climbs as many rungs as one award pays for", () => {
    // 200 + 400 + 500 = 1100 to reach 4th, and 300 over.
    assert.deepEqual(steppedXp(1, 0, 1400), {
      level: 4,
      xp: 300,
      levelsGained: 3,
    });
  });

  it("levels exactly on the threshold", () => {
    assert.deepEqual(steppedXp(1, 0, 200), {
      level: 2,
      xp: 0,
      levelsGained: 1,
    });
  });

  it("banks nothing at the top of the ladder", () => {
    assert.deepEqual(steppedXp(MAX_LEVEL, 0, 5000), {
      level: MAX_LEVEL,
      xp: 0,
      levelsGained: 0,
    });
  });

  it("stops climbing at the top however big the award", () => {
    const climbed = steppedXp(19, 0, MAX_XP_AWARD);

    assert.equal(climbed.level, MAX_LEVEL);
    assert.equal(climbed.xp, 0);
    assert.equal(climbed.levelsGained, 1);
  });

  it("takes experience back inside the rung it is standing on", () => {
    assert.deepEqual(steppedXp(5, 300, -100), {
      level: 5,
      xp: 200,
      levelsGained: 0,
    });
  });

  it("falls back a rung when a loss runs past zero", () => {
    // 4th costs 1100 to leave, so 50 short of it is 1050.
    assert.deepEqual(steppedXp(5, 50, -100), {
      level: 4,
      xp: 1050,
      levelsGained: -1,
    });
  });

  it("falls as many rungs as the loss is worth", () => {
    // 200 out of 3rd, then 400 of 2nd's own 400 — landing at the foot of 2nd.
    assert.deepEqual(steppedXp(3, 0, -400), {
      level: 2,
      xp: 0,
      levelsGained: -1,
    });
    assert.deepEqual(steppedXp(3, 0, -500), {
      level: 1,
      xp: 100,
      levelsGained: -2,
    });
  });

  it("puts a character back exactly where an award found them", () => {
    const climbed = steppedXp(1, 150, 100);
    const back = steppedXp(climbed.level, climbed.xp, -100);

    assert.deepEqual(back, { level: 1, xp: 150, levelsGained: -1 });
  });

  it("stops at the foot of the ladder rather than below it", () => {
    assert.deepEqual(steppedXp(1, 50, -900), {
      level: 1,
      xp: 0,
      levelsGained: 0,
    });
  });

  it("falls off the top into what the last rung cost", () => {
    // 20th banks nothing, so a loss is measured against 19th's own 12700.
    assert.deepEqual(steppedXp(MAX_LEVEL, 0, -700), {
      level: 19,
      xp: 12000,
      levelsGained: -1,
    });
  });

  it("has no answer for a level or a figure it cannot read", () => {
    assert.equal(steppedXp("nine", 0, 10), null);
    assert.equal(steppedXp(1, "lots", 10), null);
    assert.equal(steppedXp(1, 0, 1.5), null);
  });
});
