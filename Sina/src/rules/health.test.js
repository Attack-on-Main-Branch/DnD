import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { changeHitPoints, grantTempHitPoints, healthTier } from "./health.js";

const BAR = { current: 80, max: 102, temp: 20, tempMax: 20 };

describe("health tiers", () => {
  it("keeps half health orange, one quarter orange, and zero red", () => {
    for (const [current, expected] of [
      [100, "healthy"],
      [51, "healthy"],
      [50, "wounded"],
      [25, "wounded"],
      [24, "critical"],
      [1, "critical"],
      [0, "critical"],
    ]) {
      assert.equal(healthTier(current, 100), expected);
    }
  });

  it("uses the fraction without rounding it into the next tier", () => {
    assert.equal(healthTier(26, 102), "wounded");
    assert.equal(healthTier(25, 102), "critical");
    assert.equal(healthTier(51, 102), "wounded");
    assert.equal(healthTier(52, 102), "healthy");
  });
});

describe("temporary hit points", () => {
  it("absorbs damage before changing normal HP", () => {
    assert.deepEqual(changeHitPoints(BAR, -12), {
      ...BAR,
      temp: 8,
    });
    assert.deepEqual(changeHitPoints(BAR, -20), {
      ...BAR,
      temp: 0,
    });
    assert.deepEqual(changeHitPoints(BAR, -27), {
      ...BAR,
      current: 73,
      temp: 0,
    });
  });

  it("heals only normal HP and caps it at the original maximum", () => {
    const damaged = changeHitPoints(BAR, -27);
    assert.deepEqual(changeHitPoints(damaged, 205), {
      ...BAR,
      current: 102,
      temp: 0,
    });
    assert.deepEqual(changeHitPoints(changeHitPoints(BAR, -12), 10), {
      ...BAR,
      current: 90,
      temp: 8,
    });
  });

  it("keeps the higher grant instead of stacking or replacing it with less", () => {
    assert.equal(grantTempHitPoints(BAR, 5), BAR);
    assert.equal(grantTempHitPoints(BAR, 20), BAR);
    assert.deepEqual(grantTempHitPoints(BAR, 30), {
      ...BAR,
      temp: 30,
      tempMax: 30,
    });
  });

  it("starts a new bar after the previous grant is consumed", () => {
    assert.deepEqual(grantTempHitPoints(changeHitPoints(BAR, -20), 5), {
      ...BAR,
      temp: 5,
      tempMax: 5,
    });
  });

  it("leaves HP at zero after an overflowing blow, and never heals through temp HP", () => {
    assert.deepEqual(changeHitPoints(BAR, -205), {
      ...BAR,
      current: 0,
      temp: 0,
    });
    assert.deepEqual(grantTempHitPoints({ ...BAR, current: 0 }, 30), {
      ...BAR,
      current: 0,
      temp: 30,
      tempMax: 30,
    });
  });
});
