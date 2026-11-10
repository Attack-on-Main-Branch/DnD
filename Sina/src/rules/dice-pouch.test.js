import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DICE_SKIN_VALUES } from "./character.js";
import {
  BANNER_SKIN_VALUES,
  SKIN_RARITIES,
  bannerSkinRarity,
  validateBannerSkin,
} from "./skins.js";
import {
  POUCH_ODDS,
  pouchChances,
  pouchPool,
  drawPouchSkin,
  isPouch,
  isDiceSkinUnlocked,
  isBannerSkinUnlocked,
  unlockedDiceSkins,
  unlockedBannerSkins,
} from "./dice-pouch.js";

const complete = { dice: DICE_SKIN_VALUES, banner: BANNER_SKIN_VALUES };

describe("skin collections", () => {
  it("starts with Classic in both collections and discards unknown unlocks", () => {
    assert.deepEqual(unlockedDiceSkins(null), ["classic"]);
    assert.deepEqual(
      unlockedDiceSkins([
        { skin: "companion" },
        { skin: "galaxy" },
        { skin: "unknown" },
      ]),
      ["classic", "galaxy", "companion"],
    );
    assert.deepEqual(unlockedBannerSkins(null), ["classic"]);
    assert.deepEqual(
      unlockedBannerSkins([
        { skin: "unknown" },
        { skin: "splash" },
        { skin: "vignette" },
        { skin: "cyberpunk" },
        { skin: "shattered-glass" },
        { skin: "pixel-night" },
        { skin: "topography" },
        { skin: "hexagon" },
        { skin: "spider-lilies" },
        { skin: "sakura" },
        { skin: "lightning" },
        { skin: "printstream" },
        { skin: "wings-of-freedom" },
        { skin: "dragon-lore" },
        { skin: "dragon-lore" },
      ]),
      BANNER_SKIN_VALUES,
    );
    assert.equal(isDiceSkinUnlocked("classic", []), true);
    assert.equal(isDiceSkinUnlocked("wood", []), false);
    assert.equal(isBannerSkinUnlocked("classic", []), true);
    assert.equal(isBannerSkinUnlocked("dragon-lore", []), false);
    assert.equal(isBannerSkinUnlocked("dragon-lore", ["dragon-lore"]), true);
  });

  it("keeps Iconic banners locked until found and rejects unknown banners", () => {
    for (const skin of ["dragon-lore", "printstream", "wings-of-freedom"]) {
      assert.equal(bannerSkinRarity(skin), "iconic");
      assert.equal(validateBannerSkin(skin), null);
      assert.equal(isBannerSkinUnlocked(skin, []), false);
      assert.equal(isBannerSkinUnlocked(skin, [skin]), true);
      assert.deepEqual(
        pouchChances({
          dice: DICE_SKIN_VALUES,
          banner: BANNER_SKIN_VALUES.filter((value) => value !== skin),
        }),
        [{ kind: "banner", skin, rarity: "iconic", chance: 1 }],
      );
    }
    for (const value of [null, "", "galaxy", "unknown"])
      assert.equal(validateBannerSkin(value).reason, "invalid_skin");
  });

  it("finds Common banners as rewards rather than starter banners", () => {
    for (const skin of ["splash", "vignette"]) {
      assert.equal(bannerSkinRarity(skin), "common");
      assert.equal(validateBannerSkin(skin), null);
      assert.equal(isBannerSkinUnlocked(skin, []), false);
      assert.equal(isBannerSkinUnlocked(skin, [skin]), true);
      const banner = BANNER_SKIN_VALUES.filter((value) => value !== skin);
      assert.deepEqual(pouchChances({ dice: DICE_SKIN_VALUES, banner }), [
        { kind: "banner", skin, rarity: "common", chance: 1 },
      ]);
    }
  });

  it("finds Epic banners only after their rewards are unlocked", () => {
    for (const skin of ["topography", "hexagon"]) {
      assert.equal(bannerSkinRarity(skin), "epic");
      assert.equal(validateBannerSkin(skin), null);
      assert.equal(isBannerSkinUnlocked(skin, []), false);
      assert.equal(isBannerSkinUnlocked(skin, [skin]), true);
      assert.deepEqual(
        pouchChances({
          dice: DICE_SKIN_VALUES,
          banner: BANNER_SKIN_VALUES.filter((value) => value !== skin),
        }),
        [{ kind: "banner", skin, rarity: "epic", chance: 1 }],
      );
    }
  });

  it("keeps Uncommon and Rare banners locked until their rewards are found", () => {
    for (const [skin, rarity] of [
      ["cyberpunk", "uncommon"],
      ["shattered-glass", "rare"],
      ["pixel-night", "rare"],
    ]) {
      assert.equal(bannerSkinRarity(skin), rarity);
      assert.equal(validateBannerSkin(skin), null);
      assert.equal(isBannerSkinUnlocked(skin, []), false);
      assert.equal(isBannerSkinUnlocked(skin, [skin]), true);
      const banner = BANNER_SKIN_VALUES.filter((value) => value !== skin);
      assert.deepEqual(pouchChances({ dice: DICE_SKIN_VALUES, banner }), [
        { kind: "banner", skin, rarity, chance: 1 },
      ]);
    }
  });

  it("finds legendary banners only after they are unlocked", () => {
    for (const skin of ["spider-lilies", "sakura", "lightning"]) {
      assert.equal(bannerSkinRarity(skin), "legendary");
      assert.equal(validateBannerSkin(skin), null);
      assert.equal(isBannerSkinUnlocked(skin, []), false);
      assert.equal(isBannerSkinUnlocked(skin, [skin]), true);
    }
  });
});

