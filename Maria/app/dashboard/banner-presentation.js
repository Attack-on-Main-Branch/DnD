import {
  BANNER_SKIN_VALUES,
  DEFAULT_BANNER_SKIN,
  SKIN_RARITIES,
  bannerSkinRarity,
} from "sina/rules/skins";

import { skinRarityLook } from "./skin-rarity";

const BANNER_COPY = {
  hexagon: {
    colorable: true,
    label: "Hexagon",
    description:
      "Hexagonal tiles rise and settle while light in your dice colour travels around their edges, brightening and fading over the familiar dark banner.",
  },
  "wings-of-freedom": {
    label: "Wings of Freedom",
    description:
      "The Scout Regiment's blue and white wings on woven green cloth, billowing in a steady wind.",
    surface: "banner-wings-of-freedom",
  },
  "pixel-night": {
    label: "Pixel Night",
    description:
      "A violet pixel-art sky with lavender clouds, a distant moon and stars that brighten and fade at their own pace.",
    surface: "banner-pixel-night",
  },
  cyberpunk: {
    label: "Cyberpunk",
    description:
      "Angular circuit bands, diagonal cutouts and fine traces in warm gold and ivory over the familiar dark banner.",
    surface: "banner-cyberpunk",
  },
  vignette: {
    colorable: true,
    label: "Vignette",
    description:
      "Your dice colour fades softly inward from the edges of the familiar dark banner.",
  },
  "shattered-glass": {
    label: "Shattered Glass",
    description:
      "The familiar dark banner cast in glass, with raised, splintered edges and light refracting through the shattered impact on the right.",
  },
  topography: {
    label: "Topography",
    description:
      "Golden contour lines bend, swell and merge as the landscape continuously takes new shape.",
  },
  splash: {
    colorable: true,
    label: "Splash",
    description:
      "A bold splash of your dice colour across the familiar dark banner.",
    surface: "banner-splash",
  },
  lightning: {
    label: "Lightning",
    description:
      "Pale-blue lightning branches from right to left through rolling storm clouds and silver rain.",
  },
  sakura: {
    label: "Sakura",
    description:
      "Sunlit cherry blossoms on ivory, with branches swaying in a spring breeze and petals drifting softly past.",
    surface: "banner-sakura",
  },
  "spider-lilies": {
    label: "Spider Lilies",
    description:
      "Scarlet spider lilies against black, with curled ribbon petals and delicate stamens swaying in the wind.",
  },
  classic: {
    label: "Classic",
    description: "The familiar dark frame and gold trim.",
  },
  "dragon-lore": {
    label: "Dragon Lore",
    description:
      "A knotwork dragon with golden light sweeping from upper left to lower right across its scales and ribbon breath.",
  },
  printstream: {
    label: "Printstream",
    description:
      "White lacquer, black printwork and a pearlescent finish in constant motion.",
    surface: "banner-printstream",
  },
};

if (BANNER_SKIN_VALUES.some((value) => !BANNER_COPY[value])) {
  throw new Error("banner-presentation: a banner style has no presentation.");
}

const BANNER_SKINS = BANNER_SKIN_VALUES.map((value) => ({
  value,
  ...BANNER_COPY[value],
  rarity: skinRarityLook(bannerSkinRarity(value)),
}));
const BANNER_BY_VALUE = new Map(BANNER_SKINS.map((skin) => [skin.value, skin]));

export const BANNER_SKIN_GROUPS = SKIN_RARITIES.map((value) => ({
  value,
  rarity: skinRarityLook(value),
  skins: BANNER_SKINS.filter(
    (option) => bannerSkinRarity(option.value) === value,
  ),
}));

export function bannerSkinDetails(value) {
  return BANNER_BY_VALUE.get(value) ?? BANNER_BY_VALUE.get(DEFAULT_BANNER_SKIN);
}

export function bannerSurfaceClass(value) {
  const { value: skin, surface } = bannerSkinDetails(value);
  if (skin === DEFAULT_BANNER_SKIN) return "";
  return surface ? `banner-surface ${surface}` : "banner-surface";
}
