import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DICE_SKIN_RARITIES,
  DICE_SKIN_VALUES,
  diceSkinRarity,
} from "./character.js";
import {
  DICE_POUCH_ODDS,
  dicePouchChances,
  dicePouchPool,
  drawDiceSkin,
  isDicePouch,
  isDiceSkinUnlocked,
  unlockedDiceSkins,
} from "./dice-pouch.js";

describe("unlockedDiceSkins", () => {
  it("always holds classic, and nothing else for a new character", () => {
    assert.deepEqual(unlockedDiceSkins([]), ["classic"]);
    assert.deepEqual(unlockedDiceSkins(null), ["classic"]);
  });

  it("keeps the catalogue's order and drops what is not a set", () => {
    assert.deepEqual(
      unlockedDiceSkins([
        { skin: "companion" },
        { skin: "galaxy" },
        { skin: "gold-plated" },
      ]),
      ["classic", "galaxy", "companion"],
    );
  });
});

describe("isDiceSkinUnlocked", () => {
  it("unlocks classic without being told", () => {
    assert.equal(isDiceSkinUnlocked("classic", []), true);
    assert.equal(isDiceSkinUnlocked("wood", []), false);
    assert.equal(isDiceSkinUnlocked("wood", ["wood"]), true);
  });
});

describe("dicePouchPool", () => {
  it("is every set but the ones already held", () => {
    const pool = dicePouchPool(["classic", "wood"]);

    assert.equal(pool.length, DICE_SKIN_VALUES.length - 2);
    assert.equal(pool.includes("wood"), false);
    assert.equal(pool.includes("classic"), false);
  });

  it("is empty once everything is found", () => {
    assert.deepEqual(dicePouchPool(DICE_SKIN_VALUES), []);
  });
});

describe("dicePouchChances", () => {
  const sum = (chances) =>
    chances.reduce((total, one) => total + one.chance, 0);

  it("adds up to one, and gives the odds to each rarity", () => {
    const chances = dicePouchChances([]);

    assert.ok(Math.abs(sum(chances) - 1) < 1e-9);

    const legendary = chances
      .filter((one) => diceSkinRarity(one.skin) === "legendary")
      .reduce((total, one) => total + one.chance, 0);

    assert.ok(Math.abs(legendary - DICE_POUCH_ODDS.legendary / 100) < 1e-9);
  });

  it("makes a rarer set less likely when each rarity has one set left", () => {
    const remaining = [
      "crystal",
      "cracked",
      "galaxy",
      "wood",
      "epoxy",
      "asiimov",
    ];
    const unlocked = DICE_SKIN_VALUES.filter(
      (skin) => !remaining.includes(skin),
    );
    const chances = new Map(
      dicePouchChances(unlocked).map((one) => [one.skin, one.chance]),
    );

    for (let at = 1; at < remaining.length; at++) {
      assert.ok(chances.get(remaining[at - 1]) > chances.get(remaining[at]));
    }
  });

  it("shares a finished rarity's odds among the rest", () => {
    const chances = dicePouchChances(["crystal", "glass", "fade", "ornate"]);

    assert.equal(
      chances.some((one) => one.skin === "crystal"),
      false,
    );
    assert.ok(Math.abs(sum(chances) - 1) < 1e-9);
  });

  it("is empty once there is nothing left to find", () => {
    assert.deepEqual(dicePouchChances(DICE_SKIN_VALUES), []);
  });

  it("has odds for every rarity", () => {
    assert.deepEqual(Object.keys(DICE_POUCH_ODDS), DICE_SKIN_RARITIES);
  });
});

describe("drawDiceSkin", () => {
  const chances = [
    { skin: "crystal", chance: 0.5 },
    { skin: "wood", chance: 0.5 },
  ];

  it("walks the odds in order", () => {
    assert.equal(
      drawDiceSkin(chances, () => 0.1),
      "crystal",
    );
    assert.equal(
      drawDiceSkin(chances, () => 0.7),
      "wood",
    );
  });

  it("has nothing to draw from nothing", () => {
    assert.equal(
      drawDiceSkin([], () => 0.5),
      null,
    );
  });
});

describe("isDicePouch", () => {
  it("knows the pouch by its slug alone", () => {
    assert.equal(isDicePouch("dice-pouch"), true);
    assert.equal(isDicePouch("custom:dice-pouch"), false);
  });
});