describe("mixed pouch draws", () => {
  it("keeps dice and banner unlocks separate and excludes every owned reward", () => {
    const pool = pouchPool({ dice: ["classic", "wood"] });
    assert.equal(
      pool.length,
      DICE_SKIN_VALUES.length + BANNER_SKIN_VALUES.length - 3,
    );
    assert.ok(
      pool.some(
        ({ kind, skin }) => kind === "banner" && skin === "dragon-lore",
      ),
    );
    assert.ok(!pool.some(({ skin }) => skin === "classic" || skin === "wood"));
    assert.deepEqual(pouchPool(complete), []);
    assert.deepEqual(pouchPool({ dice: DICE_SKIN_VALUES }), [
      { kind: "banner", skin: "splash", rarity: "common" },
      { kind: "banner", skin: "vignette", rarity: "common" },
      { kind: "banner", skin: "cyberpunk", rarity: "uncommon" },
      { kind: "banner", skin: "shattered-glass", rarity: "rare" },
      { kind: "banner", skin: "pixel-night", rarity: "rare" },
      { kind: "banner", skin: "topography", rarity: "epic" },
      { kind: "banner", skin: "hexagon", rarity: "epic" },
      { kind: "banner", skin: "spider-lilies", rarity: "legendary" },
      { kind: "banner", skin: "sakura", rarity: "legendary" },
      { kind: "banner", skin: "lightning", rarity: "legendary" },
      { kind: "banner", skin: "dragon-lore", rarity: "iconic" },
      { kind: "banner", skin: "printstream", rarity: "iconic" },
      { kind: "banner", skin: "wings-of-freedom", rarity: "iconic" },
    ]);
  });

  it("preserves each rarity's weight and shares it across both kinds", () => {
    const chances = pouchChances();
    assert.deepEqual(Object.keys(POUCH_ODDS), SKIN_RARITIES);
    assert.ok(
      Math.abs(chances.reduce((sum, reward) => sum + reward.chance, 0) - 1) <
        1e-9,
    );
    for (const rarity of SKIN_RARITIES) {
      const rewards = chances.filter((reward) => reward.rarity === rarity);
      const total = rewards.reduce((sum, reward) => sum + reward.chance, 0);
      assert.ok(Math.abs(total - POUCH_ODDS[rarity] / 100) < 1e-9);
      assert.ok(rewards.every((reward) => reward.chance === rewards[0].chance));
    }
    assert.equal(
      chances.find(({ skin }) => skin === "dragon-lore").chance,
      0.02 / 6,
    );
    assert.equal(
      chances.find(({ skin }) => skin === "printstream").chance,
      0.02 / 6,
    );
  });

  it("keeps awarding banners after all dice are found and stops only when both are complete", () => {
    assert.deepEqual(pouchChances({ dice: DICE_SKIN_VALUES }), [
      { kind: "banner", skin: "splash", rarity: "common", chance: 1 / 5 },
      { kind: "banner", skin: "vignette", rarity: "common", chance: 1 / 5 },
      { kind: "banner", skin: "cyberpunk", rarity: "uncommon", chance: 6 / 25 },
      {
        kind: "banner",
        skin: "shattered-glass",
        rarity: "rare",
        chance: 2 / 25,
      },
      { kind: "banner", skin: "pixel-night", rarity: "rare", chance: 2 / 25 },
      { kind: "banner", skin: "topography", rarity: "epic", chance: 3 / 50 },
      { kind: "banner", skin: "hexagon", rarity: "epic", chance: 3 / 50 },
      {
        kind: "banner",
        skin: "spider-lilies",
        rarity: "legendary",
        chance: 1 / 50,
      },
      { kind: "banner", skin: "sakura", rarity: "legendary", chance: 1 / 50 },
      {
        kind: "banner",
        skin: "lightning",
        rarity: "legendary",
        chance: 1 / 50,
      },
      {
        kind: "banner",
        skin: "dragon-lore",
        rarity: "iconic",
        chance: 1 / 150,
      },
      {
        kind: "banner",
        skin: "printstream",
        rarity: "iconic",
        chance: 1 / 150,
      },
      {
        kind: "banner",
        skin: "wings-of-freedom",
        rarity: "iconic",
        chance: 1 / 150,
      },
    ]);
    assert.deepEqual(
      pouchChances({
        dice: DICE_SKIN_VALUES,
        banner: BANNER_SKIN_VALUES.filter((skin) => skin !== "printstream"),
      }),
      [{ kind: "banner", skin: "printstream", rarity: "iconic", chance: 1 }],
    );
    assert.deepEqual(pouchChances(complete), []);
    const chances = pouchChances({
      dice: ["classic", "crystal", "glass", "fade", "ornate"],
      banner: ["splash", "vignette"],
    });
    assert.ok(!chances.some(({ rarity }) => rarity === "common"));
    assert.ok(
      Math.abs(chances.reduce((sum, one) => sum + one.chance, 0) - 1) < 1e-9,
    );
  });

  it("can award Spider Lilies last and never awards an owned banner again", () => {
    const banner = BANNER_SKIN_VALUES.filter(
      (skin) => skin !== "spider-lilies",
    );
    const chances = pouchChances({ dice: DICE_SKIN_VALUES, banner });
    assert.deepEqual(chances, [
      { kind: "banner", skin: "spider-lilies", rarity: "legendary", chance: 1 },
    ]);
    assert.equal(drawPouchSkin(chances, () => 0.99).skin, "spider-lilies");
    assert.deepEqual(
      pouchPool({
        dice: DICE_SKIN_VALUES,
        banner: [...banner, "spider-lilies"],
      }),
      [],
    );
  });

  it("draws the complete reward, including its kind, for reel filler", () => {
    const chances = [
      { kind: "dice", skin: "wood", chance: 0.5 },
      { kind: "banner", skin: "dragon-lore", chance: 0.5 },
    ];
    assert.equal(
      drawPouchSkin(chances, () => 0.1),
      chances[0],
    );
    assert.equal(
      drawPouchSkin(chances, () => 0.7),
      chances[1],
    );
    assert.equal(
      drawPouchSkin([], () => 0.5),
      null,
    );
  });

  it("recognizes existing pouches by their reserved slug", () => {
    assert.equal(isPouch("dice-pouch"), true);
    assert.equal(isPouch("custom:dice-pouch"), false);
  });
});
