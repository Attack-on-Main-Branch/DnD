export const SKIN_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "iconic",
];

const BANNER_SKINS_BY_RARITY = {
  common: ["classic", "splash", "vignette"],
  uncommon: ["cyberpunk", "carbon-fiber", "stillwater"],
  rare: ["shattered-glass", "pixel-night", "black-hole"],
  epic: ["topography", "hexagon", "vortex"],
  legendary: ["spider-lilies", "sakura", "lightning"],
  iconic: ["dragon-lore", "printstream", "wings-of-freedom"],
};

export const BANNER_SKIN_VALUES = SKIN_RARITIES.flatMap(
  (rarity) => BANNER_SKINS_BY_RARITY[rarity],
);
export const DEFAULT_BANNER_SKIN = BANNER_SKIN_VALUES[0];

export function bannerSkinRarity(skin) {
  return (
    SKIN_RARITIES.find((rarity) =>
      BANNER_SKINS_BY_RARITY[rarity].includes(skin),
    ) ?? null
  );
}

export function isBannerSkin(skin) {
  return BANNER_SKIN_VALUES.includes(skin);
}

export function validateBannerSkin(skin) {
  return isBannerSkin(skin)
    ? null
    : { field: "bannerSkin", reason: "invalid_skin" };
}
