import {
  SKIN_RARITIES,
  BANNER_SKIN_VALUES,
  DEFAULT_BANNER_SKIN,
  bannerSkinRarity,
} from "./skins.js";

import {
  DEFAULT_DICE_SKIN,
  DICE_SKIN_VALUES,
  diceSkinRarity,
} from "./character.js";

/** The stack a pouch is carried as. Mirrors `guard_dice_pouch`. */
export const POUCH_SLUG = "dice-pouch";

/**
 * Out of 100, for a rarity that still has a skin left to give. Mirrors the odds
 * in `open_pouch`.
 */
export const POUCH_ODDS = {
  common: 40,
  uncommon: 24,
  rare: 16,
  epic: 12,
  legendary: 6,
  iconic: 2,
};

/** What every character starts with. Never stored. */
export const STARTER_DICE_SKINS = [DEFAULT_DICE_SKIN];

export function isPouch(slug) {
  return slug === POUCH_SLUG;
}

/** A character's sets off their unlock rows, starter included, commonest first. */
export function unlockedDiceSkins(rows) {
  const held = new Set([
    ...STARTER_DICE_SKINS,
    ...(rows ?? []).map((row) => row?.skin),
  ]);

  return DICE_SKIN_VALUES.filter((skin) => held.has(skin));
}

export function isDiceSkinUnlocked(skin, unlocked) {
  return STARTER_DICE_SKINS.includes(skin) || (unlocked ?? []).includes(skin);
}

export function unlockedBannerSkins(rows) {
  const held = new Set([
    DEFAULT_BANNER_SKIN,
    ...(rows ?? []).map((row) => row?.skin),
  ]);
  return BANNER_SKIN_VALUES.filter((skin) => held.has(skin));
}

export function isBannerSkinUnlocked(skin, unlocked) {
  return skin === DEFAULT_BANNER_SKIN || (unlocked ?? []).includes(skin);
}

export function pouchPool({ dice = [], banner = [] } = {}) {
  return [
    ...DICE_SKIN_VALUES.filter((skin) => !isDiceSkinUnlocked(skin, dice)).map(
      (skin) => ({ kind: "dice", skin, rarity: diceSkinRarity(skin) }),
    ),
    ...BANNER_SKIN_VALUES.filter(
      (skin) => !isBannerSkinUnlocked(skin, banner),
    ).map((skin) => ({ kind: "banner", skin, rarity: bannerSkinRarity(skin) })),
  ];
}

export function pouchChances(unlocked) {
  const pool = pouchPool(unlocked);
  const sizes = new Map();
  for (const { rarity } of pool) {
    sizes.set(rarity, (sizes.get(rarity) ?? 0) + 1);
  }
  const total = SKIN_RARITIES.filter((rarity) => sizes.has(rarity)).reduce(
    (sum, rarity) => sum + POUCH_ODDS[rarity],
    0,
  );

  return pool.map((reward) => ({
    ...reward,
    chance: POUCH_ODDS[reward.rarity] / total / sizes.get(reward.rarity),
  }));
}

// Filler for the reel; only the database decides the reward.
export function drawPouchSkin(chances, random = Math.random) {
  let roll = random();
  for (const reward of chances) {
    roll -= reward.chance;
    if (roll < 0) return reward;
  }
  return chances.at(-1) ?? null;
}
