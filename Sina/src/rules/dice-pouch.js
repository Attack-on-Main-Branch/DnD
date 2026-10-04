/**
 * Which dice sets a character has found, and what a Dice Pouch can still hold
 * for them.
 *
 * The draw itself is the database's — `open_dice_pouch` in
 * 20261004230000_dice_pouches.sql — and the odds here mirror it, so the reel a
 * player watches is filled the way a real pouch would be.
 */

import {
  DEFAULT_DICE_SKIN,
  DICE_SKIN_RARITIES,
  DICE_SKIN_VALUES,
  diceSkinRarity,
} from "./character.js";

/** The stack a pouch is carried as. Mirrors `guard_dice_pouch`. */
export const DICE_POUCH_SLUG = "dice-pouch";

/**
 * Out of 100, for a rarity that still has a set left to give. Mirrors the odds
 * in `open_dice_pouch`.
 */
export const DICE_POUCH_ODDS = {
  common: 60,
  rare: 25,
  epic: 11,
  legendary: 4,
};

/** What every character starts with. Never stored. */
export const STARTER_DICE_SKINS = [DEFAULT_DICE_SKIN];

export function isDicePouch(slug) {
  return slug === DICE_POUCH_SLUG;
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

/** What a pouch could still hold for somebody who has these. */
export function dicePouchPool(unlocked) {
  return DICE_SKIN_VALUES.filter((skin) => !isDiceSkinUnlocked(skin, unlocked));
}

/**
 * Each set's chance of being the one, drawn as the database draws: a rarity by
 * its odds among those with something left, then a set within it evenly.
 * Empty once there is nothing left to find.
 */
export function dicePouchChances(unlocked) {
  const pool = dicePouchPool(unlocked);
  const sizes = new Map();

  for (const skin of pool) {
    const rarity = diceSkinRarity(skin);
    sizes.set(rarity, (sizes.get(rarity) ?? 0) + 1);
  }

  const total = DICE_SKIN_RARITIES.filter((rarity) => sizes.has(rarity)).reduce(
    (sum, rarity) => sum + DICE_POUCH_ODDS[rarity],
    0,
  );

  return pool.map((skin) => {
    const rarity = diceSkinRarity(skin);

    return {
      skin,
      chance: DICE_POUCH_ODDS[rarity] / total / sizes.get(rarity),
    };
  });
}

/** One set at those odds. Filler for the reel — never the result. */
export function drawDiceSkin(chances, random = Math.random) {
  let roll = random();

  for (const { skin, chance } of chances) {
    roll -= chance;

    if (roll < 0) {
      return skin;
    }
  }

  return chances.at(-1)?.skin ?? null;
}
